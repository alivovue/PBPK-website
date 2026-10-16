from fastapi import HTTPException
from sqlalchemy import and_
from sqlmodel import Session, select

from app.types.character import Character, CharacterRead, PlayerCharacter
from app.types.user import User


def list_characters(
    session: Session,
    user_id: int | None = None,
    *,
    universe: str | None = None,
    rarity: str | None = None,
    role: str | None = None,
    owned: bool | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[CharacterRead]:
    query = select(Character, PlayerCharacter.character_id).outerjoin(
        PlayerCharacter,
        and_(
            PlayerCharacter.character_id == Character.id,
            PlayerCharacter.user_id == user_id,
        ),
    )
    for column, value in (
        (Character.universe, universe),
        (Character.rarity, rarity),
        (Character.role, role),
    ):
        if value is not None:
            query = query.where(column == value)
    if owned is True:
        query = query.where(PlayerCharacter.character_id.is_not(None))
    elif owned is False:
        query = query.where(PlayerCharacter.character_id.is_(None))
    rows = session.exec(query.order_by(Character.id).offset(offset).limit(limit)).all()
    return [
        CharacterRead(**character.model_dump(), owned=character_id is not None)
        for character, character_id in rows
    ]


def get_character(
    session: Session, character_id: str, user_id: int | None = None
) -> CharacterRead:
    character = session.get(Character, character_id)
    if character is None:
        raise HTTPException(404, "Character not found")
    ownership = (
        session.get(PlayerCharacter, (user_id, character_id))
        if user_id is not None else None
    )
    return CharacterRead(**character.model_dump(), owned=ownership is not None)


def grant_character(
    session: Session, user_id: int, character_id: str
) -> PlayerCharacter:
    """Grant ownership from trusted game logic; the caller commits the transaction."""
    if session.get(User, user_id) is None:
        raise HTTPException(404, "User not found")
    if session.get(Character, character_id) is None:
        raise HTTPException(404, "Character not found")
    ownership = session.get(PlayerCharacter, (user_id, character_id))
    if ownership is None:
        ownership = PlayerCharacter(user_id=user_id, character_id=character_id)
        session.add(ownership)
        session.flush()
    return ownership
