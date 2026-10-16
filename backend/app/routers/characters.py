from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.characters import service
from app.types.character import CharacterRead
from database.database import get_session

router = APIRouter(prefix="/characters", tags=["Characters"])


@router.get("", response_model=list[CharacterRead])
def characters(
    universe: str | None = None,
    rarity: str | None = None,
    role: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    session: Session = Depends(get_session),
):
    return service.list_characters(
        session, universe=universe, rarity=rarity, role=role,
        offset=offset, limit=limit,
    )


@router.get("/{character_id}", response_model=CharacterRead)
def character(character_id: str, session: Session = Depends(get_session)):
    return service.get_character(session, character_id)
