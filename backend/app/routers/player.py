from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.account.service import get_current_user
from app.player.service import snapshot
from database.database import get_session

router = APIRouter(prefix="/player", tags=["Player"])


@router.get("/me")
def me(user=Depends(get_current_user), session: Session = Depends(get_session)):
    return snapshot(session, user.id)
