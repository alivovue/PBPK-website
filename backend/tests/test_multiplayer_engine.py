import json
import random
from unittest import TestCase
from uuid import uuid4

from app.logic.multiplayer.engine import BattleRoom
from app.logic.multiplayer.models import BattleError, Identity
from app.logic.multiplayer.rules import Action
from tests.multiplayer_support import FakeClock, questions


class MultiplayerEngineTests(TestCase):
    def setUp(self):
        self.clock = FakeClock()
        self.pool = questions()
        self.room = BattleRoom("ABC234", Identity(1, "alice"), self.clock(), 1700000000)
        self.room.join(Identity(2, "bob"), self.clock())
        for user_id in (1, 2):
            self.room.select_character(user_id, {"id": "godzilla"}, self.clock())
        self.room.set_ready(1, True, self.pool, self.clock())
        self.room.set_ready(2, True, self.pool, self.clock(), rng=random.Random(4))

    def select(self, user_id=1, action=Action.BASIC, request_id=None):
        self.room.select_action(user_id, action, request_id or str(uuid4()), self.clock())
        return self.room.players[user_id].pending

    def resolve(self, user_id=1, action=Action.BASIC, correct=True, seconds=0.5):
        pending = self.select(user_id, action)
        self.clock.advance(seconds)
        option = pending.question.correct_option_id + (0 if correct else 1)
        self.room.answer(user_id, pending.id, option, self.clock())
        return pending

    def test_both_players_act_independently_and_damage_is_immediate(self):
        alice = self.select(1)
        bob = self.select(2)
        self.clock.advance(3)
        self.room.answer(1, alice.id, alice.question.correct_option_id, self.clock())
        self.assertEqual(self.room.players[2].hp, 88)
        self.assertEqual(self.room.players[2].pending, bob)
        self.clock.advance(2)
        self.select(1)
        self.room.answer(2, bob.id, bob.question.correct_option_id, self.clock())
        self.assertEqual(self.room.players[1].hp, 88)
        self.assertIsNotNone(self.room.players[1].pending)

    def test_success_starts_real_time_cooldown_and_correct_energy(self):
        self.resolve()
        self.assertEqual(self.room.players[1].energy, 1)
        self.clock.advance(1.999)
        with self.assertRaisesRegex(BattleError, "cooldown"):
            self.select()
        self.clock.advance(0.001)
        self.assertIsNotNone(self.select())

    def test_wrong_answer_spends_quota_without_energy_or_cooldown(self):
        self.room.players[1].energy = 2
        self.resolve(action=Action.SPECIAL, correct=False)
        player = self.room.players[1]
        self.assertEqual((player.energy, player.questions_used, player.correct_answers), (2, 1, 0))
        self.assertEqual(player.cooldowns, {})
        self.assertEqual(self.room.players[2].hp, 100)
        self.assertIsNotNone(self.select(action=Action.SPECIAL))

    def test_special_and_ultimate_cost_then_award_one_energy(self):
        for action, energy, hp in ((Action.SPECIAL, 2, 76), (Action.ULTIMATE, 4, 36)):
            self.room.players[1].energy = energy
            self.resolve(action=action)
            self.assertEqual(self.room.players[1].energy, 1)
            self.assertEqual(self.room.players[2].hp, hp)
        self.assertEqual(self.room.players[1].total_damage, 64)

    def test_energy_is_capped_at_five(self):
        self.room.players[1].energy = 5
        self.resolve()
        self.assertEqual(self.room.players[1].energy, 5)

    def test_regeneration_is_blocked_at_full_hp_and_clamped_to_100(self):
        with self.assertRaisesRegex(BattleError, "full_hp"):
            self.select(action=Action.REGEN)
        self.room.players[1].hp = 95
        self.resolve(action=Action.REGEN)
        player = self.room.players[1]
        self.assertEqual(player.hp, 100)
        self.assertEqual(player.last_answer["healing"], 5)
        self.assertEqual(player.cooldowns[Action.REGEN], self.clock() + 12)

    def test_actions_validate_energy_and_one_pending_question(self):
        for action in (Action.SPECIAL, Action.ULTIMATE):
            with self.assertRaisesRegex(BattleError, "insufficient_energy"):
                self.select(action=action)
        self.select()
        with self.assertRaisesRegex(BattleError, "answer_pending"):
            self.select()
        self.assertEqual(self.room.players[1].questions_used, 0)

    def test_question_timeout_is_automatic_and_late_answer_cannot_execute(self):
        pending = self.select()
        self.clock.advance(15)
        self.room.advance(self.clock())
        player = self.room.players[1]
        self.assertEqual((player.questions_used, player.total_answer_time_ms), (1, 15000))
        self.assertTrue(player.last_answer["timed_out"])
        self.assertEqual((player.energy, player.cooldowns), (0, {}))
        with self.assertRaisesRegex(BattleError, "timed out"):
            self.room.answer(1, pending.id, pending.question.correct_option_id, self.clock())
        self.assertEqual(self.room.players[2].hp, 100)

    def test_answer_at_question_deadline_is_timeout_even_without_timer_tick(self):
        pending = self.select()
        self.clock.advance(15)
        with self.assertRaises(BattleError):
            self.room.answer(1, pending.id, pending.question.correct_option_id, self.clock())
        self.assertEqual(self.room.players[1].questions_used, 1)
        self.assertEqual(self.room.players[2].hp, 100)

    def test_match_deadline_cancels_unfinished_question_without_damage(self):
        self.clock.advance(179)
        pending = self.select()
        self.clock.advance(1)
        with self.assertRaises(BattleError):
            self.room.answer(1, pending.id, pending.question.correct_option_id, self.clock())
        self.assertEqual(self.room.result["reason"], "time_limit")
        self.assertIsNone(self.room.result["winner_id"])
        self.assertEqual(self.room.players[1].questions_used, 0)
        self.assertIsNone(self.room.players[1].pending)

    def test_delayed_tick_uses_actual_question_deadline_for_statistics(self):
        self.select()
        self.clock.advance(200)
        self.room.advance(self.clock())
        self.assertEqual(self.room.players[1].total_answer_time_ms, 15000)
        self.assertEqual(self.room.result["ended_at"], 1700000180)

    def test_ten_questions_exhaust_one_player_without_ending_the_match(self):
        question_ids = []
        for _ in range(10):
            question_ids.append(self.resolve(correct=False, seconds=0.1).question.id)
        self.assertEqual(len(set(question_ids)), 10)
        self.assertEqual(self.room.status, "active")
        with self.assertRaisesRegex(BattleError, "question_limit"):
            self.select()
        for _ in range(10):
            self.resolve(2, correct=False, seconds=0.1)
        self.assertEqual(self.room.result["reason"], "question_limit")
        self.assertIsNone(self.room.result["winner_id"])

    def test_knockout_clamps_damage_and_stops_opponents_pending_action(self):
        self.select(2)
        for index in range(9):
            if index:
                self.clock.advance(2)
            self.resolve()
        self.assertEqual(self.room.result["reason"], "knockout")
        self.assertEqual(self.room.result["winner_id"], 1)
        self.assertEqual(self.room.players[1].total_damage, 100)
        self.assertEqual(self.room.players[1].last_answer["damage"], 4)
        self.assertIsNone(self.room.players[2].pending)
        with self.assertRaises(BattleError):
            self.select(2)

    def test_result_tiebreak_order_is_hp_correct_count_then_answer_time(self):
        alice, bob = self.room.players.values()
        alice.hp, bob.hp = 90, 80
        alice.correct_answers, bob.correct_answers = 0, 5
        self.clock.advance(180)
        self.room.advance(self.clock())
        self.assertEqual(self.room.result["winner_id"], 1)
        for correct, times, expected in (
            ((2, 3), (1000, 2000), 2),
            ((3, 3), (1000, 2000), 1),
            ((3, 3), (2000, 2000), None),
        ):
            alice.hp = bob.hp = 80
            alice.correct_answers, bob.correct_answers = correct
            alice.total_answer_time_ms, bob.total_answer_time_ms = times
            self.room._finish("time_limit", self.clock())
            self.assertEqual(self.room.result["winner_id"], expected)

    def test_invalid_options_or_opponents_attempt_do_not_spend_quota(self):
        pending = self.select()
        with self.assertRaisesRegex(BattleError, "Option"):
            self.room.answer(1, pending.id, 999999, self.clock())
        with self.assertRaisesRegex(BattleError, "matching"):
            self.room.answer(2, pending.id, pending.question.correct_option_id, self.clock())
        self.assertEqual(self.room.players[1].questions_used, 0)
        self.assertEqual(self.room.players[1].pending, pending)

    def test_retries_are_idempotent_and_conflicting_replays_are_rejected(self):
        pending = self.select(request_id="request-123")
        retried = self.select(request_id="request-123")
        self.assertEqual(pending.id, retried.id)
        with self.assertRaisesRegex(BattleError, "Request ID"):
            self.select(action=Action.REGEN, request_id="request-123")
        option = pending.question.correct_option_id
        self.room.answer(1, pending.id, option, self.clock())
        self.room.answer(1, pending.id, option, self.clock())
        self.assertEqual(self.room.players[2].hp, 88)
        self.assertEqual(self.room.players[1].questions_used, 1)
        with self.assertRaisesRegex(BattleError, "already answered"):
            self.room.answer(1, pending.id, option + 1, self.clock())

    def test_snapshots_never_expose_keys_or_opponents_question(self):
        pending = self.select(1)
        self.select(2)
        view = self.room.snapshot(1, self.clock())
        self.assertEqual(view["players"][0]["pending_question"]["attempt_id"], pending.id)
        self.assertNotIn("pending_question", view["players"][1])
        serialized = json.dumps(view)
        self.assertNotIn("correct_option_id", serialized)
        self.assertNotIn("is_correct", serialized)

    def test_rematch_requires_both_players_and_resets_stats_and_ready(self):
        first_match = self.room.match_id
        self.clock.advance(180)
        self.room.advance(self.clock())
        self.room.request_rematch(1, self.clock())
        self.assertEqual(self.room.status, "finished")
        self.room.request_rematch(2, self.clock())
        self.assertEqual(self.room.status, "waiting")
        self.assertEqual(self.room.previous_result["match_id"], first_match)
        for player in self.room.players.values():
            self.assertFalse(player.ready)
            self.assertEqual((player.hp, player.energy, player.questions_used), (100, 0, 0))
            self.assertEqual(player.character["id"], "godzilla")
        self.room.set_ready(1, True, self.pool, self.clock())
        self.room.set_ready(2, True, self.pool, self.clock())
        self.assertNotEqual(self.room.match_id, first_match)


