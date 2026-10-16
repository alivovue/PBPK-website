from fastapi import APIRouter, Depends, Query, Request, Response
from sqlmodel import Session

from app.account.service import get_current_user
from app.system_ai import service
from app.system_ai.schemas import ConversationBody, MessageBody
from database.database import get_session

router = APIRouter(prefix="/system-ai", tags=["System AI"])


def get_ai(request: Request) -> service.SystemAIService:
    return request.app.state.system_ai


@router.get("/status")
async def status(ai=Depends(get_ai)):
    return await ai.status()


@router.get("/conversations")
def conversations(limit: int = Query(50, ge=1, le=100), user=Depends(get_current_user),
                  session: Session = Depends(get_session)):
    return service.list_conversations(session, user.id, limit)


@router.post("/conversations", status_code=201)
def create(body: ConversationBody, user=Depends(get_current_user),
           session: Session = Depends(get_session)):
    return service.create_conversation(session, user.id, body)


@router.get("/conversations/{conversation_id}")
def detail(conversation_id: str, limit: int = Query(100, ge=1, le=200),
           user=Depends(get_current_user), session: Session = Depends(get_session)):
    return service.conversation_detail(session, user.id, conversation_id, limit)


@router.post("/conversations/{conversation_id}/messages")
async def message(conversation_id: str, body: MessageBody, user=Depends(get_current_user),
                  session: Session = Depends(get_session), ai=Depends(get_ai)):
    return await ai.send(session, user.id, conversation_id, body.message)


@router.delete("/conversations/{conversation_id}", status_code=204)
async def remove(conversation_id: str, user=Depends(get_current_user),
                 session: Session = Depends(get_session), ai=Depends(get_ai)):
    await ai.remove(session, user.id, conversation_id)
    return Response(status_code=204)
