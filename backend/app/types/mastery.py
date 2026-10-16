from datetime import datetime
from sqlmodel import SQLModel, Field


class UserTopicMastery(SQLModel, table=True):
    __tablename__ = "user_topic_mastery"

    user_id: int = Field(
        foreign_key="users.id",
        primary_key=True
    )

    topic_id: int = Field(
        foreign_key="topics.id",
        primary_key=True
    )

    mastery_score: float = Field(default=0.0, ge=0, le=1)
    total_attempts: int = Field(default=0, ge=0)
    correct_attempts: int = Field(default=0, ge=0)
    consecutive_errors: int = Field(default=0, ge=0)

    last_practiced_at: datetime | None = None
