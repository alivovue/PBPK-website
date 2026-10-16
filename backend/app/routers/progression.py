from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.progression.service import list_ranks
from database.database import get_session

router = APIRouter(prefix="/progression", tags=["Progression"])


@router.get("/ranks")
def ranks(session: Session = Depends(get_session)):
    return list_ranks(session)
