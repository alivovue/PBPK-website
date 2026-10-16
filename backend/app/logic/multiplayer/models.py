from dataclasses import dataclass, field

from .rules import Action, INITIAL_HP


class BattleError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


@dataclass(frozen=True)
class Identity:
    user_id: int
    username: str
    display_name: str | None = None


@dataclass(frozen=True)
class Option:
    id: int
    text: str


@dataclass(frozen=True)
class Question:
    id: int
    text: str
    options: tuple[Option, ...]
    correct_option_id: int


@dataclass(frozen=True)
class PendingQuestion:
    id: str
    action: Action
    question: Question
    started_at: float
    deadline: float


@dataclass
class Combatant:
    identity: Identity
    character: dict | None = None
    ready: bool = False
    rematch_requested: bool = False
    hp: int = INITIAL_HP
    energy: int = 0
    questions_used: int = 0
    correct_answers: int = 0
    total_damage: int = 0
    total_answer_time_ms: int = 0
    cooldowns: dict[Action, float] = field(default_factory=dict)
    deck: list[Question] = field(default_factory=list)
    pending: PendingQuestion | None = None
    last_answer: dict | None = None
    action_requests: dict[str, Action] = field(default_factory=dict)
    resolved_answers: dict[str, int | None] = field(default_factory=dict)
