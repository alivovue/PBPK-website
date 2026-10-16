# Multiplayer v0.3

This package owns battle rules and state. `engine.py` is a synchronous state
machine; `service.py` serializes commands per room, manages room membership,
publishes personalized snapshots, and advances timers in a background task.
`repository.py` reads the existing character and question tables. The thin
transport adapter is `app/routers/multiplayer.py`.

## Running

Run the backend with **one worker**:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

Rooms, question assignments, idempotency records, and match results are held in
memory. Restarting or reloading the process clears them. Multiple workers or
multiple server instances require a shared room store and message broker; this
prototype deliberately does not introduce them. Idle lobbies expire after
30 minutes; completed rooms retain their results for 10 minutes, unless a member
leaves and closes the room. There are at most 256 rooms in a process.

A match needs at least **10 valid multiple-choice questions** in the existing
database, optionally restricted to the room's `topic_id`. Each usable question
must have exactly four nonempty options and exactly one correct option.
Malformed questions are excluded; insufficient content returns `409` when the
second player readies, leaving the lobby intact. No placeholder questions are
inserted into the database.

Any character from the existing catalogue can be selected. Character stats are
display metadata; all combatants start at 100 HP and 0 Energy and use the same
four actions. This prototype does not add ownership gates, inventory, equipment,
character skills, rewards, ranked play, matchmaking, or learning-progress writes.

## HTTP API

All paths below are under `/api/v1/multiplayer`. Except for `GET /config`, all
requests require the existing account bearer token in `Authorization`.
The authenticated account determines the actor; clients cannot submit player IDs,
HP, Energy, correct-answer flags, damage, elapsed time, or winner fields.

| Method | Path | JSON body | Result |
| --- | --- | --- | --- |
| GET | `/config` | — | Authoritative action values and limits |
| POST | `/rooms` | `{}` or `{"topic_id": 1}` | Create a private lobby; returns `201` |
| POST | `/rooms/{code}/join` | — | Join as the second player |
| GET | `/rooms/{code}` | — | Personalized current state and result |
| POST | `/rooms/{code}/character` | `{"character_id": "godzilla"}` | Select character; clears your Ready flag |
| POST | `/rooms/{code}/ready` | `{"ready": true}` | Ready/unready; starts when both are Ready |
| POST | `/rooms/{code}/actions` | `{"action": "basic", "request_id": "unique-request-id"}` | Select action and receive a question |
| POST | `/rooms/{code}/answers` | `{"attempt_id": "issued-attempt-id", "selected_option_id": 12}` | Grade and immediately resolve action |
| POST | `/rooms/{code}/rematch` | — | Vote to play again; both votes reset the lobby |
| POST | `/rooms/{code}/leave` | — | Leave a lobby or completed room |

Room codes are six characters and are case-insensitive. A player can occupy only
one waiting/active room. Joining the same room again does not consume another
slot. Only members can inspect or control a room. Spectators are not supported.
Both players may select the same character. A departing guest releases their
lobby slot and clears the host's Ready flag; a departing host closes the lobby.

Every state response contains `room_code`, `you`, `status`, `match_id`, `revision`,
`server_time`, `match_deadline_at`, `remaining_ms`, `players`, `result`,
`previous_result`, and `recent_events`. Each player's state includes HP, Energy,
question progress, answer statistics, current phase, and server-calculated
availability/cooldown for each action. Only your own state includes the contents
of `pending_question` and `last_answer`; the opponent's question and all answer
keys stay private. The HTTP response model represents absent private fields as
`null`.

Action identifiers are `basic`, `special`, `regen`, and `ultimate`. Their damage,
healing, Energy cost, and cooldown are returned by `/config`. Choosing an action
does not spend Energy or start cooldown. A correct answer subtracts its cost,
executes damage/healing, then adds one Energy capped at five and starts cooldown
at the server's resolution time. Wrong answers and timeouts spend one question
without spending/gaining Energy or starting cooldown. Regeneration is unavailable
at full HP. HP remains within 0–100; total damage counts actual HP removed.

