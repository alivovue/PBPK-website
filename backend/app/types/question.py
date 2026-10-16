from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from sqlalchemy import Index


class Question(SQLModel, table=True):
    __tablename__ = "questions"

    id: int | None = Field(default=None, primary_key=True)

    topic_id: int = Field(
        foreign_key="topics.id",
        index=True
    )

    question_text: str
    question_type: str = "multiple_choice"
    difficulty: int = Field(default=1, ge=1, le=5)
    explanation: str = ""
    exp_reward: int = Field(default=10, ge=0)


class QuestionOption(SQLModel, table=True):
    __tablename__ = "question_options"

    id: int | None = Field(default=None, primary_key=True)

    question_id: int = Field(
        foreign_key="questions.id",
        index=True
    )

    option_text: str
    is_correct: bool = False
    option_order: int = 0


class QuestionAttempt(SQLModel, table=True):
    __tablename__ = "question_attempts"

    __table_args__ = (
        Index("ix_attempts_user_time", "user_id", "attempted_at"),
    )

    id: int | None = Field(default=None, primary_key=True)
    submission_id: str = Field(unique=True)

    user_id: int = Field(foreign_key="users.id")
    question_id: int = Field(foreign_key="questions.id")

    selected_option_id: int = Field(
        foreign_key="question_options.id"
    )

    is_correct: bool
    exp_awarded: int = Field(default=0, ge=0)

    exam_attempt_id: int | None = Field(
        default=None,
        foreign_key="exam_attempts.id"
    )

    attempted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
