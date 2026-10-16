from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class Subject(SQLModel, table=True):
    __tablename__ = "subjects"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    description: str = ""


class Topic(SQLModel, table=True):
    __tablename__ = "topics"

    id: int | None = Field(default=None, primary_key=True)
    subject_id: int = Field(
        foreign_key="subjects.id",
        index=True
    )

    name: str
    description: str = ""
    grade_level: int = Field(default=7, ge=1, le=12)
    difficulty: int = Field(default=1, ge=1, le=5)


class TopicPrerequisite(SQLModel, table=True):
    __tablename__ = "topic_prerequisites"

    topic_id: int = Field(
        foreign_key="topics.id",
        primary_key=True
    )

    prerequisite_topic_id: int = Field(
        foreign_key="topics.id",
        primary_key=True
    )


class Lesson(SQLModel, table=True):
    __tablename__ = "lessons"

    id: int | None = Field(default=None, primary_key=True)
    topic_id: int = Field(
        foreign_key="topics.id",
        index=True
    )

    title: str
    content: str
    lesson_order: int = 0
    exp_reward: int = Field(default=10, ge=0)


class LessonCompletion(SQLModel, table=True):
    __tablename__ = "lesson_completions"

    user_id: int = Field(
        foreign_key="users.id",
        primary_key=True
    )

    lesson_id: int = Field(
        foreign_key="lessons.id",
        primary_key=True
    )

    completed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
