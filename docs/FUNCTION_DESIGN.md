# Prodigy Pawns — Function Design Document

This document describes **logical functions** in the codebase: their purpose, inputs/outputs, side effects, and main dependencies. It is intended for onboarding, reviews, and extending the system without duplicating full API reference (see FastAPI `/docs` for request/response schemas).

**Related docs:** `PROJECT_OVERVIEW.md`, `AUTH_DOCUMENTATION.md`, `PROJECT_STRUCTURE.md`.

---

## 1. System boundaries

| Layer | Role |
|--------|------|
| **Frontend (`frontend/`)** | Next.js App Router UI; `lib/api.ts` wraps HTTP calls with cookie auth and 401 refresh; Zustand holds `user` only (no tokens in JS). |
| **Backend (`backend/`)** | FastAPI app in `main.py` plus routers: coach, coach/students, parent, batches. |
| **Engine services** | `stockfish_service.py` (analysis, validation, difficulty/theme helpers); `hint_service.py` (tiered hints + XP costs). |
| **Auth** | `auth.py`: JWT in HttpOnly cookies, `get_current_user` → `user_id`. |
| **Persistence** | SQLAlchemy + PostgreSQL (`database.py`, `models.py`, `schemas.py`). |

---

## 2. Cross-cutting domain functions (backend)

These are implemented mainly in `main.py` or `auth.py` and are reused by multiple endpoints.

### 2.1 Authentication and identity

| Function | Responsibility | Notes |
|----------|----------------|-------|
| `verify_password` / `get_password_hash` | Bcrypt verify/hash; truncates to 72 bytes for bcrypt. | `auth.py` |
| `create_access_token` / `create_refresh_token` | JWT with `sub` = user id; types `access` / `refresh`. | Access ~15 min; refresh ~7 days. |
| `decode_refresh_token` | Returns `user_id` or `None`. | Used by `/api/auth/refresh`. |
| `get_token_from_cookie_or_bearer` | Resolves access token from cookie or `Authorization: Bearer`. | |
| `get_current_user` | Validates access JWT; **returns `user_id` (int)** for `Depends()`. | 401 if missing/invalid. |
| `authenticate_user` | Lookup by username (login form uses email as `username`) + password check. | Used at login. |

**Auth HTTP handlers:** signup (student), signup (parent + link children), login (sets cookies), refresh (new access cookie), logout (clears cookies), `GET /api/auth/me` (syncs level from rating, returns user + `level_category`).

### 2.2 Rating, level, and Elo

| Function | Responsibility | Notes |
|----------|----------------|-------|
| `level_from_rating(rating)` | Maps integer rating to level **1–15** using fixed thresholds. | Level is **not** derived from XP. |
| `get_level_category(level)` | Display band: Pawn → King. | |
| `sync_user_level_from_rating(user)` | Sets `user.level` from `user.rating` if drifted. | Called on login, refresh, `/me`. |
| `_score_white_from_result(result)` | Parses PGN result string to 0–1 score for White. | |
| `update_ratings_after_game(game, db)` | Elo update (K=32, floor 100) for **both** players. | **Skipped** if either player is `__BOT__` (bot games do not change ratings). |

### 2.3 Rewards economy (XP, stars, shop)

| Function / Constant | Responsibility | Notes |
|----------|----------------|-------|
| `XP_PER_STAR` | Conversion constant for rewards economy. | Current rule: **1 star = 200 XP**. |
| `get_rewards_wallet(...)` | Returns wallet state (`total_xp`, `star_balance`, convertible stars). | Auth required. |
| `convert_xp_to_stars(...)` | Deducts XP and increments `star_balance`. | Validates sufficient XP and positive star amount. |
| `get_shop_catalog(...)` | Returns available shop items and user star balance. | Current catalog is server-defined. |
| `purchase_shop_item(...)` | Deducts stars, writes `ShopPurchase` record, creates notification. | Delivery status starts as `pending`. |

### 2.4 Game lifecycle helpers

| Function | Responsibility | Notes |
|----------|----------------|-------|
| `check_auto_resign_timeout(game, db)` | If active player exceeds inactivity window on their turn, set result to loss, `result_reason=auto_resign`, update ratings, commit. | Uses FEN side-to-move; swallow errors to avoid 500 loops. |
| `run_auto_resign_for_all_games()` | Loads all unfinished games; calls `check_auto_resign_timeout` each. | APScheduler **every 1 minute** (`lifespan`). |
| `get_or_create_bot_user(db)` | Ensures special user `username == "__BOT__"`. | Bot games pair human with this user. |
| `_make_bot_move_if_needed(game, db, bot_user_id)` | If position is bot’s turn, Stockfish best move at `bot_depth`; updates PGN/FEN, checkmate/draw, ratings if finished. | Mirrors human `make_move` PGN strategy. |

**Clock model (human PvP moves):** `INITIAL_CLOCK_MS` per side; on each move, elapsed time since `last_move_at` (or `started_at`) is deducted from the mover’s clock; zero clock → timeout loss. Bot path does not fully mirror clock UX in all cases; `time_control` is stored for humans.

### 2.5 Notifications

