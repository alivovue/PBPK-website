from sqlmodel import Session, select
from app.types.player import PlayerProfile
from app.types.user import User


def global_board(session: Session, limit: int = 20, offset: int = 0):
    rows = session.exec(select(User, PlayerProfile).join(
        PlayerProfile, PlayerProfile.user_id == User.id).where(
        User.is_active == True).order_by(  # noqa: E712
        PlayerProfile.total_exp.desc(), User.id).offset(offset).limit(limit)).all()
    return [{"position": offset + i, "username": user.username,
             "level": profile.level, "total_exp": profile.total_exp,
             "rank_id": profile.rank_id}
            for i, (user, profile) in enumerate(rows, 1)]
