from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session
from app.account.service import get_current_user
from app.exam import service
from database.database import get_session

router = APIRouter(prefix="/exams", tags=["Exams"])


class ExamAnswer(BaseModel):
    question_id: int
    selected_option_id: int


class ExamSubmission(BaseModel):
    answers: list[ExamAnswer]


@router.get("")
def exams(session: Session = Depends(get_session)):
    return service.available_exams(session)


@router.post("/{exam_id}/start")
def start(exam_id: int, user=Depends(get_current_user),
          session: Session = Depends(get_session)):
    return service.start_exam(session, user.id, exam_id)


@router.post("/attempts/{attempt_id}/submit")
def submit(attempt_id: int, body: ExamSubmission, user=Depends(get_current_user),
           session: Session = Depends(get_session)):
    return service.submit_exam(session, user.id, attempt_id,
                               [a.model_dump() for a in body.answers])
