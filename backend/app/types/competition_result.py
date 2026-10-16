from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class CompetitionResult(SQLModel, table=True):
    __tablename__ = "competition_results"

    entry_id: int = Field(foreign_key="competition_entries.id", primary_key=True)
    answers_json: str
    submitted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
