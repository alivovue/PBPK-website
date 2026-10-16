from fastapi import HTTPException
from sqlmodel import Session, select
from app.player.service import grant_exp, record_activity
from app.types.learning import Lesson, LessonCompletion, Subject, Topic


def subjects(session: Session):
    return list(session.exec(select(Subject).order_by(Subject.name)).all())


def topics(session: Session, subject_id: int):
    if session.get(Subject, subject_id) is None:
        raise HTTPException(404, "Subject not found")
    return list(session.exec(select(Topic).where(
        Topic.subject_id == subject_id).order_by(Topic.grade_level, Topic.id)).all())


def lessons(session: Session, topic_id: int):
    if session.get(Topic, topic_id) is None:
        raise HTTPException(404, "Topic not found")
    return list(session.exec(select(Lesson).where(
        Lesson.topic_id == topic_id).order_by(Lesson.lesson_order)).all())


def complete_lesson(session: Session, user_id: int, lesson_id: int):
    lesson = session.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(404, "Lesson not found")
    if session.get(LessonCompletion, (user_id, lesson_id)):
        return {"already_completed": True, "exp_gained": 0}
    session.add(LessonCompletion(user_id=user_id, lesson_id=lesson_id))
    progress = grant_exp(session, user_id, lesson.exp_reward)
    record_activity(session, user_id)
    session.commit()
    return {"already_completed": False, **progress}
