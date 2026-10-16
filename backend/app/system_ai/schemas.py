from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ConversationBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    topic_id: int | None = Field(default=None, gt=0)
    lesson_id: int | None = Field(default=None, gt=0)


class MessageBody(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    message: str = Field(min_length=1, max_length=1000)


class Source(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    page: int | None = Field(default=None, gt=0)
    title: str | None = Field(default=None, max_length=300)
    lesson_id: int | None = Field(default=None, gt=0)
    topic_id: int | None = Field(default=None, gt=0)
    score: float = Field(ge=-1, le=1)


class ChatReply(BaseModel):
    reply: str = Field(min_length=1, max_length=20000)
    sources: list[Source] = Field(default_factory=list, max_length=3)
    retrieval: Literal["indobert-semantic", "material-outline", "chat"]
    generator: Literal["template-local"]
    confidence: float | None = Field(default=None, ge=-1, le=1)
