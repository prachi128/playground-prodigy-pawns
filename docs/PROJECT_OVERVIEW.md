# Prodigy Pawns — Project Overview (Interview Prep)

This document explains the project functionally and technically so you can answer interview questions clearly.

---

## Phase 1: What the Product Is

**Prodigy Pawns** is a chess learning and play platform ("Chess Academy Portal") for students, coaches, parents, and admins.

- Students: learn, solve puzzles, play PvP and bots, track progress.
- Coaches/admins: manage puzzles, students, batches, and bot operations.
- Parents: view children progress, class context, and payments.

Core progression model:
- **Rating** drives **levels**.
- **XP** is earned/spent for puzzle ecosystem.
- **Stars** are a separate rewards currency (`1 star = 200 XP`).

---

## Phase 2: Tech Stack (High Level)

| Layer | Technology |
|--------|------------|
| Frontend | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS, motion/animation libs |
| State | Zustand (`user` + UI state), no raw token storage in JS |
| API client | Axios with `withCredentials: true` |
| Chess UI | react-chessboard, chess.js |
| Backend | FastAPI + routers |
| ORM / DB | SQLAlchemy + PostgreSQL |
| Auth | JWT access/refresh in HttpOnly cookies |
| Chess engine | Stockfish + python-chess |
| Scheduling/ops | APScheduler + bot job queue pattern |

One-liner:
Next.js frontend with cookie-based auth talks to FastAPI + PostgreSQL, with Stockfish/python-chess powering chess intelligence and validation.

---

## Phase 3: Architecture and Repo Layout

- `frontend/`: user-facing web app and typed API client.
- `backend/`: FastAPI app, domain endpoints, and service orchestration.
- `docs/`: product, architecture, and operational documentation.

Auth/session design:
- Login/signup sets access + refresh cookies (HttpOnly).
- Frontend stores only user profile in Zustand.
- On 401, API interceptor attempts single refresh and retries request.

Route families:
- Public: `/`, `/login`, `/signup`.
- Student protected routes: dashboard/play/learn/puzzles/chess-game/beat-the-bot/adventure/leaderboard/progress/profile/settings.
- Coach and parent route families with role-based backend enforcement.

---

## Phase 4: Main Features (Functional)

1. **Auth & identity**
   - Signup/login/logout/refresh/session restore via cookies.

2. **Learn modes**
   - Piece-learning interactions (e.g. Burger Collector, Star Collector).

3. **Puzzles**
   - List/filter/solve flow.
   - Attempt submission with XP reward logic.
   - Hint flow with XP deduction.
   - Puzzle Racer mode.

4. **Play**
   - PvP via invites.
   - Bot games via `POST /api/games/bot` and bot reply endpoint.
   - Analysis/review for completed games.

5. **Progression**
   - PvP Elo rating updates.
   - Rating-based level bands/categories.
   - XP-based engagement economy (hints, rewards).

6. **Rewards economy**
   - Wallet endpoint for XP + star balance.
   - XP-to-stars conversion (`1 star = 200 XP`).
   - Star shop catalog and purchase persistence.

7. **Coach/admin operations**
   - Puzzle CRUD + stockfish-assisted analysis/validation.
   - Student/batch/admin operations.
   - Bot profile versioning, rollout, calibration, telemetry.

8. **Parent layer**
   - Linked children, class and announcement visibility, payment flows.

---

## Phase 5: Data Model (Backend)

Core entities:
- **User**: role, rating, level, total_xp, star_balance, profile metadata.
- **Game**: players, PGN/FEN/result, clocks, bot metadata.
- **Puzzle** and **PuzzleAttempt**: content + attempt outcomes/reward stats.
- **GameInvite** and **Notification**: invite and communication flows.
- **ShopPurchase**: star-spend reward transactions.
- **Bot platform** tables:
  - profiles, profile versions, rollouts,
  - calibration runs,
  - move jobs,
  - move telemetry.

---

## Phase 6: Technical Talking Points

### Auth
- Cookie-based JWT strategy reduces frontend token handling risk.
- 401 refresh-and-retry pattern gives stable UX.

### Chess correctness
- `python-chess` governs legality and PGN/FEN reconciliation.
- Stockfish provides engine-backed move/evaluation insights.

### Bot system maturity
- Not only depth-based; uses rating + runtime profile policy.
- Supports rollout and rollback by profile version.
- Captures telemetry and calibration signals for tuning.

### Progression separation
- Rating -> level.
- XP for puzzle/reward loop.
- Stars as wallet currency converted from XP and spent in shop.

---

## Phase 7: Interview Q&A Short Answers

- **What is Prodigy Pawns?**
  A full-stack chess learning and play platform for students/coaches/parents with engine-backed correctness and gamified progression.

- **How does auth work?**
  Backend sets HttpOnly access/refresh cookies; frontend stores only user profile and restores with `/api/auth/me`.

- **How do puzzles work?**
  Student attempts are submitted to backend; solved attempts award XP with hint penalties/floor; hints cost XP.

- **How do levels work?**
  Levels are derived from rating bands, not XP.

- **How does rewards economy work?**
  XP can be converted to stars at `1 star = 200 XP`; stars are spent via shop purchases.

- **How does bot strength work?**
  Runtime resolves bot rating/profile config and uses humanized Stockfish selection policies plus telemetry/calibration tooling.

---

## Phase 8: Useful Companion Docs

- `AUTH_DOCUMENTATION.md`
- `FUNCTION_DESIGN.md`
- `TECHNICAL_DESIGN.md`
- `BOT_CHESS_GUIDE.md`
- `BOT_STRENGTH_CALIBRATION.md`
- `COACH_DASHBOARD.md`
- `STUDENT_DASHBOARD.md`

---

Use this overview for high-level explanation; use `FUNCTION_DESIGN.md` and `TECHNICAL_DESIGN.md` for deeper architecture or implementation questions.
