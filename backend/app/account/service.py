import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.types.player import PlayerProfile
from app.types.character import Character, PlayerCharacter
from app.types.user import User
from database.database import get_session

load_dotenv()
passwords = PasswordHash.recommended()
bearer = HTTPBearer()


def public_user(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "school_grade": user.school_grade,
    }


def register(session: Session, username: str, password: str,
             display_name: str | None, school_grade: int) -> dict:
    username = username.strip().lower()
    if not (3 <= len(username) <= 30) or not username.replace('_', '').isalnum():
        raise HTTPException(422, "Username must be 3-30 letters, numbers, or underscores")
    if session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(409, "Username is taken")
    user = User(username=username, password_hash=passwords.hash(password),
                display_name=display_name, school_grade=school_grade)
    session.add(user)
    try:
        session.flush()
        session.add(PlayerProfile(user_id=user.id, rank_id=1))
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, "Username is taken")
    return public_user(user)


def login(session: Session, username: str, password: str) -> dict:
    user = session.exec(select(User).where(User.username == username.strip().lower())).first()
    if not user or not user.is_active or not user.password_hash:
        raise HTTPException(401, "Invalid credentials")
    try:
        valid, updated_hash = passwords.verify_and_update(password, user.password_hash)
    except UnknownHashError:
        valid, updated_hash = False, None
    if not valid:
        raise HTTPException(401, "Invalid credentials")
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY must be set in .env")

    # All logged-in players receive the full current character catalogue.
    # Persisting the grants keeps `owned` and the `owned=true` API filter
    # consistent, instead of only changing what the frontend displays.
    owned_character_ids = set(session.exec(
        select(PlayerCharacter.character_id).where(PlayerCharacter.user_id == user.id)
    ).all())
    catalogue_character_ids = set(session.exec(select(Character.id)).all())
    missing_character_ids = catalogue_character_ids - owned_character_ids
    if missing_character_ids:
        session.add_all(
            PlayerCharacter(user_id=user.id, character_id=character_id)
            for character_id in missing_character_ids
        )

    if updated_hash is not None:
        user.password_hash = updated_hash
        session.add(user)

    if missing_character_ids or updated_hash is not None:
        session.commit()
    token = jwt.encode({
        "sub": str(user.id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }, secret, algorithm="HS256")
    return {"access_token": token, "token_type": "bearer"}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    session: Session = Depends(get_session),
) -> User:
    try:
        secret = os.environ["JWT_SECRET_KEY"]
        data = jwt.decode(credentials.credentials, secret, algorithms=["HS256"])
        user_id = int(data["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(401, "Invalid or expired token")
    user = session.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(401, "Account not available")
    return user
