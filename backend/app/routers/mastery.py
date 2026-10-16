from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.account.service import get_current_user
from app.mastery import knowledge_graph, service
from database.database import get_session

router = APIRouter(prefix="/mastery", tags=["Mastery"])


@router.get("/me")
def mine(user=Depends(get_current_user), session: Session = Depends(get_session)):
    return service.list_mastery(session, user.id)


@router.get("/recommendations")
def recommendations(limit: int = Query(10, ge=1, le=50),
                    user=Depends(get_current_user), session: Session = Depends(get_session)):
    return knowledge_graph.recommendations(session, user.id, limit)


@router.get("/topics/{topic_id}/prerequisites")
def prerequisites(topic_id: int, session: Session = Depends(get_session)):
    return knowledge_graph.prerequisites(session, topic_id)
