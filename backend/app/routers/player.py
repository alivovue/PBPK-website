from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.account.service import get_current_user
from app.characters import service as characters_service
from app.player.service import snapshot
from app.types.character import CharacterRead
from database.database import get_session

router = APIRouter(prefix="/player", tags=["Player"])


@router.get("/me")
def me(user=Depends(get_current_user), session: Session = Depends(get_session)):
    return snapshot(session, user.id)


@router.get("/me/characters", response_model=list[CharacterRead])
def characters(
    universe: str | None = None,
    rarity: str | None = None,
    role: str | None = None,
    owned: bool | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    user=Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return characters_service.list_characters(
        session, user.id, universe=universe, rarity=rarity, role=role,
        owned=owned, offset=offset, limit=limit,
    )


@router.get("/me/characters/{character_id}", response_model=CharacterRead)
def character(
    character_id: str,
    user=Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return characters_service.get_character(session, character_id, user.id)
