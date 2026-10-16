import asyncio
import json
import os

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError
from sqlmodel import Session

from app.account.service import get_current_user
from app.logic.multiplayer import schemas
from app.logic.multiplayer.models import BattleError, Identity
from app.logic.multiplayer.rules import configuration
from app.logic.multiplayer.service import MultiplayerService
from database.database import get_session

router = APIRouter(prefix="/multiplayer", tags=["Multiplayer"])


def get_service(request: Request) -> MultiplayerService:
    return request.app.state.multiplayer


def identity(user) -> Identity:
    return Identity(user.id, user.username, user.display_name)


async def invoke(awaitable):
    try:
        return await awaitable
    except BattleError as error:
        raise HTTPException(error.status_code, error.detail) from error


@router.get("/config")
def config():
    return configuration()


@router.post("/rooms", response_model=schemas.RoomState, status_code=201)
async def create(body: schemas.CreateRoom, user=Depends(get_current_user),
                 session: Session = Depends(get_session),
                 service: MultiplayerService = Depends(get_service)):
    return await invoke(service.create(identity(user), body.topic_id, session))


@router.post("/rooms/{code}/join", response_model=schemas.RoomState)
async def join(code: str, user=Depends(get_current_user),
               service: MultiplayerService = Depends(get_service)):
    return await invoke(service.join(code, identity(user)))


@router.get("/rooms/{code}", response_model=schemas.RoomState)
async def state(code: str, user=Depends(get_current_user),
                service: MultiplayerService = Depends(get_service)):
    return await invoke(service.operate(code, user.id))


@router.post("/rooms/{code}/character", response_model=schemas.RoomState)
async def character(code: str, body: schemas.SelectCharacter,
                    user=Depends(get_current_user), session: Session = Depends(get_session),
                    service: MultiplayerService = Depends(get_service)):
    return await invoke(service.operate(code, user.id, "character", session=session, **body.model_dump()))


@router.post("/rooms/{code}/ready", response_model=schemas.RoomState)
async def ready(code: str, body: schemas.SetReady,
                user=Depends(get_current_user), session: Session = Depends(get_session),
                service: MultiplayerService = Depends(get_service)):
    return await invoke(service.operate(code, user.id, "ready", session=session, **body.model_dump()))


@router.post("/rooms/{code}/actions", response_model=schemas.RoomState)
async def action(code: str, body: schemas.SelectAction, user=Depends(get_current_user),
                 service: MultiplayerService = Depends(get_service)):
    return await invoke(service.operate(code, user.id, "action", **body.model_dump()))


@router.post("/rooms/{code}/answers", response_model=schemas.RoomState)
async def answer(code: str, body: schemas.SubmitAnswer, user=Depends(get_current_user),
                 service: MultiplayerService = Depends(get_service)):
    return await invoke(service.operate(code, user.id, "answer", **body.model_dump()))


@router.post("/rooms/{code}/rematch", response_model=schemas.RoomState)
async def rematch(code: str, user=Depends(get_current_user),
                  service: MultiplayerService = Depends(get_service)):
    return await invoke(service.operate(code, user.id, "rematch"))


@router.post("/rooms/{code}/leave")
async def leave(code: str, user=Depends(get_current_user),
                service: MultiplayerService = Depends(get_service)):
    return await invoke(service.leave(code, user.id))


async def send_updates(websocket: WebSocket, queue: asyncio.Queue):
    while True:
        message = await queue.get()
        await asyncio.wait_for(websocket.send_json(message), timeout=5)
        if (message["type"] == "room_closed"
                or message.get("state", {}).get("status") == "closed"):
            await websocket.close(code=1000)
            return


async def receive_pings(websocket: WebSocket, queue: asyncio.Queue):
    while True:
        raw = await websocket.receive_text()
        if len(raw) > 4096:
            await websocket.close(code=1009)
            return
        try:
            ping = json.loads(raw)
        except ValueError:
            ping = None
        message = ({"type": "pong"} if ping == {"type": "ping"} else
                   {"type": "error", "detail": "Use HTTP endpoints for battle commands; only ping is accepted here"})
        MultiplayerService._enqueue(queue, message)


@router.websocket("/rooms/{code}/ws")
async def updates(websocket: WebSocket, code: str, session: Session = Depends(get_session)):
    origin = websocket.headers.get("origin")
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if origin and origin not in origins and "*" not in origins:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    service: MultiplayerService = websocket.app.state.multiplayer
    queue = None
    tasks = []
    user_id = None
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=5)
        if len(raw) > 4096:
            await websocket.close(code=1009)
            return
        authentication = schemas.SocketAuthentication.model_validate_json(raw)
        try:
            user = get_current_user(HTTPAuthorizationCredentials(
                scheme="Bearer", credentials=authentication.token), session)
            user_id = user.id
        finally:
            session.close()
        queue = await service.subscribe(code, user_id)
        tasks = [asyncio.create_task(send_updates(websocket, queue)),
                 asyncio.create_task(receive_pings(websocket, queue))]
        await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    except (ValidationError, ValueError, asyncio.TimeoutError):
        await websocket.close(code=4401, reason="Authentication required")
    except HTTPException:
        await websocket.close(code=4401, reason="Invalid or expired token")
    except BattleError as error:
        await websocket.close(code=4403 if error.status_code == 403 else 4404,
                              reason=error.detail)
    except WebSocketDisconnect:
        pass
    finally:
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        if queue is not None:
            await service.unsubscribe(code, user_id, queue)
