# Frontend

For the complete Docker setup, run `docker compose up` from the repository root
and open **http://localhost:3000**. Nginx serves the production build and proxies
API and WebSocket requests to the backend. See [the root README](../README.md).

Use Node.js 22.12+ (required by the existing Vite toolchain):

```bash
npm ci
npm run dev
```

Run the existing backend on port `8000`. The Vite development server proxies
`/api/v1` requests to `http://127.0.0.1:8000`, so no frontend environment file is
needed for local development.

For a different API host, copy `.env.example` to `.env.local` and set
`VITE_API_BASE_URL`, including `/api/v1`, then restart Vite. For example:

```dotenv
VITE_API_BASE_URL=https://api.example.com/api/v1
```

When calling another origin directly, that frontend origin must already be allowed
by the backend's CORS configuration. In production, either provide an absolute
`VITE_API_BASE_URL` at build time or have the host proxy `/api` to the backend.
The Vite development proxy is not included in production builds.

## Data access

`src/api/routes.js` defines the existing HTTP routes; `src/api/client.js` handles JSON,
bearer authentication, abort signals, and HTTP errors. `src/hooks/useApi.js`
fetches data, cancels abandoned requests, hides stale results when the route or
account changes, and exposes retry/loading/error states.

| Screen | Existing backend data |
| --- | --- |
| Festival | Subjects, current account and player profile |
| Belajar | Subjects → topics → lessons and lesson content; question previews |
| Koleksi | Public characters or the current player's catalogue and character details |
| Arena | Owned characters and heart demons |
| Peringkat | Competitions, global EXP leaderboard, competition score leaderboards |
| Kultivasi | Player profile, ranks, topic mastery, recommendations, exams |

Public catalogues work without signing in. Use the **Masuk** button with an
existing backend account to retrieve personal data. Authentication uses
`POST /account/login`; its bearer token is kept in `sessionStorage` for that tab.
Logout clears it, and `401` responses from the account/profile reads clear an
expired session. The frontend does not decode tokens or decide access rights.

AI conversations use POST and DELETE through `/system-ai`; other data reads use GET.
No battle, grading, reward, promotion, character
grant, competition submission, or lesson completion requests are made. Views
display server-provided values, with local formatting, search, and navigation.
Features with no matching read API show an unavailable state; mock records and
client-side game rules have been removed.

Empty API results remain empty. Failed requests show an error and a retry button;
they do not fall back to fabricated content. Character and global leaderboard
lists use the backend's existing pagination. Character search applies to the
current page.

## AURI

The floating **AURI** button and Festival's **Tanya AURI** open the same API-backed
chat. Sign in to send messages, resume saved conversations, start a new one, or
delete a conversation. Replies display expandable source passages. Loading,
unavailable model, timeout, and retry states come from the backend; there are no
local response templates or inference code in the frontend.

**Tanya AURI tentang pelajaran ini** opens a lesson-scoped conversation. The
**Bahas dengan AURI** buttons on recommended topics open topic-scoped help.
Only the context ID and message are sent; the backend retrieves the material and
conversation history. Switching accounts clears the visible chat state.

The AI runtime requires the backend setup described in
[`backend/app/system_ai/README.md`](../backend/app/system_ai/README.md). No separate
frontend API host or browser connection to the model workers is needed.

## Checks

```bash
npm run check
npm test
npm run build
```

Build output stays in `frontend/dist/`. API tests use Node's built-in test runner
and require no extra packages.
