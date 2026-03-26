# Prodigy Pawns — Technical Design Document

Date: 2026-03-26

## 1. Purpose

This document defines the current technical design of Prodigy Pawns at architecture level: components, data flow, core domain models, major runtime behaviors, and key non-functional constraints.

---

## 2. System Architecture

## 2.1 High-level components

- **Frontend**: Next.js (App Router), TypeScript, Tailwind.
- **Backend API**: FastAPI monolith with modular routers.
- **Database**: PostgreSQL via SQLAlchemy ORM.
- **Chess engine**: Stockfish via backend service wrappers.
- **Auth/session**: JWT access + refresh tokens in HttpOnly cookies.
- **Background/scheduled processing**:
  - APScheduler for periodic game timeout/auto-resign checks.
  - Bot move job queue model with optional worker loop.

## 2.2 Core module boundaries

- `frontend/lib/api.ts`: typed API client, cookie auth, refresh-and-retry interceptor.
- `backend/main.py`: core API + orchestration paths.
- `backend/*_endpoints.py`: role-specific/feature-specific routers.
- `backend/stockfish_service.py`: analysis, puzzle validation, humanized bot move selection.
- `backend/hint_service.py`: tiered hint generation and XP cost semantics.
- `backend/bot_runtime.py`: runtime bot profile resolution, jobs, telemetry, calibration run creation.

---

## 3. Identity, Access, and Session Model

- User roles: `student`, `coach`, `admin`, `parent`.
- Access token and refresh token are set/managed in cookies (not stored directly in JS state).
- `get_current_user` resolves authenticated `user_id` for endpoint dependencies.
- Frontend holds user profile state (Zustand) and refreshes session transparently on 401 once.

Design intent:
- reduce token exposure in browser JS,
- keep role checks server-side,
- maintain predictable re-auth behavior.

---

## 4. Domain Design

## 4.1 Progression and rewards

- **Rating**:
  - Elo-style update for PvP games (K=32, floor 100).
  - Bot games excluded from rating updates.
- **Level**:
  - Derived from rating bands (`level_from_rating`), not XP.
- **XP**:
  - Earned mainly from solved puzzles.
  - Deducted for hints (tiered costs).
- **Stars**:
  - Separate wallet currency (`users.star_balance`).
  - Conversion rule: `1 star = 200 XP`.
  - Spent in shop purchases persisted in `shop_purchases`.

## 4.2 Games

- Human PvP games:
  - invites, accept/reject lifecycle,
  - move legality via `python-chess`,
  - PGN/FEN tracking,
  - turn clocks and timeout/auto-resign logic.
- Bot games:
  - untimed (`time_control = "unlimited"`),
  - use special internal bot account `__BOT__`,
  - runtime move generation with profile/rating policy.

## 4.3 Puzzles

- Student puzzle attempt path updates attempt stats and XP.
- Hint endpoint provides progressive hints with XP cost.
- Coach puzzle tooling supports stockfish-based analysis, validation, and metadata support.

---

## 5. Key Runtime Flows

## 5.1 Puzzle solve flow

1. Student submits attempt.
2. Backend validates puzzle + user.
3. If solved:
   - calculate XP with hint penalty and floor,
   - add XP to user,
   - increment puzzle success count.
4. Always increment attempts count.
5. Persist attempt row and optional notification.

## 5.2 Hint flow

1. Student requests hint with `hint_level`.
2. Hint service returns text + XP cost.
3. Backend checks balance and deducts XP.
4. Returns hint payload + remaining XP.

## 5.3 XP-to-stars conversion + purchase flow

1. Student checks wallet (`/api/rewards/wallet`).
2. Convert via `/api/rewards/convert-xp-to-stars`:
   - deduct XP,
   - increment stars.
3. Purchase via `/api/shop/purchase`:
   - deduct stars,
   - create `shop_purchases` row,
   - emit notification.

## 5.4 Bot move flow

1. Request hits `/api/games/{id}/bot-move`.
2. Job is enqueued/marked processing.
3. Runtime profile is resolved (bot id, rating, rollout version config).
4. Opening-book candidate may be selected.
5. Otherwise `choose_bot_move` samples from Stockfish top-N with policy controls.
6. Move is applied, PGN/FEN updated, end-state checked.
7. Telemetry persisted.
8. Job completed/failed accordingly.

## 5.5 Calibration flow

1. Admin creates calibration run.
2. Execute gathers samples from finished bot games (preferred) or telemetry proxy.
3. Rating estimate + confidence interval computed.
4. Acceptance gate evaluated against target rating/tolerance/min samples.
5. Results stored in calibration run row.

---

## 6. Bot Platform Design

## 6.1 Configuration and rollout

- `bot_profiles`: canonical bot identity + target rating.
- `bot_profile_versions`: versioned config JSON.
- `bot_profile_rollouts`: traffic-percentage activation.
- Stable bucketing controls which version is active per bot/game pair.

## 6.2 Telemetry and operations

- `bot_move_telemetry`: per-move behavior/eval metadata.
- `bot_move_jobs`: queue entries for async/scheduled move processing.
- Admin endpoints expose recent telemetry, summaries, jobs, coverage, and rollbacks.

---

## 7. Data Model Additions (Recent)

- `users.star_balance` (int, default 0).
- `shop_purchases` table:
  - `user_id`,
  - `item_key`,
  - `item_name`,
  - `stars_spent`,
  - `delivery_status`,
  - timestamps.

---

## 8. Non-Functional Considerations

- **Consistency**: Server-side chess state rebuild via PGN/FEN to avoid drift.
- **Security**: Cookie-based auth, role guards, backend authority for rewards/rating.
- **Resilience**:
  - fallback legal-move behavior for engine edge cases,
  - bot job status tracking for operational visibility.
- **Scalability caveats**:
  - Puzzle Racer currently in-memory room state (non-durable, single-process assumption).
  - Bot workers can be separated with polling loop + admin process endpoint.
- **Observability**:
  - bot telemetry summary endpoints,
  - calibration history endpoints,
  - standard API health endpoint.

---

## 9. Current Design Constraints

- Level progression intentionally tied to rating (not XP).
- Bot games intentionally excluded from Elo updates.
- Reward economy is XP->stars conversion and star spending; coach-facing aggregate views are still evolving.
- Some frontend legacy docs/components may still reference old XP-level assumptions and require periodic doc alignment.

---

## 10. Near-Term Technical Priorities

1. Consolidate lint quality debt in high-risk gameplay surfaces.
2. Expand coach analytics to include rating/level/stars/XP in one view.
3. Improve realtime architecture options for multiplayer states (websocket/redis path).
4. Harden bot rollout governance with stricter promotion gates and dashboards.
5. Add broader automated E2E coverage for rewards + PvP + bot journeys.

---

Related docs:
- `FUNCTION_DESIGN.md`
- `BOT_CHESS_GUIDE.md`
- `BOT_STRENGTH_CALIBRATION.md`
- `XP_STAR_RATING_LEVEL_AUDIT.md`
