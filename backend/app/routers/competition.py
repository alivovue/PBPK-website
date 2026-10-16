from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session
from app.account.service import get_current_user
from app.competition import service
from database.database import get_session

router = APIRouter(prefix="/competitions", tags=["Competitions"])


class Answer(BaseModel):
    question_id: int
    selected_option_id: int


class Submission(BaseModel):
    answers: list[Answer]


@router.get("")
def competitions(session: Session = Depends(get_session)):
    return service.list_competitions(session)


@router.post("/{competition_id}/join")
def join(competition_id: int, user=Depends(get_current_user),
         session: Session = Depends(get_session)):
    return service.join(session, user.id, competition_id)


@router.get("/{competition_id}/questions")
def questions(competition_id: int, user=Depends(get_current_user),
              session: Session = Depends(get_session)):
    return service.questions(session, user.id, competition_id)


@router.post("/{competition_id}/submit")
def submit(competition_id: int, body: Submission, user=Depends(get_current_user),
           session: Session = Depends(get_session)):
    return service.submit(session, user.id, competition_id,
                          [a.model_dump() for a in body.answers])


@router.get("/{competition_id}/leaderboard")
def leaderboard(competition_id: int, limit: int = Query(20, ge=1, le=100),
                session: Session = Depends(get_session)):
    return service.leaderboard(session, competition_id, limit)
