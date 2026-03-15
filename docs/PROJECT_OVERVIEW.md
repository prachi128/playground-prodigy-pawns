# Prodigy Pawns — Project Overview (Interview Prep)

This document explains the project functionally and technically so you can answer interview questions. It is broken into multiple phases.

---

## Phase 1: What the Product Is

**Prodigy Pawns** is a **chess learning and playing web app** ("Chess Academy Portal"): students learn basics, solve puzzles, play vs bot or vs each other, earn XP, and appear on leaderboards. Coaches can create and manage puzzles.

- **Users:** Students (main), Coaches/Admins (puzzle management, coach dashboard).
- **Core value:** "Chess is an adventure" — puzzles, beat the bot, level up, climb the leaderboard; free and gamified.

---

## Phase 2: Tech Stack (High Level)

| Layer | Technology |
|--------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4, tailwindcss-animate, class-variance-authority (cva), clsx, tailwind-merge |
| **State** | Zustand (auth + UI state); no token in JS — only `user` in memory |
| **API client** | Axios with `withCredentials: true` (cookie-based auth) |
| **Chess UI** | react-chessboard, chess.js (rules/moves) |
| **UX** | Framer Motion, react-hot-toast, Lucide icons |
| **Backend** | FastAPI (Python), Uvicorn |
| **ORM / DB** | SQLAlchemy 2, PostgreSQL (psycopg2-binary) |
| **Auth** | JWT (python-jose), bcrypt (passlib); tokens in **HttpOnly cookies** only |
| **Chess engine** | Stockfish (Python wrapper); used for analysis, hints, bot moves, puzzle validation |

**One-liner:** "Next.js frontend with cookie-based session auth talking to a FastAPI backend, PostgreSQL, and Stockfish for chess logic and puzzles."

---

## Phase 3: Architecture and Repo Layout

- **Monorepo-style:** `frontend/` (Next.js app), `backend/` (FastAPI), `docs/` (e.g. auth), plus `v0-dashboard-layout` / `v1-dashboard-layout` (dashboard/UI variants or references).
- **Auth flow:**
  - Login/signup → backend sets **access_token** (15 min) and **refresh_token** (7 days) in **HttpOnly** cookies.
  - Frontend never reads tokens; it only stores `user` from API responses in Zustand.
  - Session restore: `loadSession()` calls `GET /api/auth/me` (cookies sent automatically).
  - On 401 (except on `/api/auth/me`): frontend calls `POST /api/auth/refresh` once, retries the failed request, then redirects to `/login` if refresh fails.
  Details: `docs/AUTH_DOCUMENTATION.md`.
- **Route structure:**
  - **Public:** `/`, `/login`, `/signup`.
  - **Student app (protected):** under `(student)` layout — `loadSession()` in layout; if not authenticated after load, redirect to `/login`. Dashboard-style UI (sidebar + header) for: `/dashboard`, `/play`, `/learn`, `/puzzles`, `/chess-game`, `/beat-the-bot`, `/adventure`, `/leaderboard`, `/progress`, `/profile`, `/settings`.
  - **Coach:** `/coach`, `/coach/puzzles`, etc.; backend enforces `require_coach` (role coach/admin).
- **Nav:** `ConditionalNavbar` shows the top Navbar only when **not** on student app routes; student area uses its own dashboard layout (sidebar + header).

---

## Phase 4: Main Features (Functional)

1. **Landing (`/`)**  
   Hero, value props (puzzles, beat the bot, level up, leaderboard), CTAs to signup/login.

2. **Auth**  
   Login (form → `POST /api/auth/login` with form body), signup (JSON), logout (`POST /api/auth/logout`). Session = `GET /api/auth/me`; no token in frontend.

3. **Learn (`/learn`)**  
   - **Lessons** (`/learn/lessons`): video/readings/exercises.  
   - **Burger Collector** (`/learn/burger-collector`, `.../burger-collector/[piece]`): piece-based challenges.  
   - **Star Collector** (`/learn/star-collector`, `.../star-collector/[piece]`): collect stars by moving a piece to star squares; data in `lib/data/basics-levels.ts` (e.g. `PieceLessonStep`: `startSquare`, `starSquares` per piece: Bishop, Queen, Knight, King, Pawn, Rook). Frontend uses `chess.js` + board UI; completion is local/UI state.

