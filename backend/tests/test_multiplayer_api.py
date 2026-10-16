import json
import os
from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import patch

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlmodel import Session, create_engine, select
from starlette.websockets import WebSocketDisconnect

from app.main import app
from app.types.learning import Subject, Topic
from app.types.player import PlayerProfile
from app.types.question import Question, QuestionAttempt, QuestionOption
from app.types.user import User
from database import database
from tests.multiplayer_support import FakeClock


class MultiplayerAPITests(TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.engine = create_engine(
            f"sqlite:///{Path(directory.name) / 'test.db'}",
            connect_args={"check_same_thread": False},
        )
        self.addCleanup(self.engine.dispose)
        event.listen(self.engine, "connect", database.enable_foreign_keys)
        engine_patch = patch.object(database, "engine", self.engine)
        engine_patch.start()
        self.addCleanup(engine_patch.stop)
        secret_patch = patch.dict(os.environ, {"JWT_SECRET_KEY": "multiplayer-test-secret-32-bytes-long"})
        secret_patch.start()
        self.addCleanup(secret_patch.stop)
        stack = ExitStack()
        self.addCleanup(stack.close)
        self.client = stack.enter_context(TestClient(app))
        self.clock = FakeClock()
        app.state.multiplayer.clock = self.clock
        self.users = []
        self.keys = {}
        with Session(self.engine) as session:
            for name in ("alice", "bob", "outsider"):
                user = User(username=name)
                session.add(user)
                session.flush()
                self.users.append(user.id)
                session.add(PlayerProfile(user_id=user.id))
            subject = Subject(name="Mathematics")
            session.add(subject)
            session.flush()
            topic = Topic(subject_id=subject.id, name="Fractions")
            session.add(topic)
            session.flush()
            self.topic_id = topic.id
            for index in range(10):
                question = Question(topic_id=topic.id, question_text=f"Question {index}")
                session.add(question)
                session.flush()
                for option_index in range(4):
                    option = QuestionOption(question_id=question.id,
                                            option_text=f"Option {option_index}",
                                            option_order=option_index,
                                            is_correct=option_index == 0)
                    session.add(option)
                    session.flush()
                    if option_index == 0:
                        self.keys[question.id] = option.id
            session.commit()

    def token(self, user_index=0):
        return jwt.encode({"sub": str(self.users[user_index])},
                          os.environ["JWT_SECRET_KEY"], algorithm="HS256")

    def call(self, method, path, user=0, body=None):
        return self.client.request(method, f"/api/v1/multiplayer{path}",
                                   headers={"Authorization": f"Bearer {self.token(user)}"},
                                   **({"json": body} if body is not None else {}))

    def create(self):
        response = self.call("POST", "/rooms", body={"topic_id": self.topic_id})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["room_code"]

    def active_room(self):
        code = self.create()
        self.assertEqual(self.call("POST", f"/rooms/{code}/join", user=1).status_code, 200)
        for user in (0, 1):
            response = self.call("POST", f"/rooms/{code}/character", user=user,
                                 body={"character_id": "godzilla"})
            self.assertEqual(response.status_code, 200, response.text)
            response = self.call("POST", f"/rooms/{code}/ready", user=user, body={"ready": True})
            self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "active")
        return code

    def player(self, state, user=0):
        return next(player for player in state["players"] if player["user_id"] == self.users[user])

    def select(self, code, user=0, request_id="request-123", action="basic"):
        response = self.call("POST", f"/rooms/{code}/actions", user=user,
                             body={"action": action, "request_id": request_id})
        self.assertEqual(response.status_code, 200, response.text)
        return self.player(response.json(), user)["pending_question"]

    def answer(self, code, pending, user=0):
        return self.call("POST", f"/rooms/{code}/answers", user=user, body={
            "attempt_id": pending["attempt_id"],
            "selected_option_id": self.keys[pending["question_id"]],
        })

    def receive_state(self, websocket, predicate):
        for _ in range(50):
            message = websocket.receive_json()
            if message.get("type") == "state" and predicate(message["state"]):
                return message["state"]
        self.fail("Expected state was not broadcast")

    def test_configuration_matches_prototype(self):
        response = self.client.get("/api/v1/multiplayer/config")
        self.assertEqual(response.status_code, 200)
        config = response.json()
        self.assertEqual((config["initial_hp"], config["max_energy"], config["question_limit"]), (100, 5, 10))
        self.assertEqual((config["match_seconds"], config["question_seconds"]), (180, 15))
        self.assertEqual(config["actions"]["ultimate"]["damage"], 40)

    def test_authentication_membership_and_room_capacity(self):
        self.assertEqual(self.client.post("/api/v1/multiplayer/rooms", json={}).status_code, 401)
        code = self.create()
        self.assertEqual(self.call("GET", f"/rooms/{code}", user=2).status_code, 403)
        self.assertEqual(self.call("POST", f"/rooms/{code}/leave", user=2).status_code, 403)
        self.assertEqual(self.call("POST", "/rooms", body={}).status_code, 409)
        joined = self.call("POST", f"/rooms/{code.lower()}/join", user=1)
        self.assertEqual(joined.status_code, 200)
        self.assertEqual(self.call("POST", f"/rooms/{code}/join", user=2).status_code, 409)
        self.assertEqual(len(self.call("POST", f"/rooms/{code}/join", user=1).json()["players"]), 2)
        self.assertEqual(self.call("POST", f"/rooms/{code}/leave", user=1).status_code, 200)
        self.assertEqual(self.call("POST", f"/rooms/{code}/join", user=2).status_code, 200)

    def test_invalid_topic_character_and_untrusted_state_are_rejected(self):
        self.assertEqual(self.call("POST", "/rooms", body={"topic_id": 999999}).status_code, 404)
        code = self.create()
        self.assertEqual(self.call("POST", f"/rooms/{code}/ready", body={}).status_code, 409)
        self.assertEqual(self.call("POST", f"/rooms/{code}/character", body={"character_id": "missing"}).status_code, 404)
        self.assertEqual(self.call("POST", f"/rooms/{code}/actions", body={"action": "basic", "request_id": "request-123", "hp": 10000}).status_code, 422)

    def test_insufficient_question_bank_does_not_start_a_match(self):
        with Session(self.engine) as session:
            option = session.exec(select(QuestionOption).where(QuestionOption.is_correct == True)).first()
            option.is_correct = False
            session.add(option)
            session.commit()
        code = self.create()
        self.call("POST", f"/rooms/{code}/join", user=1)
        for user in (0, 1):
            self.call("POST", f"/rooms/{code}/character", user=user, body={"character_id": "godzilla"})
        self.call("POST", f"/rooms/{code}/ready", body={})
        response = self.call("POST", f"/rooms/{code}/ready", user=1, body={})
        self.assertEqual(response.status_code, 409)
        state = self.call("GET", f"/rooms/{code}").json()
        self.assertEqual(state["status"], "waiting")
        self.assertFalse(self.player(state, 1)["ready"])

    def test_question_privacy_grading_and_replay_without_learning_rewards(self):
        code = self.active_room()
        pending = self.select(code)
        other_view = self.call("GET", f"/rooms/{code}", user=1).json()
        self.assertIsNone(self.player(other_view)["pending_question"])
        self.assertNotIn("correct_option_id", json.dumps(other_view))
        self.assertNotIn("is_correct", json.dumps(other_view))
        self.assertEqual(len(pending["options"]), 4)
        invalid = self.call("POST", f"/rooms/{code}/answers", body={"attempt_id": pending["attempt_id"], "selected_option_id": 999999})
        self.assertEqual(invalid.status_code, 422)
        self.clock.advance(3)
        first = self.answer(code, pending)
        self.assertEqual(first.status_code, 200, first.text)
        replay = self.answer(code, pending)
        self.assertEqual(replay.status_code, 200)
        self.assertEqual(self.player(replay.json(), 1)["hp"], 88)
        self.assertEqual(self.player(replay.json())["questions_used"], 1)
        with Session(self.engine) as session:
            profile = session.get(PlayerProfile, self.users[0])
            self.assertEqual((profile.total_exp, profile.currency_balance), (0, 0))
            self.assertEqual(session.exec(select(QuestionAttempt)).all(), [])

    def test_concurrent_duplicate_submissions_apply_damage_exactly_once(self):
        code = self.active_room()
        pending = self.select(code)
        self.clock.advance(1)
        with ThreadPoolExecutor(max_workers=4) as executor:
            responses = list(executor.map(lambda _: self.answer(code, pending), range(4)))
        self.assertTrue(all(response.status_code == 200 for response in responses))
        state = self.call("GET", f"/rooms/{code}").json()
        self.assertEqual(self.player(state, 1)["hp"], 88)
        self.assertEqual(self.player(state)["energy"], 1)

    def test_result_rematch_and_active_leave_rules(self):
        code = self.active_room()
        self.assertEqual(self.call("POST", f"/rooms/{code}/leave").status_code, 409)
        first_match = self.call("GET", f"/rooms/{code}").json()["match_id"]
        self.clock.advance(180)
        state = self.call("GET", f"/rooms/{code}").json()
        self.assertEqual(state["result"]["reason"], "time_limit")
        self.assertTrue(all(p["outcome"] == "draw" for p in state["result"]["players"]))
        self.assertEqual(self.call("POST", f"/rooms/{code}/rematch").json()["status"], "finished")
        reset = self.call("POST", f"/rooms/{code}/rematch", user=1).json()
        self.assertEqual(reset["status"], "waiting")
        self.assertEqual(reset["previous_result"]["match_id"], first_match)

    def test_websocket_pushes_damage_to_both_players_without_waiting_for_answers(self):
        code = self.active_room()
        with self.client.websocket_connect(f"/api/v1/multiplayer/rooms/{code}/ws") as alice:
            alice.send_json({"type": "authenticate", "token": self.token()})
            self.receive_state(alice, lambda state: state["status"] == "active")
            with self.client.websocket_connect(f"/api/v1/multiplayer/rooms/{code}/ws") as bob:
                bob.send_json({"type": "authenticate", "token": self.token(1)})
                self.receive_state(bob, lambda state: state["status"] == "active")
                pending_a = self.select(code)
                pending_b = self.select(code, user=1, request_id="request-bob")
                self.clock.advance(3)
                self.assertEqual(self.answer(code, pending_a).status_code, 200)
                state_a = self.receive_state(alice, lambda state: self.player(state, 1)["hp"] == 88)
                state_b = self.receive_state(bob, lambda state: self.player(state, 1)["hp"] == 88)
                self.assertIsNone(self.player(state_a, 1).get("pending_question"))
                self.assertEqual(self.player(state_b, 1)["pending_question"]["attempt_id"], pending_b["attempt_id"])
                self.assertTrue(any(event["type"] == "action_resolved" for event in state_b["recent_events"]))

    def test_server_timers_broadcast_timeouts_and_match_end_without_http_polling(self):
        code = self.active_room()
        with self.client.websocket_connect(f"/api/v1/multiplayer/rooms/{code}/ws") as socket:
            socket.send_json({"type": "authenticate", "token": self.token()})
            self.receive_state(socket, lambda state: state["status"] == "active")
            self.select(code)
            self.clock.advance(15)
            timed_out = self.receive_state(socket, lambda state: self.player(state)["questions_used"] == 1)
            self.assertTrue(self.player(timed_out)["last_answer"]["timed_out"])
            self.clock.advance(165)
            ended = self.receive_state(socket, lambda state: state["status"] == "finished")
            self.assertEqual(ended["result"]["reason"], "time_limit")

    def test_websocket_rejects_invalid_credentials_and_non_members(self):
        code = self.create()
        for token, close_code in (("invalid-token", 4401), (self.token(2), 4403)):
            with self.subTest(close_code=close_code):
                with self.client.websocket_connect(f"/api/v1/multiplayer/rooms/{code}/ws") as socket:
                    socket.send_json({"type": "authenticate", "token": token})
                    with self.assertRaises(WebSocketDisconnect) as error:
                        socket.receive_json()
                    self.assertEqual(error.exception.code, close_code)

    def test_websocket_rejects_unapproved_browser_origin(self):
        code = self.create()
        with self.assertRaises(WebSocketDisconnect):
            with self.client.websocket_connect(f"/api/v1/multiplayer/rooms/{code}/ws", headers={"Origin": "https://untrusted.example"}):
                self.fail("Unapproved origin was allowed")
