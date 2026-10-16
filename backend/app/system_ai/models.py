from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class AIConversation(SQLModel, table=True):
    __tablename__ = "ai_conversations"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    title: str = "Percakapan baru"
    topic_id: int | None = Field(default=None, foreign_key="topics.id")
    lesson_id: int | None = Field(default=None, foreign_key="lessons.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)


class AIMessage(SQLModel, table=True):
    __tablename__ = "ai_messages"

    id: int | None = Field(default=None, primary_key=True)
    conversation_id: str = Field(foreign_key="ai_conversations.id", index=True)
    role: str
    text: str
    sources: list[dict] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    retrieval: str | None = None
    generator: str | None = None
    confidence: float | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
