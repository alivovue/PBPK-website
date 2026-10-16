import copy
import math
import secrets
from uuid import uuid4

from .models import BattleError, Combatant, Identity, PendingQuestion, Question
from .rules import (
    ACTIONS, INITIAL_HP, MATCH_SECONDS, MAX_ENERGY,
    QUESTION_LIMIT, QUESTION_SECONDS, Action,
)


def remaining_ms(deadline: float, now: float) -> int:
    return max(0, math.ceil((deadline - now) * 1000))


class BattleRoom:
    """Pure synchronous state machine. The service serializes access to each room."""

    def __init__(self, code: str, host: Identity, now: float, wall_time: float,
                 topic_id: int | None = None):
        self.code = code
        self.host_id = host.user_id
        self.topic_id = topic_id
        self.players = {host.user_id: Combatant(host)}
        self.status = "waiting"
        self.created_at = self.updated_at = now
        self.wall_offset = wall_time - now
        self.started_at: float | None = None
        self.finished_at: float | None = None
        self.match_id: str | None = None
        self.result: dict | None = None
        self.previous_result: dict | None = None
        self.revision = 0
        self.events: list[dict] = []
        self.emit("room_created", now, actor_id=host.user_id)

    def emit(self, kind: str, now: float, **data) -> None:
        self.revision += 1
        self.updated_at = now
        self.events.append({"id": self.revision, "type": kind,
                            "at": self.wall_offset + now, **data})
        self.events = self.events[-50:]

    def member(self, user_id: int) -> Combatant:
        if user_id not in self.players:
            raise BattleError(403, "You are not a member of this room")
        return self.players[user_id]

    def require_status(self, status: str) -> None:
        if self.status != status:
            raise BattleError(409, f"Room must be {status}")

    def join(self, identity: Identity, now: float) -> None:
        if identity.user_id in self.players:
            return
        self.require_status("waiting")
        if len(self.players) == 2:
            raise BattleError(409, "Room is full")
        self.players[identity.user_id] = Combatant(identity)
        self.emit("player_joined", now, actor_id=identity.user_id)

    def select_character(self, user_id: int, character: dict, now: float) -> None:
        player = self.member(user_id)
        self.require_status("waiting")
        if player.character == character:
            return
        player.character = copy.deepcopy(character)
        player.ready = False
        self.emit("character_selected", now, actor_id=user_id,
                  character_id=character["id"])

    def set_ready(self, user_id: int, ready: bool, pool: list[Question],
                  now: float, rng=None) -> None:
        player = self.member(user_id)
        self.require_status("waiting")
        if ready and player.character is None:
            raise BattleError(409, "Choose a character before becoming ready")
        will_start = (ready and len(self.players) == 2 and
                      all(p.ready for uid, p in self.players.items() if uid != user_id))
        if will_start and len(pool) < QUESTION_LIMIT:
            raise BattleError(409, "At least 10 valid four-option questions are required")
        if player.ready != ready:
            player.ready = ready
            self.emit("ready_changed", now, actor_id=user_id, ready=ready)
        if will_start:
            rng = rng or secrets.SystemRandom()
            for participant in self.players.values():
                participant.deck = rng.sample(pool, QUESTION_LIMIT)
            self.status = "active"
            self.started_at = now
            self.match_id = str(uuid4())
            self.emit("match_started", now, match_id=self.match_id)

    def action_block(self, player: Combatant, action: Action, now: float) -> str | None:
        if self.status != "active":
            return "match_not_active"
        if player.pending:
            return "answer_pending"
        if player.questions_used >= QUESTION_LIMIT:
            return "question_limit"
        rule = ACTIONS[action]
        if now < player.cooldowns.get(action, 0):
            return "cooldown"
        if player.energy < rule.energy_cost:
            return "insufficient_energy"
        if action == Action.REGEN and player.hp == INITIAL_HP:
            return "full_hp"
        return None

    def select_action(self, user_id: int, action: Action, request_id: str,
                      now: float) -> None:
        self.advance(now)
        player = self.member(user_id)
        if request_id in player.action_requests:
            if player.action_requests[request_id] != action:
                raise BattleError(409, "Request ID already used for another action")
            return
        reason = self.action_block(player, action, now)
        if reason:
            raise BattleError(409, f"Action unavailable: {reason}")
        question = player.deck[player.questions_used]
        player.pending = PendingQuestion(str(uuid4()), action, question,
                                         now, now + QUESTION_SECONDS)
        player.action_requests[request_id] = action
        self.emit("action_selected", now, actor_id=user_id, action=action.value)

    def answer(self, user_id: int, attempt_id: str, option_id: int, now: float) -> None:
        self.advance(now)
        player = self.member(user_id)
        if attempt_id in player.resolved_answers:
            previous = player.resolved_answers[attempt_id]
            if previous is None:
                raise BattleError(409, "Question has timed out")
            if previous != option_id:
                raise BattleError(409, "Question already answered with another option")
            return
        self.require_status("active")
        pending = player.pending
        if pending is None or pending.id != attempt_id:
            raise BattleError(409, "No matching pending question")
        if option_id not in {option.id for option in pending.question.options}:
            raise BattleError(422, "Option does not belong to this question")
        self._resolve(player, option_id, now)

    def _resolve(self, player: Combatant, option_id: int | None, now: float) -> None:
        pending = player.pending
        correct = option_id is not None and option_id == pending.question.correct_option_id
        elapsed_ms = max(0, round((now - pending.started_at) * 1000))
        player.pending = None
        player.questions_used += 1
        player.total_answer_time_ms += elapsed_ms
        player.resolved_answers[pending.id] = option_id
        damage = healing = 0
        user_id = player.identity.user_id
        opponent = next(p for uid, p in self.players.items() if uid != user_id)
        if correct:
            rule = ACTIONS[pending.action]
            player.correct_answers += 1
            player.energy = min(MAX_ENERGY, player.energy - rule.energy_cost + 1)
            player.cooldowns[pending.action] = now + rule.cooldown_seconds
            damage = min(opponent.hp, rule.damage)
            healing = min(INITIAL_HP - player.hp, rule.healing)
            opponent.hp -= damage
            player.hp += healing
            player.total_damage += damage
        player.last_answer = {
            "attempt_id": pending.id, "action": pending.action.value,
            "correct": correct, "timed_out": option_id is None,
            "answer_time_ms": elapsed_ms, "damage": damage, "healing": healing,
        }
        self.emit("action_resolved", now, actor_id=user_id,
                  target_id=opponent.identity.user_id,
                  action=pending.action.value, correct=correct,
                  timed_out=option_id is None, damage=damage, healing=healing)
        if opponent.hp == 0:
            self._finish("knockout", now)
        elif all(p.questions_used == QUESTION_LIMIT for p in self.players.values()):
            self._finish("question_limit", now)

    def advance(self, now: float) -> None:
        if self.status != "active":
            return
        boundary = min(now, self.started_at + MATCH_SECONDS)
        expired = sorted(
            (p.pending.deadline, uid) for uid, p in self.players.items()
            if p.pending and p.pending.deadline <= boundary
        )
        for deadline, user_id in expired:
            if self.status == "active":
                self._resolve(self.players[user_id], None, deadline)
        if self.status == "active" and now >= self.started_at + MATCH_SECONDS:
            self._finish("time_limit", self.started_at + MATCH_SECONDS)

    def _finish(self, reason: str, now: float) -> None:
        scores = {uid: (p.hp, p.correct_answers, -p.total_answer_time_ms)
                  for uid, p in self.players.items()}
        best = max(scores.values())
        winners = [uid for uid, score in scores.items() if score == best]
        winner_id = winners[0] if len(winners) == 1 else None
        self.status = "finished"
        self.finished_at = now
        self.result = {
            "match_id": self.match_id, "reason": reason, "winner_id": winner_id,
            "ended_at": self.wall_offset + now,
            "players": [{
                "user_id": uid,
                "outcome": "draw" if winner_id is None else "victory" if uid == winner_id else "defeat",
                "final_hp": p.hp, "questions_used": p.questions_used,
                "correct_answers": p.correct_answers, "total_damage": p.total_damage,
                "total_answer_time_ms": p.total_answer_time_ms,
                "average_answer_time_ms": round(p.total_answer_time_ms / p.questions_used, 3) if p.questions_used else 0,
            } for uid, p in self.players.items()],
        }
        for player in self.players.values():
            player.pending = None
        self.emit("match_finished", now, reason=reason, winner_id=winner_id)

    def request_rematch(self, user_id: int, now: float) -> None:
        player = self.member(user_id)
        self.require_status("finished")
        if not player.rematch_requested:
            player.rematch_requested = True
            self.emit("rematch_requested", now, actor_id=user_id)
        if len(self.players) == 2 and all(p.rematch_requested for p in self.players.values()):
            self.previous_result = self.result
            self.result = None
            self.players = {uid: Combatant(p.identity, character=p.character)
                            for uid, p in self.players.items()}
            self.status = "waiting"
            self.started_at = self.finished_at = self.match_id = None
            self.emit("lobby_reset", now)

    def leave(self, user_id: int, now: float) -> None:
        self.member(user_id)
        if self.status == "active":
            raise BattleError(409, "An active match continues until its battle end condition")
        if user_id == self.host_id or self.status == "finished":
            self.status = "closed"
            self.emit("room_closed", now, actor_id=user_id)
        else:
            del self.players[user_id]
            for player in self.players.values():
                player.ready = False
            self.emit("player_left", now, actor_id=user_id)

    def snapshot(self, user_id: int, now: float) -> dict:
        self.member(user_id)
        players = []
        for uid, player in self.players.items():
            state = {
                "user_id": uid, "username": player.identity.username,
                "display_name": player.identity.display_name,
                "character": copy.deepcopy(player.character), "ready": player.ready,
                "rematch_requested": player.rematch_requested,
                "hp": player.hp, "energy": player.energy,
                "questions_used": player.questions_used,
                "correct_answers": player.correct_answers,
                "total_damage": player.total_damage,
                "total_answer_time_ms": player.total_answer_time_ms,
                "phase": self.status if self.status != "active" else "question" if player.pending else "exhausted" if player.questions_used == QUESTION_LIMIT else "action_selection",
                "pending_action": player.pending.action.value if player.pending else None,
                "actions": {action.value: {
                    "available": self.action_block(player, action, now) is None,
                    "blocked_reason": self.action_block(player, action, now),
                    "cooldown_remaining_ms": remaining_ms(player.cooldowns.get(action, 0), now),
                } for action in ACTIONS},
            }
            if uid == user_id:
                state["last_answer"] = copy.deepcopy(player.last_answer)
                state["pending_question"] = None
                if player.pending:
                    pending = player.pending
                    state["pending_question"] = {
                        "attempt_id": pending.id, "action": pending.action.value,
                        "question_id": pending.question.id,
                        "question_text": pending.question.text,
                        "options": [{"id": o.id, "text": o.text} for o in pending.question.options],
                        "deadline_at": self.wall_offset + pending.deadline,
                        "remaining_ms": remaining_ms(pending.deadline, now),
                    }
            players.append(state)
        return {
            "room_code": self.code, "host_id": self.host_id, "you": user_id,
            "topic_id": self.topic_id, "status": self.status,
            "match_id": self.match_id, "revision": self.revision,
            "server_time": self.wall_offset + now,
            "match_deadline_at": self.wall_offset + self.started_at + MATCH_SECONDS if self.started_at is not None else None,
            "remaining_ms": remaining_ms(self.started_at + MATCH_SECONDS, now) if self.status == "active" else 0,
            "players": players, "result": copy.deepcopy(self.result),
            "previous_result": copy.deepcopy(self.previous_result),
            "recent_events": copy.deepcopy(self.events),
        }
