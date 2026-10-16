import json
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlmodel import Session, select

from app.learning.questions import public_question
from app.player.service import profile_for
from app.progression.rewards import grant_currency
from app.types.competition import Competition, CompetitionEntry, CompetitionQuestion
from app.types.competition_result import CompetitionResult
from app.types.progression import Rank
from app.types.question import Question, QuestionOption
from app.types.user import User


def utc(dt):
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def competition(session, competition_id):
    item = session.get(Competition, competition_id)
    if item is None:
        raise HTTPException(404, "Competition not found")
    return item


def in_progress(item):
    now = datetime.now(timezone.utc)
    if not (utc(item.starts_at) <= now < utc(item.ends_at)):
        raise HTTPException(403, "Competition is not currently open")


def list_competitions(session: Session):
    return list(session.exec(select(Competition).order_by(Competition.starts_at.desc())).all())


def get_entry(session, user_id, competition_id):
    return session.exec(select(CompetitionEntry).where(
        CompetitionEntry.user_id == user_id,
        CompetitionEntry.competition_id == competition_id)).first()


def join(session: Session, user_id: int, competition_id: int):
    item = competition(session, competition_id)
    in_progress(item)
    rank = session.get(Rank, profile_for(session, user_id).rank_id)
    minimum = session.get(Rank, item.minimum_rank_id)
    if not rank or not minimum or rank.rank_order < minimum.rank_order:
        raise HTTPException(403, "Rank too low to join")
    entry = get_entry(session, user_id, competition_id)
    if entry is None:
        entry = CompetitionEntry(user_id=user_id, competition_id=competition_id)
        session.add(entry)
        session.commit()
        session.refresh(entry)
    return {"entry_id": entry.id, "competition_id": competition_id}


def questions(session: Session, user_id: int, competition_id: int):
    item = competition(session, competition_id)
    in_progress(item)
    if not get_entry(session, user_id, competition_id):
        raise HTTPException(403, "Join the competition first")
    edges = session.exec(select(CompetitionQuestion).where(
        CompetitionQuestion.competition_id == competition_id)).all()
    return [public_question(session, session.get(Question, e.question_id)) for e in edges]


def submit(session: Session, user_id: int, competition_id: int, answers: list[dict]):
    item = competition(session, competition_id)
    in_progress(item)
    entry = get_entry(session, user_id, competition_id)
    if not entry:
        raise HTTPException(403, "Join the competition first")
    if session.get(CompetitionResult, entry.id):
        raise HTTPException(409, "Competition already submitted")
    links = session.exec(select(CompetitionQuestion).where(
        CompetitionQuestion.competition_id == competition_id)).all()
    expected = {e.question_id for e in links}
    submitted = {a["question_id"]: a["selected_option_id"] for a in answers}
    if not expected or len(submitted) != len(answers) or set(submitted) != expected:
        raise HTTPException(400, "Submit exactly one answer per competition question")
    correct = 0
    for question_id, option_id in submitted.items():
        option = session.get(QuestionOption, option_id)
        if option is None or option.question_id != question_id:
            raise HTTPException(400, "Invalid answer option")
        correct += int(bool(option.is_correct))
    entry.score = correct / len(expected)
    reward = int(item.reward_currency * entry.score)
    awarded = grant_currency(session, user_id, reward,
                             f"Competition {competition_id}", f"competition:{entry.id}")
    entry.currency_awarded = awarded
    session.add(entry)
    session.add(CompetitionResult(entry_id=entry.id,
                answers_json=json.dumps(submitted)))
    session.commit()
    return {"score": entry.score, "currency_awarded": awarded}


def leaderboard(session: Session, competition_id: int, limit: int = 20):
    competition(session, competition_id)
    rows = session.exec(select(CompetitionEntry, User).join(
        User, User.id == CompetitionEntry.user_id).join(
        CompetitionResult, CompetitionResult.entry_id == CompetitionEntry.id).where(
        CompetitionEntry.competition_id == competition_id).order_by(
        CompetitionEntry.score.desc(), CompetitionEntry.id).limit(limit)).all()
    return [{"position": i, "username": user.username, "score": entry.score}
            for i, (entry, user) in enumerate(rows, 1)]
