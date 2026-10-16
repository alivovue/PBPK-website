import os
from unittest import TestCase
from unittest.mock import patch

import jwt
from fastapi import HTTPException
from pwdlib.hashers.argon2 import Argon2Hasher
from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine, select

from app.account import service
from app.types.progression import Rank
from app.types.user import User
from database.database import enable_foreign_keys


class AccountPasswordTests(TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        self.addCleanup(self.engine.dispose)
        event.listen(self.engine, "connect", enable_foreign_keys)
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.addCleanup(self.session.close)
        self.session.add(Rank(id=1, name="Qi Refining", rank_order=1))
        self.session.commit()
        secret_patch = patch.dict(os.environ, {"JWT_SECRET_KEY": "password-tests-secret-at-least-32-bytes"})
        secret_patch.start()
        self.addCleanup(secret_patch.stop)
        self.password = "Password-test-only-123!"

    def register(self, username="learner"):
        return service.register(self.session, username, self.password,
                                display_name="Learner", school_grade=7)

    def stored_user(self, username="learner"):
        return self.session.exec(select(User).where(User.username == username)).one()

    def assert_invalid_credentials(self, username, password):
        with self.assertRaises(HTTPException) as error:
            service.login(self.session, username, password)
        self.assertEqual(error.exception.status_code, 401)
        self.assertEqual(error.exception.detail, "Invalid credentials")

    def test_registration_persists_argon2id_instead_of_plaintext(self):
        response = self.register()
        with Session(self.engine) as independent_session:
            user = independent_session.get(User, response["id"])
            self.assertNotEqual(user.password_hash, self.password)
            self.assertTrue(user.password_hash.startswith("$argon2id$"))
            self.assertTrue(service.passwords.verify(self.password, user.password_hash))
        self.assertNotIn("password", response)
        self.assertNotIn("password_hash", response)

    def test_identical_passwords_have_different_salted_hashes(self):
        self.register("learner_one")
        self.register("learner_two")
        first = self.stored_user("learner_one")
        second = self.stored_user("learner_two")
        self.assertNotEqual(first.password_hash, second.password_hash)
        self.assertTrue(service.passwords.verify(self.password, first.password_hash))
        self.assertTrue(service.passwords.verify(self.password, second.password_hash))

    def test_user_serialization_excludes_password_hash(self):
        self.register()
        user = self.stored_user()
        self.assertNotIn("password_hash", user.model_dump())
        self.assertNotIn(user.password_hash, user.model_dump_json())
        self.assertNotIn("password_hash", service.public_user(user))

    def test_correct_password_authenticates_without_rehashing_current_hash(self):
        self.register()
        before = self.stored_user().password_hash
        response = service.login(self.session, "LEARNER", self.password)
        claims = jwt.decode(response["access_token"], os.environ["JWT_SECRET_KEY"], algorithms=["HS256"])
        self.assertEqual(claims["sub"], str(self.stored_user().id))
        self.assertEqual(response["token_type"], "bearer")
        self.assertNotIn("password", claims)
        self.assertNotIn("password_hash", claims)
        self.assertEqual(self.stored_user().password_hash, before)

    def test_invalid_credentials_and_disabled_accounts_fail(self):
        self.register()
        before = self.stored_user().password_hash
        self.assert_invalid_credentials("learner", "incorrect-password")
        self.assertEqual(self.stored_user().password_hash, before)
        self.assert_invalid_credentials("unknown_user", self.password)
        user = self.stored_user()
        user.is_active = False
        self.session.add(user)
        self.session.commit()
        self.assert_invalid_credentials("learner", self.password)

    def test_plaintext_malformed_or_missing_stored_hash_cannot_authenticate(self):
        self.register()
        user = self.stored_user()
        for stored in (self.password, "$argon2id$invalid", None):
            with self.subTest(stored_format="missing" if stored is None else "invalid"):
                user.password_hash = stored
                self.session.add(user)
                self.session.commit()
                self.assert_invalid_credentials("learner", self.password)
                self.assertEqual(user.password_hash, stored)

    def test_outdated_hash_is_upgraded_only_after_successful_verification(self):
        self.register()
        user = self.stored_user()
        old_hash = Argon2Hasher(time_cost=1, memory_cost=8192, parallelism=1).hash(self.password)
        user.password_hash = old_hash
        self.session.add(user)
        self.session.commit()
        self.assert_invalid_credentials("learner", "incorrect-password")
        self.assertEqual(user.password_hash, old_hash)
        service.login(self.session, "learner", self.password)
        with Session(self.engine) as independent_session:
            updated = independent_session.get(User, user.id)
            self.assertNotEqual(updated.password_hash, old_hash)
            self.assertTrue(service.passwords.verify(self.password, updated.password_hash))
            self.assertFalse(service.passwords.current_hasher.check_needs_rehash(updated.password_hash))
