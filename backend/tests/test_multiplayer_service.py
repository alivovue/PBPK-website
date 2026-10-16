import asyncio
from unittest import IsolatedAsyncioTestCase

from app.logic.multiplayer.models import BattleError, Identity
from app.logic.multiplayer.service import LOBBY_TTL, RESULT_TTL, MultiplayerService
from tests.multiplayer_support import FakeClock, questions


class MultiplayerServiceTests(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.clock = FakeClock()
        self.service = MultiplayerService(clock=self.clock, wall_clock=lambda: 1700000000)
        self.addAsyncCleanup(self.service.stop)

    async def room(self, active=False):
        state = await self.service.create(Identity(1, "alice"), None, None)
        code = state["room_code"]
        await self.service.join(code, Identity(2, "bob"))
        if active:
            battle = self.service.rooms[code].battle
            for user_id in (1, 2):
                battle.select_character(user_id, {"id": "godzilla"}, self.clock())
                battle.set_ready(user_id, True, questions(), self.clock())
        return code

    async def test_lobby_expiry_closes_subscriptions_and_releases_members(self):
        code = await self.room()
        queue = await self.service.subscribe(code, 1)
        await queue.get()
        self.clock.advance(LOBBY_TTL)
        await self.service.tick()
        self.assertEqual((await queue.get())["state"]["status"], "closed")
        self.assertEqual(self.service.user_rooms, {})
        with self.assertRaises(BattleError):
            await self.service.operate(code, 1)
        self.assertEqual((await self.service.create(Identity(1, "alice"), None, None))["status"], "waiting")

    async def test_results_expire_after_retention_window(self):
        code = await self.room(active=True)
        self.clock.advance(180)
        await self.service.tick()
        self.assertEqual((await self.service.operate(code, 1))["status"], "finished")
        self.clock.advance(RESULT_TTL)
        await self.service.tick()
        self.assertNotIn(code, self.service.rooms)
        self.assertEqual(self.service.user_rooms, {})

    async def test_slow_subscribers_have_bounded_queues_and_receive_latest_result(self):
        code = await self.room(active=True)
        queue = await self.service.subscribe(code, 1)
        for user_id in (1, 2):
            for index in range(10):
                await self.service.operate(code, user_id, "action", action="basic",
                                           request_id=f"{user_id}-request-{index}")
                pending = self.service.rooms[code].battle.players[user_id].pending
                self.clock.advance(0.1)
                await self.service.operate(code, user_id, "answer", attempt_id=pending.id,
                                           selected_option_id=pending.question.correct_option_id + 1)
        self.assertLessEqual(queue.qsize(), 32)
        latest = None
        while not queue.empty():
            latest = queue.get_nowait()
        self.assertEqual(latest["state"]["status"], "finished")
        self.assertEqual(latest["state"]["result"]["reason"], "question_limit")

    async def test_guest_leave_closes_only_their_subscription(self):
        code = await self.room()
        host = await self.service.subscribe(code, 1)
        guest = await self.service.subscribe(code, 2)
        await host.get()
        await guest.get()
        await self.service.leave(code, 2)
        self.assertEqual((await guest.get())["type"], "room_closed")
        self.assertEqual(len((await host.get())["state"]["players"]), 1)
        self.assertEqual(self.service.user_rooms, {1: code})

    async def test_rematch_cannot_restore_an_old_room_when_player_joined_another(self):
        code = await self.room(active=True)
        self.clock.advance(180)
        await self.service.tick()
        new = await self.service.create(Identity(1, "alice"), None, None)
        with self.assertRaisesRegex(BattleError, "existing room"):
            await self.service.operate(code, 2, "rematch")
        self.assertEqual(self.service.user_rooms[1], new["room_code"])
        self.assertEqual(self.service.rooms[code].battle.status, "finished")

    async def test_background_task_is_cancelled_on_shutdown(self):
        await self.room()
        await self.service.start()
        task = self.service.task
        await self.service.stop()
        self.assertTrue(task.done())
        self.assertEqual(self.service.rooms, {})

    async def test_rejected_command_cannot_hide_a_timer_transition(self):
        code = await self.room(active=True)
        queue = await self.service.subscribe(code, 1)
        await self.service.operate(code, 1, "action", action="basic", request_id="request-123")
        self.clock.advance(14.5)
        await self.service.tick()
        while not queue.empty():
            queue.get_nowait()
        self.clock.advance(0.5)
        with self.assertRaises(BattleError):
            await self.service.leave(code, 1)
        await self.service.tick()
        message = await asyncio.wait_for(queue.get(), timeout=0.5)
        self.assertEqual(message["state"]["players"][0]["questions_used"], 1)

    async def test_busy_room_does_not_block_other_rooms_timers(self):
        first = await self.room(active=True)
        second = (await self.service.create(Identity(3, "charlie"), None, None))["room_code"]
        await self.service.join(second, Identity(4, "diana"))
        battle = self.service.rooms[second].battle
        for user_id in (3, 4):
            battle.select_character(user_id, {"id": "godzilla"}, self.clock())
            battle.set_ready(user_id, True, questions(), self.clock())
        await self.service.operate(second, 3, "action", action="basic", request_id="request-123")
        self.clock.advance(15)
        async with self.service.rooms[first].lock:
            await asyncio.wait_for(self.service.tick(), timeout=0.5)
        self.assertEqual(battle.players[3].questions_used, 1)
