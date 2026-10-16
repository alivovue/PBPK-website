# AURI AI integration

The browser calls FastAPI at `/api/v1/system-ai`. This service manages account
ownership, SQLite conversation history, lesson context, request limits, and
the lifecycle of the supplied `backend/chatbot` runtime. The private Node bridge
runs on `127.0.0.1:3001`; IndoBERT runs on `127.0.0.1:3010`. Neither serves the
frontend or needs browser CORS access.

## Run locally

Use Node.js **22.12+** and the backend Python virtual environment. From `backend/`:

```bash
source .venv/bin/activate
# CPU installation; choose a suitable torch build separately if using a GPU.
python -m pip install 'torch==2.10.0' --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements-ai.txt
cp .env.example .env
# Set JWT_SECRET_KEY to a random secret in .env before running the server.
uvicorn app.main:app --reload
```

Keep an existing `.env` and add the AI settings to it instead of replacing it.
`AI_NODE_BINARY` can be an absolute path when `node` on PATH is too old.
`AI_PYTHON_BINARY` defaults to the interpreter running FastAPI. Windows users
activate `.venv\Scripts\activate` and can set an absolute Python executable path.

Startup launches both workers and shutdown stops them. The first run downloads
`quarkss/indobert-base-stsb` from Hugging Face; subsequent runs use its local cache.
Set `INDOBERT_MODEL` to an absolute local model directory to use a fine-tuned
checkpoint. `HF_HOME` can select a different model-cache directory. No API key or
generative model is required. The model retrieves relevant passages; the supplied
Indonesian templates build replies from those sources.

The rest of the API starts even if Node, model dependencies, or the weights are
unavailable. Chat reports a readable `503`/`504` and never substitutes mock replies.
Social replies and the bundled module outline can work before semantic search
is ready. The status endpoint and frontend show this distinction.

For separately managed workers, set `AI_AUTOSTART=0`, configure
`AI_CHATBOT_URL`, and run `node chatbot/server.js` plus
`python chatbot/indobert_service.py` separately. The Node worker reads
`AI_SEMANTIC_URL` when semantic search runs elsewhere. Setting that variable
disables automatic semantic-worker startup unless `AI_SEMANTIC_AUTOSTART=1`.
Use one FastAPI worker for managed child processes (also required by multiplayer).

## HTTP API

All conversation endpoints require `Authorization: Bearer <access_token>`.
The server derives the user from the token; clients never submit a user ID,
history, source passages, grading results, or model settings.

| Method | Path under `/api/v1/system-ai` | Purpose |
| --- | --- | --- |
| GET | `/status` | Public bridge availability and semantic model readiness |
| GET | `/conversations?limit=50` | Current account's recent conversations, maximum 100 |
| POST | `/conversations` | Create general chat with `{}`, or scope using `lesson_id` / `topic_id` |
| GET | `/conversations/{id}?limit=100` | Conversation and latest messages; maximum 200; reports `has_older_messages` |
| POST | `/conversations/{id}/messages` | Send `{"message":"Apa itu indeks?"}` and return updated conversation/messages |
| DELETE | `/conversations/{id}` | Delete that account's conversation and messages; returns 204 |

Conversation details return `conversation`, `messages`, and
`has_older_messages`. Messages include `id`, `role` (`user` or `assistant`), `text`,
`sources`, `retrieval`, `generator`, `confidence`, and timestamps. Each source has
`text` and a similarity `score`, plus a PDF `page` or `title`, `lesson_id`, and
`topic_id`. A similarity score is not a probability of answer correctness.

Messages must contain 1–1000 non-whitespace characters. The backend sends only
the latest 12 saved messages for follow-up resolution. A failed inference saves
neither half of a turn, so retrying does not duplicate a failed question. Successful
turns are saved atomically. Each conversation is processed in order; there are at
most two inference requests in flight and 30 messages per account per minute in
each API process. `429` responses from the account limit include `Retry-After`.
Other accounts' conversation IDs return `404` on reads, writes, and deletion.

General chats search the supplied database performance-tuning PDF passages in
`chatbot/data/materials.json`. Lesson/topic chats instead retrieve from lesson
content read directly from the website database (up to 32 overlapping passages
from up to 12 lessons). A topic with no content produces an honest no-source
reply. The service does not invent material or generate new questions, grade
answers, grant EXP, or change mastery. Existing graph recommendations remain
authoritative; the frontend's **Bahas dengan AURI** opens a chat scoped to that topic.

## Verification

```bash
AI_AUTOSTART=0 python -m unittest discover -s tests -v
node chatbot/tests/run-audit.js
# Optional quality evaluation with the real model worker running:
node chatbot/tests/evaluate-retrieval.js --mode=indobert
```

API tests use isolated temporary databases and a controlled inference transport.
The chatbot tests cover source metadata, follow-ups, unavailable models, and
no-source replies in addition to the original intent/retrieval tests.
