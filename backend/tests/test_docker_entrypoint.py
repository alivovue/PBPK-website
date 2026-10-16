import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import patch

from docker_entrypoint import configure_jwt_secret


class DockerEntrypointTests(TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.secret = Path(directory.name) / "runtime" / "jwt-secret"
        environment = patch.dict(os.environ, {"JWT_SECRET_KEY": "", "JWT_SECRET_FILE": str(self.secret)})
        environment.start()
        self.addCleanup(environment.stop)

    def test_generated_secret_survives_a_restart_without_invalidating_tokens(self):
        import jwt

        configure_jwt_secret()
        original = os.environ["JWT_SECRET_KEY"]
        token = jwt.encode({"sub": "1"}, original, algorithm="HS256")
        self.assertGreaterEqual(len(original), 48)
        self.assertEqual(self.secret.stat().st_mode & 0o777, 0o600)
        os.environ["JWT_SECRET_KEY"] = ""
        configure_jwt_secret()
        self.assertEqual(jwt.decode(token, os.environ["JWT_SECRET_KEY"], algorithms=["HS256"])["sub"], "1")

    def test_an_explicit_secret_takes_precedence_without_writing_a_file(self):
        os.environ["JWT_SECRET_KEY"] = "configured-secret"
        configure_jwt_secret()
        self.assertEqual(os.environ["JWT_SECRET_KEY"], "configured-secret")
        self.assertFalse(self.secret.exists())

    def test_empty_persisted_secret_fails_instead_of_silently_changing_keys(self):
        self.secret.parent.mkdir()
        self.secret.touch()
        with self.assertRaisesRegex(RuntimeError, "persisted JWT secret is empty"):
            configure_jwt_secret()
