from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from sqlalchemy import Index


class Rank(SQLModel, table=True):
    __tablename__ = "ranks"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    rank_order: int = Field(unique=True)
    min_level: int = Field(default=1, ge=1)
    description: str = ""
    theme_stage: int = Field(default=1, ge=1)


class HeartDemon(SQLModel, table=True):
    __tablename__ = "heart_demons"

    __table_args__ = (
        Index("ix_demons_user_status", "user_id", "status"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    topic_id: int = Field(foreign_key="topics.id")

    status: str = "active"
    trigger_mastery: float = 0.0
    required_mastery: float = 0.8

    spawned_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    defeated_at: datetime | None = None
