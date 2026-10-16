from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session
from app.account.service import get_current_user
from app.heart_demon.service import list_demons
from app.learning.attempts import submit_practice
from app.types.progression import HeartDemon
from database.database import get_session

router = APIRouter(prefix="/heart-demons", tags=["Heart Demons"])


class BattleAnswer(BaseModel):
    question_id: int
    selected_option_id: int
    submission_id: str = Field(default_factory=lambda: str(uuid4()), min_length=8)


@router.get("")
def mine(user=Depends(get_current_user), session: Session = Depends(get_session)):
    return list_demons(session, user.id)


@router.post("/{demon_id}/battle")
def battle(demon_id: int, body: BattleAnswer, user=Depends(get_current_user),
           session: Session = Depends(get_session)):
    demon = session.get(HeartDemon, demon_id)
    if not demon or demon.user_id != user.id:
        raise HTTPException(404, "Heart Demon not found")
    if demon.status != "active":
        raise HTTPException(409, "Heart Demon already defeated")
    return submit_practice(session, user.id, body.question_id,
                           body.selected_option_id, body.submission_id,
                           expected_topic_id=demon.topic_id)
