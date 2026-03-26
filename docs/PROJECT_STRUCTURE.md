# Prodigy Pawns - Project Structure

This document describes the current repository structure and where major product capabilities live.

## Design Principles

- Kid-friendly UX with clear feedback loops.
- Strong gameplay correctness (server-authoritative chess logic).
- Clear separation of progression systems: rating/level vs XP vs stars.
- Role-aware platform layers: student, coach/admin, parent.
- Documentation-first for fast onboarding.

## Repository Layout

```txt
Playground - ProdigyPawns/
├── backend/
├── frontend/
├── docs/
├── v0-dashboard-layout/
└── v1-dashboard-layout/
```

## Backend Structure (FastAPI + SQLAlchemy)

```txt
backend/
├── main.py                         # Core app + primary API endpoints
├── models.py                       # SQLAlchemy entities
├── schemas.py                      # Pydantic request/response schemas
├── auth.py                         # Auth helpers, token + current-user logic
├── database.py                     # DB/session setup and schema guards
├── stockfish_service.py            # Engine integration
├── hint_service.py                 # Puzzle hint generation/cost flow
├── bot_runtime.py                  # Runtime profile resolution
├── bot_openings.py                 # Opening-book helper logic
├── bot_opponents.py                # Named bot roster + configs
├── bot_worker.py                   # Bot move job execution
├── bot_worker_loop.py              # Bot worker loop entry
├── bot_calibration.py              # Bot strength calibration services
├── bot_admin_endpoints.py          # Bot profiles/versions/rollouts APIs
├── migrate_existing_db.py          # DB migration helper script
├── migrations/                     # SQL migrations (including stars/shop)
├── scripts/                        # Utility/admin scripts
└── tests/                          # Unit/integration tests
```

### Backend Capability Map

- **Auth/session**: cookie JWT login, refresh, logout, current user.
- **Puzzles**: puzzle CRUD, solve attempts, hints, racer mode stats.
- **Games**: PvP invites, live move application, bot move requests.
- **Progression**:
  - rating changes for PvP outcomes,
  - level derived from rating band,
  - XP gain/spend logic for puzzle loop.
- **Rewards economy**:
  - wallet endpoint (`total_xp`, `star_balance`, convertibility),
  - XP-to-stars conversion (`1 star = 200 XP`),
  - star shop catalog + purchases (`shop_purchases` persistence).
- **Bot platform**:
  - profile versioning and rollouts,
  - calibration runs and acceptance gates,
  - move telemetry and worker-based move jobs.

## Frontend Structure (Next.js + TypeScript)

```txt
frontend/
├── app/
│   ├── (student)/                  # Protected student routes + layout
│   ├── (coach)/                    # Coach route group
│   ├── (parent)/                   # Parent route group
│   ├── login/ signup/              # Auth pages
│   └── api/                        # Next server actions/route handlers
├── components/
│   ├── dashboard/                  # Header, sidebar, star shop, cards
│   ├── puzzles/                    # Puzzle UI widgets
│   ├── chess/                      # Board/game components
│   └── ui/                         # Shared primitives
├── lib/
│   ├── api.ts                      # Typed API modules (auth/game/puzzle/rewards/shop...)
│   ├── store.ts                    # Zustand auth/session store
│   ├── data/                       # Learning content/constants
│   └── utils.ts
├── hooks/
├── public/
└── styles/
```

### Frontend Capability Map

- **Session bootstrap** in protected layouts via `loadSession()`.
- **Cookie-first API client** with refresh interceptors.
- **Dashboard progression UI** shows rating, level, XP, and stars separately.
- **Star shop UI** is backend-backed (wallet, conversion, purchases).
- **Game UX** supports PvP and bot flows.
- **Learning UX** includes collector-style lesson mini-modes.

## Core Domain Contracts

- `GET /api/users/me/stats`: student progression snapshot.
- `POST /api/puzzles/{id}/attempt`: solve submission + XP accounting.
- `POST /api/puzzles/{id}/hint`: hint delivery + XP deduction.
- `GET /api/rewards/wallet`: XP/stars wallet state.
- `POST /api/rewards/convert-xp-to-stars`: conversion endpoint.
- `GET /api/shop/catalog` and `POST /api/shop/purchase`: rewards commerce.
- `POST /api/games/{id}/bot-move`: bot move orchestration.

## Documentation Structure

```txt
docs/
├── PROJECT_OVERVIEW.md
├── PROJECT_STRUCTURE.md
├── TECHNICAL_DESIGN.md
├── FUNCTION_DESIGN.md
├── BOT_CHESS_GUIDE.md
├── BOT_STRENGTH_CALIBRATION.md
├── STUDENT_DASHBOARD.md
├── COACH_DASHBOARD.md
├── COMPANY_PITCH.md
├── FUTURE_SCOPE.md
└── BUGS_AND_ERRORS_PRIORITY_TRACKER.md
```

## Notes for New Contributors

- Treat backend as source of truth for rating/level/XP/stars accounting.
- Keep rating visuals distinct from star currency visuals.
- Prefer extending existing API modules in `frontend/lib/api.ts` before adding new request wrappers.
- Update docs when changing progression, rewards, or bot behavior.
