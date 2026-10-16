from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class Exam(SQLModel, table=True):
    __tablename__ = "exams"

    id: int | None = Field(default=None, primary_key=True)
    title: str

    required_rank_id: int = Field(foreign_key="ranks.id")
    target_rank_id: int = Field(foreign_key="ranks.id")

    passing_score: float = Field(default=0.7, ge=0, le=1)
    time_limit_seconds: int = Field(default=1800, gt=0)


class ExamQuestion(SQLModel, table=True):
    __tablename__ = "exam_questions"

    exam_id: int = Field(
        foreign_key="exams.id",
        primary_key=True
    )

    question_id: int = Field(
        foreign_key="questions.id",
        primary_key=True
    )

    question_order: int = 0


class ExamAttempt(SQLModel, table=True):
    __tablename__ = "exam_attempts"

    id: int | None = Field(default=None, primary_key=True)

    user_id: int = Field(
        foreign_key="users.id",
        index=True
    )

    exam_id: int = Field(foreign_key="exams.id")

    score: float | None = None
    passed: bool | None = None

    started_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    completed_at: datetime | None = None
