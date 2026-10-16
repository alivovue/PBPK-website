from dataclasses import asdict, dataclass
from enum import Enum

INITIAL_HP = 100
MAX_ENERGY = 5
QUESTION_LIMIT = 10
QUESTION_SECONDS = 15
MATCH_SECONDS = 180


class Action(str, Enum):
    BASIC = "basic"
    SPECIAL = "special"
    REGEN = "regen"
    ULTIMATE = "ultimate"


@dataclass(frozen=True)
class ActionRule:
    damage: int
    healing: int
    energy_cost: int
    cooldown_seconds: int


ACTIONS = {
    Action.BASIC: ActionRule(12, 0, 0, 2),
    Action.SPECIAL: ActionRule(24, 0, 2, 10),
    Action.REGEN: ActionRule(0, 20, 0, 12),
    Action.ULTIMATE: ActionRule(40, 0, 4, 25),
}


def configuration() -> dict:
    return {
        "initial_hp": INITIAL_HP,
        "initial_energy": 0,
        "max_energy": MAX_ENERGY,
        "question_limit": QUESTION_LIMIT,
        "question_seconds": QUESTION_SECONDS,
        "match_seconds": MATCH_SECONDS,
        "actions": {action.value: asdict(rule) for action, rule in ACTIONS.items()},
    }
