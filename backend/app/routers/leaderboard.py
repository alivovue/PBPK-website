from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.leaderboard.service import global_board
from database.database import get_session

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


@router.get("/global")
def global_leaderboard(limit: int = Query(20, ge=1, le=100),
                       offset: int = Query(0, ge=0), session: Session = Depends(get_session)):
    return global_board(session, limit, offset)
