from fastapi import HTTPException
from sqlmodel import Session, select
from app.heart_demon.service import evaluate
from app.mastery.service import update_mastery
from app.player.service import grant_exp, record_activity
from app.types.question import Question, QuestionAttempt, QuestionOption


def submit_practice(session: Session, user_id: int, question_id: int,
                    selected_option_id: int, submission_id: str,
                    expected_topic_id: int | None = None) -> dict:
    existing = session.exec(select(QuestionAttempt).where(
        QuestionAttempt.submission_id == submission_id)).first()
    if existing:
        if (existing.user_id != user_id or existing.question_id != question_id
                or existing.selected_option_id != selected_option_id):
            raise HTTPException(409, "Submission ID already used")
        return {"correct": existing.is_correct, "exp_gained": existing.exp_awarded,
                "replayed": True}

    question = session.get(Question, question_id)
    option = session.get(QuestionOption, selected_option_id)
    if not question or not option or option.question_id != question.id:
        raise HTTPException(400, "Invalid question or option")
    if expected_topic_id is not None and question.topic_id != expected_topic_id:
        raise HTTPException(400, "Question must belong to the demon's topic")
    if question.question_type != "multiple_choice":
        raise HTTPException(400, "Only multiple-choice questions are supported")

    correct = bool(option.is_correct)
    was_correct_before = session.exec(select(QuestionAttempt.id).where(
        QuestionAttempt.user_id == user_id,
        QuestionAttempt.question_id == question_id,
        QuestionAttempt.is_correct == True,
        QuestionAttempt.exam_attempt_id.is_(None))).first() is not None
    exp = question.exp_reward if correct and not was_correct_before else 0
    session.add(QuestionAttempt(submission_id=submission_id, user_id=user_id,
                question_id=question_id, selected_option_id=selected_option_id,
                is_correct=correct, exp_awarded=exp))
    mastery = update_mastery(session, user_id, question.topic_id, correct)
    demon = evaluate(session, mastery)
    record_activity(session, user_id)
    progress = grant_exp(session, user_id, exp)
    session.commit()
    return {"correct": correct, "correct_option_id": next_correct(session, question_id),
            "explanation": question.explanation, "mastery_score": mastery.mastery_score,
            "heart_demon": demon, "replayed": False, **progress}


def next_correct(session: Session, question_id: int) -> int:
    from app.learning.questions import correct_option_id
    return correct_option_id(session, question_id)
