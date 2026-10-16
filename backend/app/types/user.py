from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str | None = Field(default=None, exclude=True)
    display_name: str | None = None
    school_grade: int = Field(default=7, ge=1, le=12)
    is_active: bool = True
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
