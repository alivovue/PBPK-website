from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlmodel import Session

from app.types.player import PlayerProfile
from app.types.progression import Rank


def profile_for(session: Session, user_id: int) -> PlayerProfile:
    profile = session.get(PlayerProfile, user_id)
    if profile is None:
        raise HTTPException(404, "Player profile not found")
    return profile


def next_level_threshold(current_level: int) -> int:
    # Cumulative EXP needed to reach the next level.
    return 50 * current_level * (current_level + 1)


def grant_exp(session: Session, user_id: int, amount: int) -> dict:
    if amount < 0:
        raise ValueError("EXP cannot be negative")
    profile = profile_for(session, user_id)
    previous = profile.level
    profile.total_exp += amount
    while profile.total_exp >= next_level_threshold(profile.level):
        profile.level += 1
    session.add(profile)
    return {"exp_gained": amount, "level": profile.level,
            "leveled_up": profile.level > previous}


def record_activity(session: Session, user_id: int) -> None:
    profile = profile_for(session, user_id)
    today = datetime.now(timezone.utc).date()
    if profile.last_activity_date == today:
        return
    if profile.last_activity_date == today - timedelta(days=1):
        profile.current_streak += 1
    else:
        profile.current_streak = 1
    profile.longest_streak = max(profile.longest_streak, profile.current_streak)
    profile.last_activity_date = today
    session.add(profile)


def snapshot(session: Session, user_id: int) -> dict:
    profile = profile_for(session, user_id)
    rank = session.get(Rank, profile.rank_id)
    return {
        "user_id": profile.user_id,
        "level": profile.level,
        "total_exp": profile.total_exp,
        "next_level_at_exp": next_level_threshold(profile.level),
        "rank": rank.name if rank else None,
        "rank_id": profile.rank_id,
        "currency_balance": profile.currency_balance,
        "current_streak": profile.current_streak,
        "longest_streak": profile.longest_streak,
    }
