from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from sqlalchemy import Index, UniqueConstraint


class Competition(SQLModel, table=True):
    __tablename__ = "competitions"

    id: int | None = Field(default=None, primary_key=True)
    title: str
    description: str = ""

    minimum_rank_id: int = Field(foreign_key="ranks.id")
    reward_currency: int = Field(default=0, ge=0)

    starts_at: datetime
    ends_at: datetime


class CompetitionQuestion(SQLModel, table=True):
    __tablename__ = "competition_questions"

    competition_id: int = Field(
        foreign_key="competitions.id",
        primary_key=True
    )

    question_id: int = Field(
        foreign_key="questions.id",
        primary_key=True
    )


class CompetitionEntry(SQLModel, table=True):
    __tablename__ = "competition_entries"

    __table_args__ = (
        UniqueConstraint("competition_id", "user_id"),
        Index("ix_competition_score", "competition_id", "score"),
    )

    id: int | None = Field(default=None, primary_key=True)

    competition_id: int = Field(
        foreign_key="competitions.id"
    )

    user_id: int = Field(foreign_key="users.id")

    score: float = 0.0
    placement: int | None = None
    currency_awarded: int = 0

    joined_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class CurrencyTransaction(SQLModel, table=True):
    __tablename__ = "currency_transactions"

    id: int | None = Field(default=None, primary_key=True)

    user_id: int = Field(
        foreign_key="users.id",
        index=True
    )

    amount: int
    reason: str

    idempotency_key: str | None = Field(
        default=None,
        unique=True
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
