import asyncio
import secrets
import time
from contextlib import suppress
from dataclasses import dataclass, field

from sqlmodel import Session

from . import repository
from .engine import BattleRoom
from .models import BattleError, Identity
from .rules import Action

LOBBY_TTL = 30 * 60
RESULT_TTL = 10 * 60
MAX_ROOMS = 256


@dataclass
class LiveRoom:
    battle: BattleRoom
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    subscribers: dict[int, set[asyncio.Queue]] = field(default_factory=dict)
    last_broadcast: float = 0
    broadcast_revision: int = -1


class MultiplayerService:
    """Single-process room registry, per-room command locks, and server timers."""

    def __init__(self, clock=time.monotonic, wall_clock=time.time):
        self.clock = clock
        self.wall_clock = wall_clock
        self.rooms: dict[str, LiveRoom] = {}
        self.user_rooms: dict[int, str] = {}
        self.registry_lock = asyncio.Lock()
        self.task: asyncio.Task | None = None

    async def start(self) -> None:
        self.task = asyncio.create_task(self._run(), name="multiplayer-timers")

    async def stop(self) -> None:
        if self.task is not None:
            self.task.cancel()
            with suppress(asyncio.CancelledError):
                await self.task
        self.rooms.clear()
        self.user_rooms.clear()

    async def _run(self) -> None:
        while True:
            await asyncio.sleep(0.1)
            await self.tick()

    def _room(self, code: str) -> LiveRoom:
        room = self.rooms.get(code.strip().upper())
        if room is None:
            raise BattleError(404, "Room not found or expired")
        return room

    def _check_membership(self, user_id: int, code: str | None = None) -> None:
        current = self.rooms.get(self.user_rooms.get(user_id))
        if current and current.battle.code != code and current.battle.status in ("waiting", "active"):
            raise BattleError(409, "Leave your existing room before joining another")

    @staticmethod
    def _enqueue(queue: asyncio.Queue, message: dict) -> None:
        if queue.full():
            queue.get_nowait()
        queue.put_nowait(message)

    def _broadcast(self, room: LiveRoom, now: float) -> None:
        for user_id, queues in room.subscribers.items():
            if user_id not in room.battle.players:
                continue
            message = {"type": "state", "state": room.battle.snapshot(user_id, now)}
            for queue in queues:
                self._enqueue(queue, message)
        room.last_broadcast = now
        room.broadcast_revision = room.battle.revision

    def _release(self, room: LiveRoom) -> None:
        for user_id in room.battle.players:
            if self.user_rooms.get(user_id) == room.battle.code:
                self.user_rooms.pop(user_id, None)
        self.rooms.pop(room.battle.code, None)

    async def create(self, identity: Identity, topic_id: int | None, session: Session) -> dict:
        await asyncio.to_thread(repository.require_topic, session, topic_id)
        async with self.registry_lock:
            self._check_membership(identity.user_id)
            if len(self.rooms) >= MAX_ROOMS:
                raise BattleError(503, "Room capacity reached; try again later")
            alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
            code = "".join(secrets.choice(alphabet) for _ in range(6))
            while code in self.rooms:
                code = "".join(secrets.choice(alphabet) for _ in range(6))
            now = self.clock()
            battle = BattleRoom(code, identity, now, self.wall_clock(), topic_id)
            self.rooms[code] = LiveRoom(battle)
            self.user_rooms[identity.user_id] = code
            return battle.snapshot(identity.user_id, now)

    async def join(self, code: str, identity: Identity) -> dict:
        async with self.registry_lock:
            room = self._room(code)
            async with room.lock:
                if self.rooms.get(room.battle.code) is not room:
                    raise BattleError(404, "Room not found or expired")
                self._check_membership(identity.user_id, room.battle.code)
                now = self.clock()
                room.battle.advance(now)
                room.battle.join(identity, now)
                self.user_rooms[identity.user_id] = room.battle.code
                self._broadcast(room, now)
                return room.battle.snapshot(identity.user_id, now)

    async def operate(self, code: str, user_id: int, command: str = "state", *,
                      session: Session | None = None, **data) -> dict:
        room = self._room(code)
        async with room.lock:
            battle = room.battle
            battle.member(user_id)
            if battle.status == "closed":
                raise BattleError(410, "Room is closed")
            now = self.clock()
            revision = battle.revision
            try:
                battle.advance(now)
                if command == "character":
                    battle.require_status("waiting")
                    character = await asyncio.to_thread(repository.character_data, session, data["character_id"])
                    now = self.clock()
                    battle.select_character(user_id, character, now)
                elif command == "ready":
                    battle.require_status("waiting")
                    pool = await asyncio.to_thread(repository.question_pool, session, battle.topic_id) if data["ready"] else []
                    now = self.clock()
                    battle.set_ready(user_id, data["ready"], pool, now)
                elif command == "action":
                    battle.select_action(user_id, Action(data["action"]), data["request_id"], now)
                elif command == "answer":
                    battle.answer(user_id, data["attempt_id"], data["selected_option_id"], now)
                elif command == "rematch":
                    for participant_id in battle.players:
                        self._check_membership(participant_id, battle.code)
                    battle.request_rematch(user_id, now)
                    if battle.status == "waiting":
                        for participant_id in battle.players:
                            self.user_rooms[participant_id] = battle.code
                elif command != "state":
                    raise ValueError(f"Unknown battle command: {command}")
                return battle.snapshot(user_id, now)
            finally:
                if battle.revision != revision:
                    self._broadcast(room, now)

    async def leave(self, code: str, user_id: int) -> dict:
        room = self._room(code)
        async with room.lock:
            now = self.clock()
            room.battle.member(user_id)
            room.battle.advance(now)
            room.battle.leave(user_id, now)
            self._broadcast(room, now)
            for queue in room.subscribers.pop(user_id, set()):
                self._enqueue(queue, {"type": "room_closed", "reason": "left_room"})
            if self.user_rooms.get(user_id) == room.battle.code:
                self.user_rooms.pop(user_id, None)
            if room.battle.status == "closed":
                self._release(room)
            return {"room_code": room.battle.code, "left": True}

    async def subscribe(self, code: str, user_id: int) -> asyncio.Queue:
        room = self._room(code)
        async with room.lock:
            room.battle.member(user_id)
            now = self.clock()
            room.battle.advance(now)
            queue = asyncio.Queue(maxsize=32)
            room.subscribers.setdefault(user_id, set()).add(queue)
            self._enqueue(queue, {"type": "state", "state": room.battle.snapshot(user_id, now)})
            return queue

    async def unsubscribe(self, code: str, user_id: int, queue: asyncio.Queue) -> None:
        room = self.rooms.get(code.strip().upper())
        if room is not None:
            async with room.lock:
                queues = room.subscribers.get(user_id, set())
                queues.discard(queue)
                if not queues:
                    room.subscribers.pop(user_id, None)

    async def tick(self) -> None:
        # A lobby loading its question bank must not stall other rooms' timers.
        for room in list(self.rooms.values()):
            if room.lock.locked():
                continue
            async with room.lock:
                now = self.clock()
                battle = room.battle
                battle.advance(now)
                expired = (
                    battle.status == "waiting" and now - battle.updated_at >= LOBBY_TTL
                    or battle.status == "finished" and now - battle.finished_at >= RESULT_TTL
                )
                if expired:
                    battle.status = "closed"
                    battle.emit("room_closed", now, reason="expired")
                if battle.revision != room.broadcast_revision or now - room.last_broadcast >= 1:
                    self._broadcast(room, now)
                if battle.status == "closed":
                    self._release(room)