| Function | Responsibility | Notes |
|----------|----------------|-------|
| `create_notification(db, user_id, category, title, message, link_url?)` | Inserts `Notification` row. | **Caller must `commit`.** Used for puzzle solve, invites, accept/reject. |

### 2.6 Puzzle Racer (in-memory multiplayer)

State lives in `_puzzle_race_rooms: Dict[str, Dict]` (not durable across process restarts).

| Function | Responsibility |
|----------|----------------|
| `_get_puzzle_race_room(room_id)` | Lookup. |
| `_pick_random_available_car(room)` | Random car index not in `car_assignments`. |
| `_create_puzzle_race_room(room_id, host_user_id)` | Host + random car; status `waiting`. |
| `_maybe_finish_race(room)` | If `race_end_at` passed, status → `finished`. |
| `_serialize_puzzle_race_room(room)` | Pydantic `PuzzleRaceRoomState` for API. |

**Constants** (must stay aligned with frontend): countdown seconds, total cars, total race duration.

---

## 3. HTTP API surface (by router)

### 3.1 Core app (`main.py`) — `/api/*`

**Infrastructure:** `GET /`, `GET /api/health`, `GET /api/server-time`, `GET /api/levels`.

**Puzzle Racer:** `POST /api/puzzle-racer/rooms`, `GET .../rooms/{room_id}`, `join`, `start`, `select-car`, `set-name`, `update-score`, `leave`, `reset`.

**Users:** `GET /api/users/search` (students, ≥2 chars), `GET /api/users/{id}`, `PUT /api/users/me`.

**Puzzles (student-facing):** `GET /api/puzzles` (filter difficulty/theme, paginate), `GET /api/puzzles/{id}`, `POST /api/puzzles/{id}/attempt` (XP, stats, notification on solve).

**Puzzles (engine):** `POST /api/puzzles/analyze`, `POST /api/puzzles/{id}/hint` (auth, deduct XP via hint tiers), `POST /api/puzzles/validate`, `POST /api/puzzles/auto-solve`.

**Games:** list/get/create, `POST .../move`, `POST .../resign`, `POST /api/games/bot`, `POST .../bot-move`, `GET .../analysis` (completed game, participants only).

**Invites:** create, list, accept (creates game + notifications), reject.

**Content:** `GET /api/achievements`, `GET /api/daily-challenge`, `GET /api/leaderboard`.

**Notifications:** list, patch read, mark-all-read, delete.

**Rewards & Shop:** `GET /api/rewards/wallet`, `POST /api/rewards/convert-xp-to-stars`, `GET /api/shop/catalog`, `POST /api/shop/purchase`.

**Stats:** `GET /api/users/me/stats` (games, puzzles, win rate, accuracy, XP, stars, level, rating).

### 3.2 Coach — `coach_endpoints.py` — prefix `/api/coach`

**Guard:** `require_coach` → role `coach` or `admin`.

| Endpoint area | Purpose |
|---------------|---------|
| `POST/GET/PUT/DELETE /puzzles` | CRUD puzzles; create can auto-fill difficulty/theme/XP via Stockfish. |
| `POST /puzzles/{id}/revalidate` | Re-run Stockfish validation on stored FEN/solution. |
| `GET /stats` | Aggregate coach/puzzle statistics. |

### 3.3 Coach students — `student_management_backend.py` — `/api/coach/students`

**Guard:** same as coach.

| Endpoint | Purpose |
|----------|---------|
| `GET /stats/overview` | Class-wide aggregates. |
| `GET /` | List students with stats. |
| `GET /{student_id}` | Detailed breakdown (difficulty buckets, weekly stats, etc.). |
| `POST /{student_id}/award-xp` | Manual XP grant. |
| `PUT /{student_id}/deactivate` | Deactivate student account. |

### 3.4 Batches — `batch_endpoints.py` — `/api/batches`

**Guard:** `require_coach`.

Coaching **batch** CRUD; add/remove students; class sessions; batch announcements; **payment status** overview per batch (coach billing visibility).

### 3.5 Parent — `parent_endpoints.py` — `/api/parent`

**Guard:** `require_parent`.

| Area | Purpose |
|------|---------|
| `GET /dashboard` | Children summary, upcoming classes, announcements, billing month context. |
| `GET /children`, `/classes`, `/announcements` | Linked students and batch-scoped info. |
| `POST /payments/create-checkout` | Stripe checkout session (via `stripe_service`). |
| `GET /payments/history` | Past payments. |
| `POST /payments/webhook` | Stripe webhook handler (`verify_webhook`). |

### 3.6 Bot admin — `bot_admin_endpoints.py` — `/api/admin/bots`

**Guard:** `require_admin`.

| Endpoint area | Purpose |
|------|---------|
| `GET/POST /profiles` | List/create bot profiles (target ratings by bot id). |
| `GET/POST /profiles/{bot_id}/versions` | Versioned config management. |
| `POST /rollouts` | Rollout creation with traffic percentage and enable flag. |
| `POST /profiles/{bot_id}/versions/{version_id}/promote` | Promote version with canary traffic. |
| `POST /profiles/{bot_id}/rollback` | Restore previous active rollout. |
| `POST /calibration-runs`, `.../{run_id}/execute` | Create and execute calibration acceptance runs. |
| `GET /calibration/coverage`, `GET /calibration-runs/recent` | Readiness + historical calibration visibility. |
| `GET /telemetry/recent`, `GET /telemetry/summary` | Bot move telemetry inspection and aggregates. |
| `GET /jobs` | Bot queue job visibility. |

