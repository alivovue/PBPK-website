"""Account-scoped AI conversations and the managed local chatbot runtime."""

import asyncio
import importlib.util
import logging
import os
import shutil
import sys
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from time import monotonic
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import delete
from sqlmodel import Session, select

from app.system_ai.models import AIConversation, AIMessage
from app.system_ai.schemas import ChatReply, ConversationBody
from app.types.learning import Lesson, Topic

logger = logging.getLogger(__name__)
CHATBOT_DIR = Path(__file__).resolve().parents[2] / "chatbot"


def enabled(name: str, default: bool = True) -> bool:
    return os.getenv(name, "1" if default else "0").lower() in {"1", "true", "yes"}


def owned_conversation(session: Session, user_id: int, conversation_id: str) -> AIConversation:
    conversation = session.get(AIConversation, conversation_id)
    if conversation is None or conversation.user_id != user_id:
        raise HTTPException(404, "Percakapan tidak ditemukan.")
    return conversation


def list_conversations(session: Session, user_id: int, limit: int = 50):
    return session.exec(select(AIConversation).where(AIConversation.user_id == user_id)
                        .order_by(AIConversation.updated_at.desc()).limit(limit)).all()


def create_conversation(session: Session, user_id: int, body: ConversationBody):
    topic_id = body.topic_id
    title = "Percakapan baru"
    if body.lesson_id is not None:
        lesson = session.get(Lesson, body.lesson_id)
        if lesson is None:
            raise HTTPException(404, "Pelajaran tidak ditemukan.")
        if topic_id is not None and topic_id != lesson.topic_id:
            raise HTTPException(422, "Pelajaran tidak termasuk topik yang dipilih.")
        topic_id, title = lesson.topic_id, lesson.title
    elif topic_id is not None:
        topic = session.get(Topic, topic_id)
        if topic is None:
            raise HTTPException(404, "Topik tidak ditemukan.")
        title = topic.name
    conversation = AIConversation(user_id=user_id, title=title[:120],
                                  topic_id=topic_id, lesson_id=body.lesson_id)
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


def conversation_detail(session: Session, user_id: int, conversation_id: str, limit: int = 100):
    conversation = owned_conversation(session, user_id, conversation_id)
    rows = session.exec(select(AIMessage).where(AIMessage.conversation_id == conversation_id)
                        .order_by(AIMessage.id.desc()).limit(limit + 1)).all()
    return {"conversation": conversation, "messages": list(reversed(rows[:limit])),
            "has_older_messages": len(rows) > limit}


def delete_conversation(session: Session, user_id: int, conversation_id: str):
    conversation = owned_conversation(session, user_id, conversation_id)
    session.exec(delete(AIMessage).where(AIMessage.conversation_id == conversation_id))
    session.delete(conversation)
    session.commit()


def lesson_documents(session: Session, conversation: AIConversation) -> list[dict] | None:
    """Only server-read lesson content may become context for retrieval."""
    if conversation.lesson_id is not None:
        lessons = [session.get(Lesson, conversation.lesson_id)]
    elif conversation.topic_id is not None:
        lessons = session.exec(select(Lesson).where(Lesson.topic_id == conversation.topic_id)
                               .order_by(Lesson.lesson_order, Lesson.id).limit(12)).all()
    else:
        return None  # General conversations use the supplied PDF corpus.
    documents = []
    for lesson in lessons:
        if lesson is None:
            continue
        content = lesson.content.strip()
        # Overlapping passages preserve context at chunk boundaries, within a bounded request.
        for offset in range(0, len(content), 1200):
            documents.append({"text": content[offset:offset + 1600], "title": lesson.title[:300],
                              "lesson_id": lesson.id, "topic_id": lesson.topic_id})
            if len(documents) == 32:
                return documents
    return documents


