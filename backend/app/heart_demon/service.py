from datetime import datetime, timezone
from sqlmodel import Session, select
from app.types.progression import HeartDemon
from app.types.mastery import UserTopicMastery


def active_for_topic(session: Session, user_id: int, topic_id: int):
    return session.exec(select(HeartDemon).where(
        HeartDemon.user_id == user_id,
        HeartDemon.topic_id == topic_id,
        HeartDemon.status == "active")).first()


def evaluate(session: Session, mastery: UserTopicMastery) -> dict | None:
    demon = active_for_topic(session, mastery.user_id, mastery.topic_id)
    if demon and mastery.mastery_score >= demon.required_mastery:
        demon.status = "defeated"
        demon.defeated_at = datetime.now(timezone.utc)
        session.add(demon)
    elif demon is None and mastery.consecutive_errors >= 3 and mastery.mastery_score < 0.5:
        demon = HeartDemon(user_id=mastery.user_id, topic_id=mastery.topic_id,
                           trigger_mastery=mastery.mastery_score,
                           required_mastery=0.8)
        session.add(demon)
        session.flush()
    if demon:
        return {"id": demon.id, "topic_id": demon.topic_id,
                "status": demon.status, "required_mastery": demon.required_mastery}
    return None


def list_demons(session: Session, user_id: int) -> list[HeartDemon]:
    return list(session.exec(select(HeartDemon).where(
        HeartDemon.user_id == user_id).order_by(HeartDemon.spawned_at.desc())).all())