4. **Puzzles (`/puzzles`)**  
   - **Solve** (`/puzzles/solve`): list from `GET /api/puzzles`, then `/puzzles/[id]` — play puzzle, submit attempt `POST /api/puzzles/{id}/attempt` (is_solved, moves_made, time_taken, hints_used); XP and level updated on backend.  
   - **Puzzle Racer** (`/puzzles/racer`): timed mode; multiple puzzles, score/XP.  
   Hints: `POST /api/puzzles/{puzzle_id}/hint` (hint_level 1–3); backend uses `hint_service` (Stockfish) and deducts XP.

5. **Play**  
   - **Play hub** (`/play`): start vs bot or vs friend (invites).  
   - **Beat the bot** (`/beat-the-bot`): create bot game `POST /api/games/bot` (player_color, bot_difficulty, bot_depth); moves: `POST /api/games/{id}/move`, then `POST /api/games/{id}/bot-move` for bot reply (Stockfish).  
   - **Chess vs human** (`/chess-game`, `/chess-game/[gameId]`): create game from invite or direct; move via `POST /api/games/{id}/move`. Game state: PGN + `final_fen` on backend (python-chess).

6. **Game invites**  
   Create invite → `POST /api/game-invites`; invitee gets in-app notification; accept → `POST /api/game-invites/{id}/accept` creates game and redirects to game page; reject → `POST .../reject`. User search: `GET /api/users/search?query=...`.

7. **Leaderboard**  
   `GET /api/leaderboard?leaderboard_type=xp|rating`; displayed in dashboard.

8. **Progress / Profile / Settings**  
   Stats from `GET /api/users/me/stats`; profile update `PUT /api/users/me`; settings (e.g. logout).

9. **Notifications**  
   Bell dropdown: `GET /api/notifications`, `PATCH /api/notifications/{id}` (mark read), `POST /api/notifications/mark-all-read`, `DELETE` to dismiss. Used for game invites and achievements.

10. **Coach**  
    Coach-only routes; `require_coach` on `/api/coach/*`. Create/update/delete puzzles; optional Stockfish analysis/auto-solve (`/api/puzzles/analyze`, `/api/puzzles/validate`, `/api/puzzles/auto-solve`). Puzzles have FEN, solution moves, difficulty, theme, XP reward.

---

## Phase 5: Data Model (Backend)

- **User:** id, email, username, hashed_password, full_name, role (student/coach/admin), age, avatar_url, total_xp, level, rating, timestamps, is_active.  
- **Game:** white_player_id, black_player_id, pgn, result, winner_id, time_control, starting_fen, final_fen, total_moves, bot_difficulty, bot_depth, xp fields, started_at, ended_at.  
- **Puzzle:** fen, moves (solution), difficulty (enum), rating, theme, xp_reward, hints, attempts_count, success_count, is_active.  
- **PuzzleAttempt:** user_id, puzzle_id, is_solved, moves_made, time_taken, hints_used, xp_earned.  
- **GameInvite:** inviter_id, invitee_id, status (pending/accepted/rejected/expired), game_id (when accepted).  
- **Notification:** user_id, category (coach/achievement/system), title, message, read, link_url.  
- **Achievement, DailyChallenge, PuzzleRace** (and their attempt tables) exist in models; leaderboard is computed from User (e.g. order by total_xp or rating).

---

## Phase 6: Technical Deep Dives (Interview Talking Points)

**Auth (cookie-based session)**  
- Why cookies: XSS can't steal tokens; frontend doesn't handle tokens.  
- 401 handling: one refresh attempt, then redirect; `/api/auth/me` 401 is not redirected (just "not authenticated").  
- Implementation: `frontend/lib/api.ts` (axios interceptors), `frontend/lib/store.ts` (Zustand: user, loadSession, login, logout), `backend/auth.py` (create/decode JWT, get_current_user from cookie or Bearer).

**Chess moves and bot**  
- Backend: `python-chess` for legality, PGN rebuild, FEN; game state in DB (final_fen + pgn).  
- Bot: Stockfish service (`backend/stockfish_service.py`) — `analyze_position(fen, depth)` returns best move; bot move applied on server; `bot_depth` per game for strength.

**Puzzles and Stockfish**  
- List/fetch: `GET /api/puzzles`, `GET /api/puzzles/{id}`.  
- Submit: `POST /api/puzzles/{id}/attempt` (backend updates user XP/level and puzzle stats).  
- Hints: `hint_service` uses Stockfish; level 1–3 (vague → specific); XP cost; endpoint `POST /api/puzzles/{id}/hint`.  
- Coach: create puzzle with FEN; backend can use Stockfish to suggest difficulty/theme and validate solution (`validate_puzzle`, `suggest_difficulty`, `detect_tactic_theme`).

