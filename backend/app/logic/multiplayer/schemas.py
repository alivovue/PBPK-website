from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.types.character import CharacterBase
from .rules import Action


class Command(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CreateRoom(Command):
    topic_id: int | None = Field(default=None, gt=0)


class SelectCharacter(Command):
    character_id: str = Field(min_length=1, max_length=100)


class SetReady(Command):
    ready: bool = True


class SelectAction(Command):
    action: Action
    request_id: str = Field(min_length=8, max_length=100)


class SubmitAnswer(Command):
    attempt_id: str = Field(min_length=1, max_length=100)
    selected_option_id: int = Field(gt=0, strict=True)


class SocketAuthentication(Command):
    type: Literal["authenticate"]
    token: str = Field(min_length=1, max_length=4000)


class QuestionOption(BaseModel):
    id: int
    text: str


class PendingQuestion(BaseModel):
    attempt_id: str
    action: Action
    question_id: int
    question_text: str
    options: list[QuestionOption]
    deadline_at: float
    remaining_ms: int


class ActionAvailability(BaseModel):
    available: bool
    blocked_reason: str | None
    cooldown_remaining_ms: int


class AnswerResolution(BaseModel):
    attempt_id: str
    action: Action
    correct: bool
    timed_out: bool
    answer_time_ms: int
    damage: int
    healing: int


class PlayerState(BaseModel):
    user_id: int
    username: str
    display_name: str | None
    character: CharacterBase | None
    ready: bool
    rematch_requested: bool
    hp: int
    energy: int
    questions_used: int
    correct_answers: int
    total_damage: int
    total_answer_time_ms: int
    phase: str
    pending_action: Action | None
    actions: dict[Action, ActionAvailability]
    pending_question: PendingQuestion | None = None
    last_answer: AnswerResolution | None = None


class PlayerResult(BaseModel):
    user_id: int
    outcome: Literal["victory", "defeat", "draw"]
    final_hp: int
    questions_used: int
    correct_answers: int
    total_damage: int
    total_answer_time_ms: int
    average_answer_time_ms: float


class MatchResult(BaseModel):
    match_id: str
    reason: Literal["knockout", "time_limit", "question_limit"]
    winner_id: int | None
    ended_at: float
    players: list[PlayerResult]


class RoomState(BaseModel):
    room_code: str
    host_id: int
    you: int
    topic_id: int | None
    status: Literal["waiting", "active", "finished", "closed"]
    match_id: str | None
    revision: int
    server_time: float
    match_deadline_at: float | None
    remaining_ms: int
    players: list[PlayerState]
    result: MatchResult | None
    previous_result: MatchResult | None
    recent_events: list[dict]
