from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session
from app.account.service import get_current_user
from app.learning import attempts, questions, service
from app.types.learning import Lesson
from database.database import get_session

router = APIRouter(prefix="/learning", tags=["Learning"])


class AnswerBody(BaseModel):
    question_id: int
    selected_option_id: int
    submission_id: str = Field(default_factory=lambda: str(uuid4()), min_length=8, max_length=100)


@router.get("/subjects")
def subjects(session: Session = Depends(get_session)):
    return service.subjects(session)


@router.get("/subjects/{subject_id}/topics")
def topics(subject_id: int, session: Session = Depends(get_session)):
    return service.topics(session, subject_id)


@router.get("/topics/{topic_id}/lessons")
def lessons(topic_id: int, session: Session = Depends(get_session)):
    return [{"id": l.id, "topic_id": l.topic_id, "title": l.title,
             "lesson_order": l.lesson_order, "exp_reward": l.exp_reward}
            for l in service.lessons(session, topic_id)]


@router.get("/lessons/{lesson_id}")
def lesson(lesson_id: int, session: Session = Depends(get_session)):
    lesson = session.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return lesson


@router.post("/lessons/{lesson_id}/complete")
def complete(lesson_id: int, user=Depends(get_current_user),
             session: Session = Depends(get_session)):
    return service.complete_lesson(session, user.id, lesson_id)


@router.get("/topics/{topic_id}/questions")
def topic_questions(topic_id: int, limit: int = Query(20, ge=1, le=100),
                    session: Session = Depends(get_session)):
    return questions.topic_questions(session, topic_id, limit)


@router.post("/attempts")
def submit(body: AnswerBody, user=Depends(get_current_user),
           session: Session = Depends(get_session)):
    return attempts.submit_practice(session, user.id, **body.model_dump())