**Learn (Star Collector)**  
- No backend for completion; curriculum in `frontend/lib/data/basics-levels.ts` (per-piece lessons with start and star squares).  
- `StarCollector` (and similar) use chess.js for move validation and react-chessboard (or custom board) for UI.

**Frontend patterns**  
- App Router: `(student)` layout for all protected student pages; single `loadSession()` and redirect.  
- API: single axios instance, `withCredentials: true`, interceptors for refresh.  
- State: Zustand for auth; server state from API calls (no global cache layer like React Query in the code you have).

---

## Phase 7: How to Answer Common Interview Questions

- **"What is Prodigy Pawns?"**  
  A chess learning and playing web app: lessons, puzzles, play vs bot or human, XP/levels, leaderboards; coaches can create puzzles.

- **"Tech stack?"**  
  Next.js 16 + React 19 frontend, FastAPI backend, PostgreSQL, Stockfish for chess and puzzles; auth is cookie-based JWT (HttpOnly), state with Zustand.

- **"How does login work?"**  
  User submits credentials; backend validates, sets access and refresh tokens in HttpOnly cookies and returns user; frontend stores only user in Zustand and never touches tokens.

- **"How do you restore session?"**  
  On entering the app (e.g. student layout), we call `loadSession()` which calls `GET /api/auth/me` with cookies; response user is stored in Zustand; if not authenticated we redirect to login.

- **"What happens on 401?"**  
  We try once to refresh with `POST /api/auth/refresh`; on success we retry the original request; on failure we redirect to login. We don't redirect on 401 from `/api/auth/me` (that just means not logged in).

- **"How do puzzles work?"**  
  Backend stores FEN and solution; student gets a position, plays moves; attempt is submitted with is_solved, time, hints; backend awards XP and updates level. Hints come from Stockfish and cost XP.

- **"How does the bot work?"**  
  We create a game with a special bot user; each human move is sent to the backend; when it's the bot's turn we call an endpoint that uses Stockfish to compute the best move and append it to the game (PGN/FEN in DB).

- **"How are coach and student separated?"**  
  Backend: `require_coach` dependency on `/api/coach/*` checks role is coach or admin; frontend: coach pages load session and can redirect if user is not coach.

---

## Phase 8: File-by-File Flow (Trace One Journey)

Phase 8 helps you walk through the codebase in an interview. Below are two flows with the exact files and steps involved.

### Flow A: Login → Dashboard → First Puzzle Attempt

| Step | Where | What happens |
|------|--------|----------------|
| 1 | `frontend/app/login/page.tsx` | User enters email/password; form submit calls `login()` from `useAuthStore`. |
| 2 | `frontend/lib/store.ts` | `login` is a Zustand action; it's called with `user` only after the API returns (see step 4). |
| 3 | `frontend/lib/api.ts` | `authAPI.login(email, password)` sends `POST /api/auth/login` with **form data** (`username` = email, `password`), `withCredentials: true`. |
| 4 | `backend/main.py` | `login()`: `authenticate_user(db, username, password)` (from `auth.py`); on success creates access + refresh JWT, sets cookies on response, returns `{ user }`. |
| 5 | `frontend/app/login/page.tsx` | On success, response `user` is passed to `login(user)` in store; redirect to `/dashboard` (or intended route). |
| 6 | `frontend/app/(student)/layout.tsx` | All student routes use this layout. `useEffect` runs `loadSession()` once. Renders `DashboardLayout` only when `isAuthenticated` and not `authLoading`; otherwise redirects to `/login`. |
| 7 | `frontend/lib/store.ts` | `loadSession()` calls `authAPI.getCurrentUser()` → `GET /api/auth/me` (cookies sent). Result stored as `user`, `isAuthenticated: true`, `isLoading: false`. |
| 8 | `frontend/components/dashboard/dashboard-layout.tsx` | Wraps children with sidebar + header; sidebar links include `/puzzles`. |
| 9 | `frontend/app/(student)/puzzles/page.tsx` | Puzzles landing: two cards — "Solve Puzzles" → `/puzzles/solve`, "Puzzle Racer" → `/puzzles/racer`. |
| 10 | `frontend/app/(student)/puzzles/solve/page.tsx` | Solve flow: fetches list via `puzzleAPI.getAll()` → `GET /api/puzzles`; user picks a puzzle and navigates to `/puzzles/[id]`. |
| 11 | `frontend/app/(student)/puzzles/[id]/page.tsx` | Single-puzzle page: loads puzzle with `puzzleAPI.getById(id)` → `GET /api/puzzles/{id}`; renders board (e.g. react-chessboard + chess.js); on solve/fail calls `puzzleAPI.submitAttempt(puzzleId, { is_solved, moves_made, time_taken, hints_used })`. |
| 12 | `frontend/lib/api.ts` | `puzzleAPI.submitAttempt` → `POST /api/puzzles/{puzzleId}/attempt` with credentials. |
| 13 | `backend/main.py` | `submit_puzzle_attempt()`: loads user and puzzle; if `is_solved`, awards XP (minus hint penalty), updates `user.total_xp` and `user.level`; increments puzzle stats; creates `PuzzleAttempt`; optional notification; commit. Returns attempt record. |
| 14 | `frontend/app/(student)/puzzles/[id]/page.tsx` | On success, can call `updateUser` from store to refresh XP/level in UI; show success state or next puzzle. |

