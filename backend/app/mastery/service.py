from datetime import datetime, timezone
from sqlmodel import Session, select
from app.types.mastery import UserTopicMastery


def update_mastery(session: Session, user_id: int,
                   topic_id: int, is_correct: bool) -> UserTopicMastery:
    key = (user_id, topic_id)
    mastery = session.get(UserTopicMastery, key)
    if mastery is None:
        mastery = UserTopicMastery(user_id=user_id, topic_id=topic_id,
                                  mastery_score=0.5)
    mastery.total_attempts += 1
    if is_correct:
        mastery.correct_attempts += 1
        mastery.consecutive_errors = 0
        mastery.mastery_score = min(1.0, mastery.mastery_score + 0.12)
    else:
        mastery.consecutive_errors += 1
        mastery.mastery_score = max(0.0, mastery.mastery_score - 0.16)
    mastery.last_practiced_at = datetime.now(timezone.utc)
    session.add(mastery)
    return mastery


def list_mastery(session: Session, user_id: int) -> list[UserTopicMastery]:
    return list(session.exec(select(UserTopicMastery).where(
        UserTopicMastery.user_id == user_id)).all())
