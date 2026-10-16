"""Keep Compose usable without a manually configured signing secret."""

import os
from pathlib import Path
import secrets
import sys


def configure_jwt_secret():
    if os.environ.get("JWT_SECRET_KEY"):
        return
    path = Path(os.environ.get("JWT_SECRET_FILE", "/app/runtime/jwt-secret"))
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        pass
    else:
        with os.fdopen(descriptor, "w") as file:
            file.write(secrets.token_urlsafe(48))
    secret = path.read_text().strip()
    if not secret:
        raise RuntimeError("The persisted JWT secret is empty.")
    os.environ["JWT_SECRET_KEY"] = secret


if __name__ == "__main__":
    command = sys.argv[1:]
    if not command:
        raise SystemExit("A server command is required.")
    configure_jwt_secret()
    os.execvp(command[0], command)
