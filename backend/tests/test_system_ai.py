import asyncio
import json
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import patch

import httpx
import jwt
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlmodel import Session, create_engine, select

from app.routers import system_ai
from app.system_ai.models import AIConversation, AIMessage
from app.system_ai.service import SystemAIService
from app.types.learning import Lesson, Subject, Topic
from app.types.user import User
from database import database


class SystemAITests(TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.engine = create_engine(f"sqlite:///{Path(directory.name) / 'ai.db'}",
                                    connect_args={"check_same_thread": False})
        self.addCleanup(self.engine.dispose)
        event.listen(self.engine, "connect", database.enable_foreign_keys)
        engine_patch = patch.object(database, "engine", self.engine)
        engine_patch.start()
        self.addCleanup(engine_patch.stop)
        secret_patch = patch.dict(os.environ, {"JWT_SECRET_KEY": "ai-tests-secret-key-at-least-32-bytes"})
        secret_patch.start()
        self.addCleanup(secret_patch.stop)
        database.init_db()
        with Session(self.engine) as session:
            alice, bob = User(username="alice"), User(username="bob")
            subject = Subject(name="Database")
            session.add_all([alice, bob, subject])
            session.flush()
            topic = Topic(subject_id=subject.id, name="Index")
            other = Topic(subject_id=subject.id, name="Empty topic")
            session.add_all([topic, other])
            session.flush()
            lesson = Lesson(topic_id=topic.id, title="Database index", content="An index finds records by search key.")
            session.add(lesson)
            session.commit()
            self.alice, self.bob = alice.id, bob.id
            self.topic, self.other_topic, self.lesson = topic.id, other.id, lesson.id

        self.calls = []
        self.handler = self.success

        async def transport(request):
            self.calls.append(request)
            return await self.handler(request)

        self.http = httpx.AsyncClient(transport=httpx.MockTransport(transport))
        self.ai = SystemAIService(client=self.http)
        app = FastAPI()
        app.include_router(system_ai.router, prefix="/api/v1")
        app.state.system_ai = self.ai

        def get_session():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[database.get_session] = get_session
        self.client = TestClient(app)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)
        self.addCleanup(lambda: self.client.portal.call(self.http.aclose))

    async def success(self, request):
        if request.method == "GET":
            return httpx.Response(200, json={"ready": True, "retrievalModel": "test-indobert"})
        return httpx.Response(200, json={
            "reply": "Indeks membantu menemukan data.",
            "sources": [{"page": 14, "text": "An index finds records by search key.", "score": 0.9}],
            "retrieval": "indobert-semantic", "generator": "template-local", "confidence": 0.9,
        })

    def call(self, method, path, *, user=None, body=None):
        token = jwt.encode({"sub": str(user or self.alice)}, os.environ["JWT_SECRET_KEY"], algorithm="HS256")
        return self.client.request(method, f"/api/v1/system-ai{path}",
                                   headers={"Authorization": f"Bearer {token}"}, json=body)

    def create(self, **body):
        response = self.call("POST", "/conversations", body=body)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def send(self, conversation_id, message="Apa itu indeks?", **kwargs):
        return self.call("POST", f"/conversations/{conversation_id}/messages", body={"message": message}, **kwargs)

    def messages(self, conversation_id):
        return self.call("GET", f"/conversations/{conversation_id}").json()["messages"]

    def test_status_is_public_and_conversations_require_authentication(self):
        status = self.client.get("/api/v1/system-ai/status")
        self.assertTrue(status.json()["ready"])
        for method, path, body in [("GET", "/conversations", None), ("POST", "/conversations", {}),
                                    ("GET", "/conversations/missing", None),
                                    ("POST", "/conversations/missing/messages", {"message": "hello"}),
                                    ("DELETE", "/conversations/missing", None)]:
            response = self.client.request(method, f"/api/v1/system-ai{path}", json=body)
            self.assertEqual(response.status_code, 401)

    def test_user_cannot_list_read_write_or_delete_another_users_conversation(self):
        conversation = self.create()
        self.assertEqual(self.call("GET", "/conversations", user=self.bob).json(), [])
        self.assertEqual(self.call("GET", f"/conversations/{conversation}", user=self.bob).status_code, 404)
        self.assertEqual(self.send(conversation, user=self.bob).status_code, 404)
        self.assertEqual(self.call("DELETE", f"/conversations/{conversation}", user=self.bob).status_code, 404)
        self.assertEqual(self.calls, [])

    def test_context_and_message_validation_rejects_forged_history_and_documents(self):
        conversation = self.create()
        for body in ({"message": " "}, {"message": "x" * 1001}, {"message": "hello", "history": []},
                     {"message": "hello", "documents": [{"text": "pretend material"}]}):
            self.assertEqual(self.call("POST", f"/conversations/{conversation}/messages", body=body).status_code, 422)
        self.assertEqual(self.call("POST", "/conversations", body={"lesson_id": 99999}).status_code, 404)
        self.assertEqual(self.call("POST", "/conversations", body={"topic_id": 99999}).status_code, 404)
        self.assertEqual(self.call("POST", "/conversations", body={"lesson_id": self.lesson, "topic_id": self.other_topic}).status_code, 422)

    def test_reply_and_sources_are_persisted_and_history_is_built_by_the_server(self):
        conversation = self.create()
        response = self.send(conversation)
        self.assertEqual(response.status_code, 200, response.text)
        turns = self.messages(conversation)
        self.assertEqual([turn["role"] for turn in turns], ["user", "assistant"])
        self.assertEqual(turns[1]["sources"][0]["page"], 14)
        self.assertEqual(turns[1]["retrieval"], "indobert-semantic")
        self.assertEqual(response.json()["conversation"]["title"], "Apa itu indeks?")
        self.send(conversation, "Jelaskan lagi")
        payload = json.loads(self.calls[-1].content)
        self.assertEqual(payload["history"][0]["text"], "Apa itu indeks?")
        self.assertEqual(payload["history"][1]["role"], "model")
        self.assertTrue(payload["history"][1]["hasSources"])
        self.assertNotIn("documents", payload)

    def test_lesson_context_uses_database_content_and_empty_topics_do_not_use_pdf_material(self):
        conversation = self.create(lesson_id=self.lesson)
        self.assertEqual(self.send(conversation).status_code, 200)
        payload = json.loads(self.calls[-1].content)
        self.assertEqual(payload["documents"], [{"text": "An index finds records by search key.",
                                               "title": "Database index", "lesson_id": self.lesson, "topic_id": self.topic}])
        conversation = self.create(topic_id=self.other_topic)
        self.send(conversation)
        self.assertEqual(json.loads(self.calls[-1].content)["documents"], [])

    def test_provider_failure_timeout_and_malformed_reply_do_not_save_partial_turns(self):
        conversation = self.create()
        for failure, status in [("offline", 503), ("timeout", 504), ("invalid", 503)]:
            async def handler(request):
                if failure == "offline":
                    raise httpx.ConnectError("unreachable", request=request)
                if failure == "timeout":
                    raise httpx.ReadTimeout("slow", request=request)
                return httpx.Response(200, json={"reply": "missing response fields"})
            self.handler = handler
            response = self.send(conversation)
            self.assertEqual(response.status_code, status, response.text)
            self.assertEqual(self.messages(conversation), [])
        self.handler = self.success
        self.assertEqual(self.send(conversation).status_code, 200)
        self.assertEqual(len(self.messages(conversation)), 2)

    def test_unavailable_model_is_reported_without_raising_on_status(self):
        async def unavailable(request):
            raise httpx.ConnectError("unreachable", request=request)
        self.handler = unavailable
        response = self.client.get("/api/v1/system-ai/status")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["ready"])
        self.assertFalse(response.json()["available"])

    def test_delete_removes_messages_and_conversation(self):
        conversation = self.create()
        self.send(conversation)
        self.assertEqual(self.call("DELETE", f"/conversations/{conversation}").status_code, 204)
        self.assertEqual(self.call("GET", f"/conversations/{conversation}").status_code, 404)
        with Session(self.engine) as session:
            self.assertEqual(session.exec(select(AIMessage)).all(), [])
            self.assertEqual(session.exec(select(AIConversation)).all(), [])

    def test_concurrent_turns_are_ordered_and_model_receives_previous_reply(self):
        async def delayed(request):
            await asyncio.sleep(0.02)
            return await self.success(request)
        self.handler = delayed
        conversation = self.create()
        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(executor.map(lambda text: self.send(conversation, text), ["Index?", "RAID?"]))
        self.assertTrue(all(response.status_code == 200 for response in responses))
        self.assertEqual([turn["role"] for turn in self.messages(conversation)], ["user", "assistant", "user", "assistant"])
        self.assertEqual(len(json.loads(self.calls[-1].content)["history"]), 2)
        self.assertEqual(self.ai._locks, {})

    def test_rate_limit_is_per_account_and_returns_retry_after(self):
        conversation = self.create()
        for _ in range(30):
            self.assertEqual(self.send(conversation).status_code, 200)
        response = self.send(conversation)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers["Retry-After"], "60")
        other = self.call("POST", "/conversations", body={}, user=self.bob).json()["id"]
        self.assertEqual(self.send(other, user=self.bob).status_code, 200)
