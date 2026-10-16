from fastapi import HTTPException
from sqlmodel import Session, select
from app.player.service import profile_for
from app.types.progression import Rank


def list_ranks(session: Session) -> list[Rank]:
    return list(session.exec(select(Rank).order_by(Rank.rank_order)).all())


def require_promotion_eligibility(session: Session, user_id: int,
                                  required_rank_id: int, target_rank_id: int) -> None:
    profile = profile_for(session, user_id)
    current = session.get(Rank, profile.rank_id)
    target = session.get(Rank, target_rank_id)
    if not current or not target or profile.rank_id != required_rank_id:
        raise HTTPException(403, "Incorrect rank for this exam")
    if target.rank_order != current.rank_order + 1:
        raise HTTPException(400, "Exam must promote exactly one rank")
    if profile.level < target.min_level:
        raise HTTPException(403, "Level too low for promotion")


def promote(session: Session, user_id: int,
            required_rank_id: int, target_rank_id: int) -> None:
    require_promotion_eligibility(session, user_id, required_rank_id, target_rank_id)
    profile = profile_for(session, user_id)
    profile.rank_id = target_rank_id
    session.add(profile)
