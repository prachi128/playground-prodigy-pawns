# Prodigy Pawns — Company Pitch Brief

*A concise document for partners, employers, investors, or chess and education organizations evaluating this project.*

---

## One-line pitch

**Prodigy Pawns is a chess learning and play platform** that helps students practice tactics, play humans or an engine-powered bot, and progress through rating, levels, XP, and stars—while giving coaches tools to create puzzles, manage batches, and track progress, and parents visibility into classes and payments.

---

## Executive summary

Chess is one of the most effective activities for developing concentration, planning, and resilience—but many digital experiences are either too generic (adult-focused) or too fragmented (puzzles here, lessons there, no link to a real coach or class).

**Prodigy Pawns** brings **students, coaches, and parents** into one product: gamified progression (rating-driven levels, XP/stars economy, leaderboards, daily challenges, puzzle racing), **fair online play** with invites and optional bot opponents, **coach-authored puzzles** backed by engine validation, and **operational features** for running classes (batches, announcements, scheduling hooks, payment flows for parents).

The product is built as a **modern web stack** (Next.js + FastAPI + PostgreSQL) with **Stockfish** for analysis, hints, bot moves, and puzzle quality checks—so teaching stays accurate while the experience stays engaging for kids.

---

## The opportunity

| Challenge | How we address it |
|-----------|-------------------|
| Students disengage without clear goals | Rating-driven levels (Pawn → King), XP rewards, stars economy, achievements, and leaderboards |
| Coaches need more than a generic puzzle site | Dashboard to create/validate puzzles, view student stats, manage batches |
| Parents want transparency | Linked parent accounts, dashboard for children’s progress, class info, payment history |
| Trust in “chess correctness” | Engine-backed validation, hints, and bot play—not guesswork |
| Youth programs need structure | Batches, class sessions, announcements aligned to how academies run |

---

## Goals and objectives

### Strategic goals

1. **Make structured chess learning accessible and sticky** for young learners through puzzles, play, and visible progress.
2. **Empower coaches and academies** to own curriculum (custom puzzles) and operations (rosters, batches, communication).
3. **Build a trustworthy technical foundation** where move legality, ratings, and analysis are handled server-side with established chess tooling.
4. **Support the full triangle—student, coach, parent** so organizations can adopt the product without bolting on separate billing or progress tools.

### Measurable objectives (product direction)

These express what “success” looks like as the product matures; they guide prioritization rather than claiming current completion for every item.

| Objective | Intent |
|-----------|--------|
| **Engagement** | Students return for daily challenges, puzzle flows, and social play (invites, puzzle racer). |
| **Learning outcomes** | Puzzle attempts, solve rates, and rating changes are visible to coaches and parents; progression telemetry expands to stars + XP behavior. |
| **Coach efficiency** | Fewer manual steps to publish puzzles and see who needs support (stats by student and class). |
| **Operational clarity** | Batches, classes, and parent-facing payment status reduce admin overhead for running programs. |
| **Quality and safety** | Auth via secure cookies, role-based access (student / coach / parent), and engine-grounded chess logic. |

---

## Who we serve

- **Students** — Primary users: solve puzzles, play friends or bot, climb leaderboards, track progress.
- **Coaches and admins** — Create and maintain puzzle libraries, monitor performance, run batches and class comms.
- **Parents** — See linked children’s activity and program details; pay through integrated checkout where enabled.
- **Organizations** — Chess schools, clubs, and edtech programs that want a **branded learning loop** under one roof.

---

## Product pillars (current capabilities)

1. **Learn and practice** — Puzzle catalog with attempts, XP rewards, tiered hints (engine-backed), daily challenges, achievements.
2. **Play** — Human vs human with invites and notifications; vs bot with rated personalities and policy-controlled strength; game analysis for review.
3. **Progress and motivation** — Elo-style rating for PvP games, rating-driven level bands, leaderboards (XP and rating), stats on profile.
4. **Coach tools** — Puzzle CRUD with optional auto-difficulty/theme from analysis; student lists and detailed stats; batch lifecycle.
5. **Parent and program layer** — Dashboard, children linkage, classes and announcements, payment creation and history (Stripe-oriented backend).
6. **Rewards economy** — XP usage for hints, XP-to-stars conversion (`1 star = 250 XP`), and star-shop purchase flows.
7. **Social and competitive modes** — Puzzle Racer multiplayer rooms (shared race state, scores, display names).

---

## Differentiation

- **Kid-first UX** combined with **serious chess**: not only animations and XP, but **python-chess + Stockfish** on the server for legality, PGN/FEN state, and analysis.
- **Coach-authored content** inside the same app students use—no export/import to a separate puzzle database.
- **Roles that match real programs**: student, coach/admin, parent—not a single generic “user.”
- **Clear separation of progression mechanics**: **rating** drives competitive levels; **XP** powers hints/reward flow; **stars** provide a separate economy layer (`1 star = 250 XP`) for shop-style rewards.
- **Bot platform maturity**: named bot roster with target ratings, telemetry, and rollout/calibration controls (not just fixed depth presets).

---

## Technology approach (high level)

- **Frontend:** Next.js (App Router), TypeScript, Tailwind; cookie-based session with axios and refresh handling.
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL; scheduled jobs for fair play (e.g. inactivity handling in games).
- **Chess:** Stockfish for analysis, hints, bot, and coach tooling; `python-chess` for game state and PGN.

This stack is familiar to engineering teams and deployable on common cloud patterns (API + DB + static/SSR frontend).

---

## Vision and roadmap themes

Near-term and medium-term directions already captured in project planning include:

- **Adaptive puzzle difficulty** and richer rating models (e.g. Glicko-style) for fairer matchmaking and progression stories.
- **Deeper live play**—more time controls, better disconnect handling, optional WebSockets at scale, spectating for coaches.
- **Optional AI layer** for **explanations and coach productivity** while keeping **Stockfish as the source of truth** for moves and evaluation (see `LLM_AND_PRODUCT_STRATEGY.md`).
- **Stronger parent and coach analytics** and in-game coaching overlays appropriate for youth.
- **Coach-side progression visibility upgrade**: coaches should track rating, levels, stars, and XP together (currently XP is the most visible metric in coach workflows).

These themes show intentional product evolution beyond a static MVP.

---

## What we are looking for from a company

Depending on context, a conversation with your organization might be about:

- **Partnership or pilot** — Running a cohort of students and coaches on the platform with feedback into the roadmap.
- **Integration** — Connecting to your curriculum, rating systems, or single sign-on where there is mutual fit.
- **Investment or sponsorship** — Accelerating roadmap items (realtime play, adaptive puzzles, regionalization).
- **Employment or collaboration** — Demonstrating execution on full-stack product thinking, chess domain care, and multi-stakeholder UX.

We are happy to tailor this brief to **your** mandate (hiring, partnership, or investment) in a follow-up deck or demo.

---

## Appendix: Document map

| Document | Use |
|----------|-----|
| `PROJECT_OVERVIEW.md` | Deep product and technical overview |
| `FUNCTION_DESIGN.md` | Functions, APIs, and system boundaries |
| `AUTH_DOCUMENTATION.md` | Security and session model |
| `FUTURE_SCOPE.md` | Detailed future feature ideas |
| `LLM_AND_PRODUCT_STRATEGY.md` | AI augmentation strategy |

---

*Prodigy Pawns — Chess Academy Portal: play, learn, and grow in one place.*