**Key files for this flow:**  
`app/login/page.tsx` → `lib/store.ts` → `lib/api.ts` → `backend/main.py` (auth + puzzle attempt) → `app/(student)/layout.tsx` → `app/(student)/puzzles/page.tsx` → `app/(student)/puzzles/solve/page.tsx` → `app/(student)/puzzles/[id]/page.tsx`.

---

### Flow B: Game Invite → Accept → First Move

| Step | Where | What happens |
|------|--------|----------------|
| 1 | `frontend/components/dashboard/play-content.tsx` | Play hub: user can search opponents via `gameAPI.searchUsers(query)`; selects user and sends invite with `gameAPI.createInvite(inviteeId)`. |
| 2 | `frontend/lib/api.ts` | `createInvite` → `POST /api/game-invites` with `{ invitee_id }`, credentials. |
| 3 | `backend/main.py` | `create_game_invite()`: validates invitee, creates `GameInvite` (status `pending`), creates **notification** for invitee; commit. Returns invite with inviter/invitee. |
| 4 | Invitee | Opens app; `frontend/components/dashboard/header.tsx` (or similar) shows notification bell; `notificationsAPI.getList()` → `GET /api/notifications`. Sees "Game invite!" with link to `/chess-game`. |
| 5 | Invitee | Goes to `/chess-game`; list of pending invites; clicks "Accept" on an invite. |
| 6 | `frontend/lib/api.ts` | `gameAPI.acceptInvite(inviteId)` → `POST /api/game-invites/{id}/accept`. |
| 7 | `backend/main.py` | `accept_game_invite()`: ensures current user is invitee, status is pending, not expired; creates `Game` (white=inviter, black=invitee); updates invite status to `accepted`, sets `invite.game_id`; creates notification for inviter; commit. Returns the new `Game`. |
| 8 | Frontend | Redirects or navigates to `/chess-game/[gameId]`. |
| 9 | `frontend/app/(student)/chess-game/[gameId]/page.tsx` | Loads game with `gameAPI.getGame(gameId)` → `GET /api/games/{id}`; renders board from `game.starting_fen` / `game.final_fen` / `game.pgn`; on user move, calls `gameAPI.makeMove(gameId, { from, to, promotion })`. |
| 10 | `frontend/lib/api.ts` | `makeMove` → `POST /api/games/{gameId}/move` with `from_square`, `to_square`, optional `promotion`. |
| 11 | `backend/main.py` | `make_move()`: loads game; rebuilds board from PGN/final_fen (python-chess); checks turn; applies move in UCI form; updates `game.final_fen`, rebuilds PGN; checks game end (checkmate/draw); commit. Returns updated game. |
| 12 | `frontend/app/(student)/chess-game/[gameId]/page.tsx` | Receives updated game; re-renders board; if vs bot, then calls `gameAPI.getBotMove(gameId)` to get and display bot reply. |

**Key files for this flow:**  
`components/dashboard/play-content.tsx` → `lib/api.ts` (game-invites, games) → `backend/main.py` (game_invites, games/move) → `app/(student)/chess-game/[gameId]/page.tsx`.

---

### Using Phase 8 in an Interview

- Pick one flow (e.g. "login to first puzzle attempt") and say: "I can walk through the code path from the login screen to submitting a puzzle attempt."
- Start from the UI (e.g. `app/login/page.tsx`), then API client (`lib/api.ts`), then backend (`main.py`), then back to the next UI (layout → puzzles → solve → [id]).
- Mention the important details: cookies for auth, no token in frontend, single `loadSession()` in student layout, and that puzzle XP/level are updated in `submit_puzzle_attempt` in `main.py`.
