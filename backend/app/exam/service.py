from datetime import datetime, timezone
from uuid import uuid4
from fastapi import HTTPException
from sqlmodel import Session, select

from app.learning.questions import public_question
from app.progression.service import promote, require_promotion_eligibility
from app.types.exam import Exam, ExamAttempt, ExamQuestion
from app.types.question import Question, QuestionAttempt, QuestionOption


def utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def available_exams(session: Session):
    return list(session.exec(select(Exam).order_by(Exam.id)).all())


def exam_questions(session: Session, exam_id: int):
    links = session.exec(select(ExamQuestion).where(
        ExamQuestion.exam_id == exam_id).order_by(ExamQuestion.question_order)).all()
    return [session.get(Question, link.question_id) for link in links]


def start_exam(session: Session, user_id: int, exam_id: int):
    exam = session.get(Exam, exam_id)
    if not exam:
        raise HTTPException(404, "Exam not found")
    require_promotion_eligibility(session, user_id,
                                  exam.required_rank_id, exam.target_rank_id)
    questions = exam_questions(session, exam_id)
    if not questions or any(q is None for q in questions):
        raise HTTPException(400, "Exam has no valid questions")
    active = session.exec(select(ExamAttempt).where(
        ExamAttempt.user_id == user_id,
        ExamAttempt.exam_id == exam_id,
        ExamAttempt.completed_at.is_(None)).order_by(ExamAttempt.id.desc())).first()
    now = datetime.now(timezone.utc)
    if active and (now - utc(active.started_at)).total_seconds() > exam.time_limit_seconds:
        active.completed_at = now
        active.passed = False
        session.add(active)
        active = None
    if active is None:
        active = ExamAttempt(user_id=user_id, exam_id=exam_id)
        session.add(active)
    session.commit()
    session.refresh(active)
    return {"attempt_id": active.id, "time_limit_seconds": exam.time_limit_seconds,
            "questions": [public_question(session, q) for q in questions]}


def submit_exam(session: Session, user_id: int, attempt_id: int,
                answers: list[dict]):
    attempt = session.get(ExamAttempt, attempt_id)
    if not attempt or attempt.user_id != user_id:
        raise HTTPException(404, "Exam attempt not found")
    if attempt.completed_at:
        raise HTTPException(409, "Exam already submitted")
    exam = session.get(Exam, attempt.exam_id)
    now = datetime.now(timezone.utc)
    if (now - utc(attempt.started_at)).total_seconds() > exam.time_limit_seconds:
        attempt.completed_at = now
        attempt.passed = False
        session.commit()
        raise HTTPException(400, "Exam time limit exceeded")
    require_promotion_eligibility(session, user_id,
                                  exam.required_rank_id, exam.target_rank_id)
    questions = exam_questions(session, exam.id)
    expected = {q.id for q in questions}
    submitted = {item["question_id"]: item["selected_option_id"] for item in answers}
    if len(submitted) != len(answers) or set(submitted) != expected:
        raise HTTPException(400, "Submit exactly one answer per exam question")
    correct_count = 0
    for q in questions:
        option = session.get(QuestionOption, submitted[q.id])
        if not option or option.question_id != q.id:
            raise HTTPException(400, "Invalid answer option")
        correct = bool(option.is_correct)
        correct_count += int(correct)
        session.add(QuestionAttempt(submission_id=f"exam:{attempt.id}:{q.id}",
                    user_id=user_id, question_id=q.id, selected_option_id=option.id,
                    is_correct=correct, exp_awarded=0, exam_attempt_id=attempt.id))
    attempt.score = correct_count / len(questions)
    attempt.passed = attempt.score >= exam.passing_score
    attempt.completed_at = now
    if attempt.passed:
        promote(session, user_id, exam.required_rank_id, exam.target_rank_id)
    session.add(attempt)
    session.commit()
    return {"score": attempt.score, "passed": attempt.passed,
            "promoted_to_rank_id": exam.target_rank_id if attempt.passed else None}