class MultiplayerLobbyTests(TestCase):
    def test_ready_and_question_bank_requirements_are_atomic(self):
        room = BattleRoom("ABC234", Identity(1, "alice"), 0, 1000)
        with self.assertRaisesRegex(BattleError, "Choose a character"):
            room.set_ready(1, True, questions(), 0)
        room.join(Identity(2, "bob"), 0)
        for uid in (1, 2):
            room.select_character(uid, {"id": "godzilla"}, 0)
        room.set_ready(1, True, questions(), 0)
        with self.assertRaisesRegex(BattleError, "At least 10"):
            room.set_ready(2, True, questions(9), 0)
        self.assertFalse(room.players[2].ready)
        self.assertEqual(room.status, "waiting")
        room.select_character(1, {"id": "kong"}, 0)
        self.assertFalse(room.players[1].ready)

    def test_rooms_allow_two_distinct_members_and_safe_lobby_leave(self):
        room = BattleRoom("ABC234", Identity(1, "alice"), 0, 1000)
        room.join(Identity(1, "alice"), 0)
        room.join(Identity(2, "bob"), 0)
        with self.assertRaisesRegex(BattleError, "full"):
            room.join(Identity(3, "charlie"), 0)
        room.leave(2, 1)
        self.assertEqual(list(room.players), [1])
        room.leave(1, 2)
        self.assertEqual(room.status, "closed")
