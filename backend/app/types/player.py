from datetime import date
from sqlmodel import SQLModel, Field


class PlayerProfile(SQLModel, table=True):
    __tablename__ = "player_profiles"

    user_id: int = Field(
        foreign_key="users.id",
        primary_key=True
    )

    rank_id: int = Field(
        default=1,
        foreign_key="ranks.id"
    )

    level: int = Field(default=1, ge=1)
    total_exp: int = Field(default=0, ge=0)
    currency_balance: int = Field(default=0, ge=0)

    current_streak: int = Field(default=0, ge=0)
    longest_streak: int = Field(default=0, ge=0)
    last_activity_date: date | None = None
