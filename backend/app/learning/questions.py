from fastapi import HTTPException
from sqlmodel import Session, select
from app.types.question import Question, QuestionOption


def public_question(session: Session, question: Question) -> dict:
    # Never send is_correct before grading.
    options = session.exec(select(QuestionOption).where(
        QuestionOption.question_id == question.id).order_by(
        QuestionOption.option_order)).all()
    return {"id": question.id, "topic_id": question.topic_id,
            "question_text": question.question_text,
            "question_type": question.question_type, "difficulty": question.difficulty,
            "options": [{"id": o.id, "text": o.option_text} for o in options]}


def topic_questions(session: Session, topic_id: int, limit: int = 20) -> list[dict]:
    questions = session.exec(select(Question).where(
        Question.topic_id == topic_id).order_by(Question.id).limit(limit)).all()
    return [public_question(session, q) for q in questions]


def correct_option_id(session: Session, question_id: int) -> int:
    option = session.exec(select(QuestionOption).where(
        QuestionOption.question_id == question_id,
        QuestionOption.is_correct == True)).first()  # noqa: E712
    if option is None:
        raise HTTPException(500, "Question has no correct option")
    return option.id