Send a unique `request_id` for each new action selection. Retrying the same ID
with the same action returns the current snapshot without issuing another
question, including after that action has resolved. Reusing it for a different
action returns `409`. Answers are bound to a server-generated `attempt_id`:
identical retries have no additional effect; different options on an already
resolved attempt and answers to expired attempts return `409`. An option from
another question returns `422` and leaves the pending question intact.

## Real-time state stream

Connect to:

```text
ws://localhost:8000/api/v1/multiplayer/rooms/{code}/ws
```

Use `wss://` on an HTTPS deployment. Authenticate with the first message, within
five seconds; tokens are never placed in the URL:

```json
{"type": "authenticate", "token": "<existing account access token>"}
```

The server sends an initial personalized snapshot, pushes transitions immediately,
and sends a heartbeat snapshot approximately once per second:

```json
{
  "type": "state",
  "state": {
    "room_code": "ABC234",
    "you": 1,
    "status": "active",
    "revision": 12,
    "server_time": 1800000000.0,
    "remaining_ms": 177000,
    "players": [],
    "recent_events": []
  }
}
```

The example abbreviates the state; the actual snapshot has the same fields as
the HTTP state response. Send game commands through the HTTP endpoints while
keeping this stream open. No command waits for the opponent to answer. The socket
also accepts `{"type": "ping"}` and replies with `{"type": "pong"}`.

Use `revision` to discard stale snapshots. `recent_events` contains the last
50 events, with monotonically increasing `id`, `type`, and epoch-seconds `at`.
Deduplicate by event ID. For animation, `action_selected` identifies the actor and
action; `action_resolved` includes `actor_id`, `target_id`, `action`, `correct`,
`timed_out`, `damage`, and `healing`. `match_started`, `match_finished`, lobby,
and rematch events are also published. Render the authoritative HP/Energy in the
snapshot rather than applying damage again on the client.

Slow subscribers have bounded queues; old messages can be replaced by newer full
snapshots. Reconnecting always returns current state. A disconnected player is
not forfeited and does not pause the match or their question timer. Browser
Origins follow the existing `CORS_ORIGINS` allowlist. Invalid/expired socket
authentication closes with `4401`, nonmembers with `4403`, missing rooms with
`4404`, oversized messages with `1009`, and normal room closure with `1000`.

## Timers, results, and rematches

The server uses a monotonic clock for all gameplay and checks expirations every
100 ms, as well as before processing commands. Public timestamps are epoch seconds;
durations and remaining time use milliseconds. A question expires at 15 seconds;
an answer arriving exactly at its deadline is late. Timeout statistics use the
actual deadline, even if the timer task runs later. Cooldowns use real seconds.

Each player has an independently shuffled ten-question deck, with no repeated
question ID within their match. Questions can overlap between opponents. Only one
question can be pending per player. Resolving or timing out consumes the next
slot. A player who finishes all ten cannot select more actions; the opponent can
continue. The match ends on knockout, after 180 seconds, or once both players
have resolved ten questions.

Results compare HP, then correct-answer count, then lower total answer time;
an exact tie is a Draw. Total/average answer time includes resolved correct,
incorrect, and timed-out questions, measured to millisecond precision. A question
that expires at or before the match deadline is resolved as a timeout. Any other
question still pending at knockout or the match deadline is canceled and does
not enter answer statistics.

`result` includes each participant's `victory`/`defeat`/`draw`, final HP, correct
answers, questions used, total damage, total answer time, and average answer time.
Leaving an active match is rejected; disconnecting continues under the same end
conditions. One rematch vote preserves the result. Once both vote, HP, Energy,
cooldowns, question progress, and Ready flags reset; characters remain selected
and the last result moves to `previous_result`. Both must Ready again for a new
match ID and fresh decks.

## Tests

From `backend/`:

```bash
python -m unittest discover -s tests -v
```

Tests cover pure combat rules with a controllable clock, HTTP authentication and
validation, concurrent duplicate submissions, two-client WebSocket broadcasts,
automatic timers, private questions, bounded queues, rematches, and room cleanup.
They use temporary databases and do not modify local player data.
