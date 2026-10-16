# Backend

Use Python 3.10+ and run commands from `backend/`. For a fresh installation:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

`requirements.txt` contains the API's runtime dependencies: FastAPI, Uvicorn,
WebSocket support, SQLModel/SQLAlchemy, Pydantic, JWT authentication, Argon2 password
hashing, and dotenv configuration. Required transitive packages are installed
automatically. SQLite and the unittest test runner are included with Python;
ROS packages are not needed.

If your environment was installed from the old requirements, use a new virtual
environment to avoid retaining those unrelated packages.
If your terminal sources ROS, it may also expose ROS packages through `PYTHONPATH`
even inside a virtual environment. Use a clean terminal or run `unset PYTHONPATH`
in that terminal before installing and running this backend.

Start the server with the backend virtual environment activated:

```bash
uvicorn app.main:app --reload
```

Startup creates missing database tables and seeds the Godzilla character from the
example. Existing character records are preserved. To initialize without starting
the server, run `python -m database.database`.

## Password storage

Registration stores a randomly salted Argon2id hash in `users.password_hash`.
Plaintext passwords and reversible password encryption are not stored. Login
verifies the supplied password against that hash and upgrades outdated Argon2
parameters after successful verification. Unsupported or malformed stored hashes
are rejected with the same `401` response as incorrect credentials.

Password hashes are excluded from user-model serialization and account API
responses. Existing Argon2 hashes remain compatible; no database migration is
needed.

## Character API

| Method | Path | Authentication | Result |
| --- | --- | --- | --- |
| GET | `/api/v1/characters` | Public | Character catalogue, with `owned: false` |
| GET | `/api/v1/characters/{character_id}` | Public | One catalogue character, with `owned: false` |
| GET | `/api/v1/player/me/characters` | Bearer token | Entire catalogue with the current player's ownership |
| GET | `/api/v1/player/me/characters/{character_id}` | Bearer token | One character with the current player's ownership |

List endpoints return a JSON array ordered by string ID. Both support exact-match
`universe`, `rarity`, and `role` filters, plus `offset` (default `0`, minimum `0`)
and `limit` (default `100`, range `1`–`100`). The player list also accepts
`owned=true` or `owned=false`; omit it to include both. Unknown IDs return `404`;
invalid pagination returns `422`.

Authenticate through `/api/v1/account/login` and send its access token in
`Authorization: Bearer <access_token>` for the player endpoints. Public endpoints
always return `owned: false`, even when an Authorization header is present.

```bash
curl http://localhost:8000/api/v1/characters/godzilla
curl 'http://localhost:8000/api/v1/player/me/characters?owned=true' \
  -H 'Authorization: Bearer <access_token>'
```

Response shape:

```json
{
  "id": "godzilla",
  "name": "Godzilla",
  "title": "King of The Monster",
  "universe": "Monsterverse",
  "role": "Dominator",
  "level": 18,
  "power": 1280,
  "rarity": "Legendary",
  "color": "gold",
  "owned": false
}
```

`characters` stores catalogue fields, including level and power. `player_characters`
stores ownership using a unique `(user_id, character_id)` pair with foreign keys.
New users begin without owned characters; the example's `owned: true` applies only
after ownership is granted to that account. Catalogue stats are shared across users.

Trusted backend code can add catalogue entries using
`session.add(Character(...))` from `app.types.character`, or grant ownership using
`grant_character(session, user_id, character_id)` from `app.characters.service`.
The grant helper is idempotent and leaves the commit to its caller, allowing grants
to share a transaction with future rewards or purchases. These mutations are not
exposed as public API actions.

Interactive API documentation is available at `/docs`.

## Multiplayer battles

The real-time 1v1 engine and services live in `app/logic/multiplayer/`. HTTP room
commands and the WebSocket state stream are exposed under `/api/v1/multiplayer`.
See [the multiplayer API guide](app/logic/multiplayer/README.md) for room setup,
authentication, gameplay commands, synchronization, and results.

Run one backend worker: live rooms are in memory. Starting a match requires ten
valid four-option questions in the existing database. Frontend changes are not
required for the backend implementation.

## Tests

Install the development dependencies and run:

```bash
pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```

Tests use temporary SQLite databases and leave local player data intact.
