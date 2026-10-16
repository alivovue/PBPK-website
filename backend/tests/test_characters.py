import os
from contextlib import ExitStack
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import patch

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, create_engine, select

from app.characters.service import grant_character
from app.main import app
from app.types.character import Character, PlayerCharacter
from app.types.user import User
from database import database


class CharacterAPITests(TestCase):
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
        secret_patch = patch.dict(os.environ, {"JWT_SECRET_KEY": "characters-test-secret-key-32-bytes"})
        secret_patch.start()
        self.addCleanup(secret_patch.stop)

        def get_test_session():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[database.get_session] = get_test_session
        self.addCleanup(app.dependency_overrides.clear)
        stack = ExitStack()
        self.addCleanup(stack.close)
        self.client = stack.enter_context(TestClient(app))
        with Session(self.engine) as session:
            alice = User(username="alice")
            bob = User(username="bob")
            session.add_all([alice, bob])
            session.commit()
            self.alice_id = alice.id
            self.bob_id = bob.id

    def authorization(self, user_id):
        token = jwt.encode(
            {"sub": str(user_id)}, os.environ["JWT_SECRET_KEY"], algorithm="HS256"
        )
        return {"Authorization": f"Bearer {token}"}

    def add_kong(self):
        with Session(self.engine) as session:
            session.add(Character(
                id="kong", name="Kong", title="King of Skull Island",
                universe="Monsterverse", role="Fighter", level=1, power=100,
                rarity="Rare", color="brown",
            ))
            session.commit()

    def test_public_catalogue_matches_frontend_shape(self):
        response = self.client.get("/api/v1/characters")
        self.assertEqual(response.status_code, 200)
        expected = {
            "id": "godzilla", "name": "Godzilla", "title": "King of The Monster",
            "universe": "Monsterverse", "role": "Dominator", "level": 18,
            "power": 1280, "rarity": "Legendary", "color": "gold", "owned": False,
        }
        self.assertEqual(response.json(), [expected])
        detail = self.client.get("/api/v1/characters/godzilla")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json(), expected)

    def test_player_routes_require_valid_authentication(self):
        for path in ("/api/v1/player/me/characters", "/api/v1/player/me/characters/godzilla"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 401)
                invalid = self.client.get(path, headers={"Authorization": "Bearer invalid"})
                self.assertEqual(invalid.status_code, 401)

    def test_ownership_is_persisted_and_isolated_between_players(self):
        with Session(self.engine) as session:
            grant_character(session, self.alice_id, "godzilla")
            grant_character(session, self.alice_id, "godzilla")
            session.commit()
        with Session(self.engine) as session:
            self.assertEqual(len(session.exec(select(PlayerCharacter)).all()), 1)
        for user_id, owned in ((self.alice_id, True), (self.bob_id, False)):
            with self.subTest(user_id=user_id):
                headers = self.authorization(user_id)
                response = self.client.get("/api/v1/player/me/characters", headers=headers)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()[0]["owned"], owned)
                detail = self.client.get(
                    "/api/v1/player/me/characters/godzilla", headers=headers
                )
                self.assertEqual(detail.status_code, 200)
                self.assertEqual(detail.json()["owned"], owned)
        self.assertFalse(self.client.get("/api/v1/characters/godzilla").json()["owned"])

    def test_filters_and_pagination(self):
        self.add_kong()
        with Session(self.engine) as session:
            grant_character(session, self.alice_id, "godzilla")
            session.commit()
        response = self.client.get(
            "/api/v1/characters",
            params={"universe": "Monsterverse", "rarity": "Rare", "role": "Fighter"},
        )
        self.assertEqual([row["id"] for row in response.json()], ["kong"])
        self.assertEqual(self.client.get(
            "/api/v1/characters", params={"universe": "Unknown"}
        ).json(), [])
        page = self.client.get("/api/v1/characters", params={"offset": 1, "limit": 1})
        self.assertEqual([row["id"] for row in page.json()], ["kong"])
        for owned, expected_id in (("true", "godzilla"), ("false", "kong")):
            response = self.client.get(
                "/api/v1/player/me/characters", params={"owned": owned},
                headers=self.authorization(self.alice_id),
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual([row["id"] for row in response.json()], [expected_id])
        response = self.client.get(
            "/api/v1/player/me/characters", params={"owned": "true"},
            headers=self.authorization(self.bob_id),
        )
        self.assertEqual(response.json(), [])

    def test_missing_character_and_invalid_pagination(self):
        for path in ("/api/v1/characters", "/api/v1/player/me/characters"):
            with self.subTest(path=path):
                headers = self.authorization(self.alice_id)
                response = self.client.get(f"{path}/missing", headers=headers)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json(), {"detail": "Character not found"})
                for params in ({"offset": -1}, {"limit": 0}, {"limit": 101}):
                    invalid = self.client.get(path, params=params, headers=headers)
                    self.assertEqual(invalid.status_code, 422)

    def test_initialization_preserves_existing_data(self):
        with Session(self.engine) as session:
            character = session.get(Character, "godzilla")
            character.power = 2048
            session.add(character)
            grant_character(session, self.alice_id, "godzilla")
            session.commit()
        database.init_db()
        database.init_db()
        with Session(self.engine) as session:
            self.assertEqual(len(session.exec(select(Character)).all()), 1)
            self.assertEqual(session.get(Character, "godzilla").power, 2048)
            self.assertIsNotNone(session.get(PlayerCharacter, (self.alice_id, "godzilla")))

    def test_grants_participate_in_callers_transaction(self):
        with Session(self.engine) as session:
            grant_character(session, self.alice_id, "godzilla")
            session.rollback()
        response = self.client.get(
            "/api/v1/player/me/characters/godzilla",
            headers=self.authorization(self.alice_id),
        )
        self.assertFalse(response.json()["owned"])

    def test_database_rejects_invalid_stats_and_ownership(self):
        with Session(self.engine) as session:
            for level, power in ((0, 100), (1, -1)):
                with self.subTest(level=level, power=power):
                    character = session.get(Character, "godzilla")
                    character.level, character.power = level, power
                    session.add(character)
                    with self.assertRaises(IntegrityError):
                        session.commit()
                    session.rollback()
            for user_id, character_id in (
                (self.alice_id, "missing"), (999999, "godzilla"),
            ):
                with self.subTest(user_id=user_id, character_id=character_id):
                    session.add(PlayerCharacter(user_id=user_id, character_id=character_id))
                    with self.assertRaises(IntegrityError):
                        session.commit()
                    session.rollback()