class SystemAIService:
    def __init__(self, client: httpx.AsyncClient | None = None):
        self.url = os.getenv("AI_CHATBOT_URL", "http://127.0.0.1:3001").rstrip("/")
        self.client = client or httpx.AsyncClient(
            timeout=float(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "30")), trust_env=False)
        self._owns_client = client is None
        self._processes = []
        self._locks = {}
        self._requests = {}
        self._capacity = asyncio.Semaphore(2)

    async def start(self):
        if not enabled("AI_AUTOSTART", not bool(os.getenv("AI_CHATBOT_URL"))):
            return
        node = os.getenv("AI_NODE_BINARY") or shutil.which("node")
        if not node:
            logger.warning("AURI needs Node.js 22.12+; set AI_NODE_BINARY or AI_CHATBOT_URL.")
            return
        try:
            version = await asyncio.create_subprocess_exec(node, "--version", stdout=asyncio.subprocess.PIPE)
            output, _ = await asyncio.wait_for(version.communicate(), timeout=5)
            release = tuple(int(part) for part in output.decode().strip().lstrip("v").split("."))
            if version.returncode or release < (22, 12, 0):
                logger.warning("AURI needs Node.js 22.12+; set AI_NODE_BINARY to a supported executable.")
                return
            environment = {**os.environ, "CHATBOT_PORT": str(urlparse(self.url).port or 3001),
                           "CHATBOT_HOST": "127.0.0.1"}
            self._processes.append(await asyncio.create_subprocess_exec(
                node, str(CHATBOT_DIR / "server.js"), cwd=CHATBOT_DIR, env=environment))
            if enabled("AI_SEMANTIC_AUTOSTART", not bool(os.getenv("AI_SEMANTIC_URL"))):
                python = os.getenv("AI_PYTHON_BINARY", sys.executable)
                if python == sys.executable and any(importlib.util.find_spec(package) is None
                                                     for package in ("torch", "transformers", "numpy")):
                    logger.warning("Install chatbot/requirements-indobert.txt to enable AURI material retrieval.")
                else:
                    self._processes.append(await asyncio.create_subprocess_exec(
                        python, str(CHATBOT_DIR / "indobert_service.py"), cwd=CHATBOT_DIR,
                        env={**os.environ, "PYTHONUNBUFFERED": "1"}))
        except (OSError, ValueError, asyncio.TimeoutError):
            logger.exception("AURI runtime could not start; the rest of the website remains available.")

    async def stop(self):
        for process in reversed(self._processes):
            if process.returncode is None:
                try:
                    process.terminate()
                    await asyncio.wait_for(process.wait(), timeout=5)
                except ProcessLookupError:
                    pass
                except asyncio.TimeoutError:
                    process.kill()
                    await process.wait()
        if self._owns_client:
            await self.client.aclose()

    async def status(self):
        try:
            response = await self.client.get(f"{self.url}/api/status", timeout=2)
            response.raise_for_status()
            data = response.json()
            ready = data.get("ready") is True
            return {"available": True, "ready": ready, "model": data.get("retrievalModel"),
                    "message": "AURI siap membantu." if ready else
                    "Pencarian materi AURI belum siap. Model mungkin masih dimuat; percakapan ringan tetap tersedia."}
        except (httpx.HTTPError, ValueError, AttributeError):
            return {"available": False, "ready": False, "model": None,
                    "message": "AURI belum tersedia. Periksa layanan chatbot lalu coba lagi."}

    def _rate_limit(self, user_id: int):
        now = monotonic()
        for key in list(self._requests):
            recent = self._requests[key]
            while recent and recent[0] <= now - 60:
                recent.popleft()
            if not recent:
                del self._requests[key]
        recent = self._requests.setdefault(user_id, deque())
        if len(recent) >= 30:
            raise HTTPException(429, "Beri AURI jeda sebentar sebelum bertanya lagi.", headers={"Retry-After": "60"})
        recent.append(now)

    @asynccontextmanager
    async def _conversation_lock(self, conversation_id):
        entry = self._locks.setdefault(conversation_id, [asyncio.Lock(), 0])
        entry[1] += 1
        try:
            async with entry[0]:
                yield
        finally:
            entry[1] -= 1
            if entry[1] == 0:
                del self._locks[conversation_id]

    async def remove(self, session: Session, user_id: int, conversation_id: str):
        async with self._conversation_lock(conversation_id):
            delete_conversation(session, user_id, conversation_id)

    async def send(self, session: Session, user_id: int, conversation_id: str, message: str):
        owned_conversation(session, user_id, conversation_id)
        self._rate_limit(user_id)
        session.rollback()
        async with self._conversation_lock(conversation_id), self._capacity:
            conversation = owned_conversation(session, user_id, conversation_id)
            previous = session.exec(select(AIMessage).where(AIMessage.conversation_id == conversation_id)
                                    .order_by(AIMessage.id.desc()).limit(12)).all()
            payload = {"message": message, "history": [
                {"role": "model" if turn.role == "assistant" else "user", "text": turn.text[:4000],
                 "hasSources": bool(turn.sources)} for turn in reversed(previous)]}
            documents = lesson_documents(session, conversation)
            if documents is not None:
                payload["documents"] = documents
            # End the read transaction before waiting on model inference.
            session.rollback()
            try:
                response = await self.client.post(f"{self.url}/api/chat", json=payload)
                if response.status_code == 429:
                    raise HTTPException(429, "Beri AURI jeda sebentar sebelum bertanya lagi.")
                response.raise_for_status()
                reply = ChatReply.model_validate(response.json())
            except httpx.TimeoutException:
                raise HTTPException(504, "AURI membutuhkan waktu lebih lama. Silakan coba lagi.") from None
            except (httpx.HTTPError, ValueError, ValidationError):
                raise HTTPException(503, "Pencarian materi AURI belum tersedia. Tunggu model siap lalu coba lagi.") from None
            conversation = owned_conversation(session, user_id, conversation_id)
            if not previous and conversation.title == "Percakapan baru":
                conversation.title = message[:120]
            conversation.updated_at = datetime.now(timezone.utc)
            session.add(conversation)
            session.add(AIMessage(conversation_id=conversation_id, role="user", text=message))
            session.add(AIMessage(conversation_id=conversation_id, role="assistant", text=reply.reply,
                                  sources=[source.model_dump(exclude_none=True) for source in reply.sources],
                                  retrieval=reply.retrieval, generator=reply.generator,
                                  confidence=reply.confidence))
            session.commit()
            return conversation_detail(session, user_id, conversation_id)