---

## 4. Engine services (backend)

### 4.1 `StockfishService` (`stockfish_service.py`)

| Method | Purpose |
|--------|---------|
| `analyze_position(fen, depth)` | Best move, eval, top moves, mate flag. |
| `choose_bot_move(fen, bot_rating, profile_config)` | Humanized move selection (weighted top-N, oversight/blunder, wild picks, mate forcing). |
| `validate_puzzle(fen, solution_moves_uci)` | Compare first move to engine best move; optional line validation. |
| `suggest_difficulty(fen)` | Heuristic difficulty string for coaches. |
| `detect_tactic_theme(fen, moves)` | Tactical label for UI/coach tools. |

Singleton accessor: `get_stockfish_service()`.

### 4.2 `HintService` (`hint_service.py`)

| Method | Purpose |
|--------|---------|
| `get_hint(fen, hint_level)` | Levels 1–3: vague → specific; returns `hint_text`, `xp_cost` (2/4/8). |

Singleton accessor: `get_hint_service()`.

### 4.3 Bot runtime services

| Module | Purpose |
|--------|---------|
| `bot_runtime.py` | Resolve runtime bot profile config, enqueue/mark/complete jobs, write per-move telemetry, create calibration runs. |
| `bot_openings.py` | Lightweight opening-book move selection by bot id + move history prefix. |
| `bot_opponents.py` | Bot id → target rating mapping; legacy difficulty compatibility + fallback heuristics. |
| `bot_worker.py` | Batch processor for pending bot move jobs. |
| `bot_worker_loop.py` | Standalone polling loop for dedicated worker process. |

---

## 5. Frontend API modules (`frontend/lib/api.ts`)

Each exported object groups **typed async functions** that mirror backend routes. All use the shared `axios` instance with `withCredentials: true` and the **401 → refresh once → retry** interceptor (except `GET /api/auth/me`).

| Module | Backend alignment |
|--------|-------------------|
| `authAPI` | Login, signup, parent signup, me, refresh, logout. |
| `userAPI` | Profile update, `me/stats`. |
| `usersAPI` | Public user by id. |
| `puzzleAPI` | List, get, submit attempt. |
| `leaderboardAPI` | XP/rating leaderboard. |
| `puzzleRacerRoomsAPI` | Room lifecycle + `getServerTime`. |
| `achievementAPI`, `dailyChallengeAPI` | Read-only content. |
| `notificationsAPI` | Bell feed CRUD semantics. |
| `gameAPI` | Games, invites, moves, bot, analysis, user search. |
| `rewardsAPI` | Wallet + XP-to-stars conversion. |
| `shopAPI` | Shop catalog + purchase. |
| `parentAPI` | Parent dashboard namespace. |
| `batchAPI` | Coach batch management. |
| `coachAPI` | Coach puzzles + stats + helpers calling shared analyze/auto-solve endpoints. |

---

## 6. Server actions and local UI logic (frontend)

- **`frontend/app/(student)/actions/game-actions.ts`:** `updateStudentStats` delegates to `addXpAndCoins` in `app/actions/update-progress`; this path remains separate from authoritative backend puzzle/reward accounting.
- **Learn modes (e.g. Star Collector):** Curriculum and move validation often live in `frontend/lib/data/*` and components using `chess.js`; completion may be **client-only** unless wired to an API.

---

## 7. Design invariants and constraints

1. **Level vs XP:** Display **level** follows **rating** (Elo from PvP). **XP** tracks engagement (puzzles, hints cost XP); `total_xp` does not drive level in the current backend rules.
2. **Stars vs XP:** Stars are a separate currency (`1 star = 200 XP`) and are persisted in `users.star_balance`; shop purchases spend stars, not rating.
3. **Bot games:** No rating change for humans or bot user when `__BOT__` participates.
4. **Puzzle Racer rooms:** In-memory only; scaling out or restart clears rooms unless replaced with Redis/DB later.
5. **Auth:** Tokens are HttpOnly; frontend relies on cookies + `user` in Zustand.
6. **Route ordering:** e.g. `/api/users/search` before `/api/users/{user_id}`; `/api/coach/students/stats/overview` before `/{student_id}`.

---

## 8. Extension points

- **New game modes:** Add endpoints under `main.py` or a new router; reuse `Game` model and `python-chess` board rebuild patterns from `make_move` / `_make_bot_move_if_needed`.
- **New puzzle features:** Prefer extending `Puzzle` + attempt schemas and keeping Stockfish calls in services.
- **Realtime:** Current design is request/response + polling for Puzzle Racer; WebSockets would be a separate layer.

---

*Generated from repository structure and backend/frontend sources. For exact request bodies, prefer OpenAPI at `http://<backend>:8000/docs` when the server is running.*
