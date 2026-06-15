# Parent Dashboard — Guide, Tech Stack & Roadmap

## Overview

The **Parent Dashboard** is the guardian-facing portal in Prodigy Pawns. It lets parents monitor their children's chess learning, view class schedules and coach announcements, manage child accounts, and pay monthly batch fees via Stripe.

**Important:** A working parent portal already exists in this codebase. This document explains what is built today, how to extend it, the full portal tech stack, and recommended improvements.

---

## What Parents Can Do Today

| Feature | Route | Status |
|---------|-------|--------|
| Dashboard home (children summary, upcoming classes, announcements, payment alerts) | `/parent` | ✅ Built |
| Children list + create child + assignment progress | `/parent/children` | ✅ Built |
| Class schedule (upcoming/past + meeting links) | `/parent/classes` | ✅ Built |
| Coach announcements (batch filter) | `/parent/announcements` | ✅ Built |
| Monthly payments + payment history (Stripe) | `/parent/payments` | ✅ Built |
| Parent signup & login | `/signup`, `/login` | ✅ Built |
| Child attendance view | — | ⚠️ API ready, no UI |
| Child detail / full progress page | — | ❌ Not built |
| Settings / profile | — | ❌ Not built |
| Notifications | — | ❌ Not built |

---

## Functional Overview & Business Value

### Purpose & Goals

The Parent Dashboard empowers guardians to:

1. **Stay informed** — See children's rating, level, XP, batch, and payment status at a glance
2. **Manage accounts** — Create child accounts without requiring a child-owned email
3. **Stay connected to class** — View schedules, join links, and coach announcements
4. **Handle payments** — Pay monthly batch fees and review payment history
5. **Support learning** — Track assignment completion and (future) attendance and progress trends

### Key Problems Solved

| Problem | Solution |
|---------|----------|
| Young children lack their own email | ChessKid-style model: students log in with **username + password**; parent email is stored as **guardian email** |
| Parents can't see class context | Aggregated view of batches, class sessions, and announcements for all linked children |
| Payment friction | Stripe checkout from the dashboard with overdue/pending banners |
| Manual child onboarding | Parents create and link children directly from `/parent/children` |

### Parent ↔ Child Linking Model

Three ways a parent gets linked to children (see `backend/account_utils.py`):

1. **Guardian email auto-link** — When a parent's email matches a student's `guardian_email`, they are linked automatically on signup or when a child is created
2. **Parent creates child** — `POST /api/parent/children` creates a student account and links it via `parent_students`
3. **Legacy signup** — Parent signup with `child_emails` (older flow; guardian email is preferred)

---

## How to Create / Extend the Parent Dashboard

### Architecture Pattern

The parent portal follows the same pattern as the student and coach dashboards:

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App Router  →  Zustand auth  →  Axios (cookies)    │
│         ↓                        ↓                          │
│  (parent)/layout.tsx      require_parent() on backend       │
│         ↓                        ↓                          │
│  ParentLayout shell       /api/parent/* endpoints           │
└─────────────────────────────────────────────────────────────┘
```

### Step-by-Step: Add a New Parent Page

Use this recipe whenever you add a new parent feature (e.g. attendance, child detail, settings).

#### 1. Backend — Add API endpoint

**File:** `backend/parent_endpoints.py`

```python
@router.get("/my-new-feature")
def get_my_feature(parent: User = Depends(require_parent), db: Session = Depends(get_db)):
    children_ids = _get_children_ids(parent.id, db)
    # Always scope data to parent's linked children only
    ...
    return result
```

**Rules:**
- Use `require_parent()` on every endpoint
- Use `_get_children_ids()` to scope queries — never return data for unlinked students
- Add Pydantic response schemas in `backend/schemas.py`
- Router is already registered in `backend/main.py` at prefix `/api/parent`

#### 2. Frontend — Add API client method

**File:** `frontend/lib/api.ts`

```typescript
export const parentAPI = {
  // ...existing methods
  getMyFeature: async (): Promise<MyFeatureType> => {
    const response = await api.get('/api/parent/my-new-feature');
    return response.data;
  },
};
```

#### 3. Frontend — Create the page

**File:** `frontend/app/(parent)/parent/<section>/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { parentAPI } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyFeaturePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentAPI.getMyFeature()
      .then(setData)
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader2 className="animate-spin" />;
  // render UI...
}
```

#### 4. Frontend — Add sidebar navigation

**File:** `frontend/components/parent/parent-sidebar.tsx`

Add an entry to `navItems`:

```typescript
{ label: "My Feature", icon: SomeIcon, href: "/parent/my-feature", color: "text-blue-400" },
```

#### 5. Test

- Add Playwright coverage in `frontend/tests/e2e/parent.spec.ts`
- Manually verify role guard: non-parent users must be redirected away from `/parent/*`

---

### Building the Parent Dashboard from Scratch (Greenfield Reference)

If you were starting fresh, these are the files and layers to create:

#### Frontend files

| File | Purpose |
|------|---------|
| `frontend/app/(parent)/layout.tsx` | Auth guard (`role === 'parent'`), load session, wrap in `ParentLayout` |
| `frontend/app/(parent)/parent/page.tsx` | Dashboard home |
| `frontend/components/parent/parent-layout.tsx` | Shell: sidebar + main content (`data-parent-shell`) |
| `frontend/components/parent/parent-sidebar.tsx` | Navigation + logout |
| `frontend/components/parent/parent-header.tsx` | Optional sticky header (exists but currently unused) |
| `frontend/lib/api.ts` | `parentAPI` module with typed methods |

#### Backend files

| File | Purpose |
|------|---------|
| `backend/parent_endpoints.py` | All `/api/parent/*` routes with `require_parent()` |
| `backend/schemas.py` | `ChildResponse`, `ParentChildCreate`, payment schemas, etc. |
| `backend/models.py` | `ParentStudent`, `Payment`, `StudentBatch`, `ClassSession`, `Announcement` |
| `backend/account_utils.py` | Guardian linking, `create_student_user()` |
| `backend/stripe_service.py` | Checkout sessions, webhook handling |
| `backend/auth.py` | JWT cookies, `get_current_user` |

#### Auth flows

| Flow | Entry point |
|------|-------------|
| Parent signup | `POST /api/auth/signup/parent` → `frontend/app/signup/page.tsx` (parent mode) |
| Parent login | `POST /api/auth/login` → redirect to `/parent` when `role === 'parent'` |
| Session restore | `loadSession()` in Zustand → `GET /api/auth/me` |

#### Layout auth guard (existing)

```tsx
// frontend/app/(parent)/layout.tsx
useEffect(() => {
  if (!isAuthenticated) router.push('/login');
  if (user?.role !== 'parent') {
    toast.error('Access denied. Parent account required.');
    router.push('/dashboard');
  }
}, [isAuthenticated, user]);
```

---

## Current Route Map & File Reference

### Frontend routes

| URL | File |
|-----|------|
| `/parent` | `frontend/app/(parent)/parent/page.tsx` |
| `/parent/children` | `frontend/app/(parent)/parent/children/page.tsx` |
| `/parent/classes` | `frontend/app/(parent)/parent/classes/page.tsx` |
| `/parent/announcements` | `frontend/app/(parent)/parent/announcements/page.tsx` |
| `/parent/payments` | `frontend/app/(parent)/parent/payments/page.tsx` |

### Backend API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/parent/dashboard` | Aggregated overview |
| `GET` | `/api/parent/children` | Linked children with batch + payment status |
| `POST` | `/api/parent/children` | Create student + link to parent |
| `GET` | `/api/parent/children/{child_id}/assignments` | Assignment completion summary |
| `GET` | `/api/parent/classes` | Class sessions for children's batches |
| `GET` | `/api/parent/announcements` | Announcements for children's batches |
| `POST` | `/api/parent/payments/create-checkout` | Stripe checkout session |
| `GET` | `/api/parent/payments/history` | Payment records |
| `POST` | `/api/parent/payments/webhook` | Stripe webhook |
| `GET` | `/api/attendance/child/{child_id}` | Child attendance (parent role) — **not wired to UI** |
| `POST` | `/api/auth/signup/parent` | Parent registration |

### Shared components & libs

| Path | Role |
|------|------|
| `frontend/lib/api.ts` | `parentAPI`, types (`ParentDashboard`, `ChildInfo`, etc.) |
| `frontend/lib/store.ts` | Zustand auth state |
| `frontend/lib/avatar.ts` | Avatar initials helper |
| `frontend/lib/user-email.ts` | Email display utilities |
| `frontend/app/globals.css` | `.parent-fonts`, `[data-parent-shell]` theme |
| `frontend/components/ConditionalNavbar.tsx` | Hides global navbar on `/parent/*` |

### E2E tests

`frontend/tests/e2e/parent.spec.ts` — signup as parent, dashboard, children, classes, payments.

---

## Page-by-Page Breakdown

### 1. Home (`/parent`)

- Welcome banner with parent name
- Payment overdue / near-deadline banners (deadline: 10th of month)
- Children cards: name, username, rating, level, XP, batch, payment status
- Upcoming classes (next sessions with meeting links)
- Recent announcements preview

### 2. Children (`/parent/children`)

- Grid of child cards with avatar, stats, batch info
- **Create child** form (username, password, name, age, gender, avatar)
- Top 3 assignments per child with completion status
- Uses raw `api.get()` for assignments (not yet in `parentAPI`)

### 3. Classes (`/parent/classes`)

- Upcoming and past class sessions
- Batch name, date/time, meeting link (external join)

### 4. Announcements (`/parent/announcements`)

- Coach announcements filtered by children's batches
- Batch filter dropdown

### 5. Payments (`/parent/payments`)

- Pay-now buttons per child/batch for current month
- Payment history table
- Stripe redirect on checkout success

---

## Data Models (Parent-Relevant)

### `users` table

| Field | Parent relevance |
|-------|------------------|
| `role` | `parent` |
| `email` | Parent login identifier |
| `guardian_email` | On students — links to parent accounts |
| `username` | Student login (not used for parents) |

### `parent_students` (junction)

```
parent_id → users.id (parent)
student_id → users.id (student)
```

### Related tables

| Model | Parent use |
|-------|------------|
| `StudentBatch` | Enrollment, `payment_status`, `is_active` |
| `Batch` | Class group, `monthly_fee` |
| `ClassSession` | Schedule, `meeting_link` |
| `Announcement` | Coach messages per batch |
| `Payment` | `parent_id`, `student_id`, `batch_id`, Stripe session |
| `Assignment` / `AssignmentCompletion` | Homework progress |
| `Attendance` | Per-session attendance (API exists) |

---

## Environment & Configuration

### Required env vars

**Backend** (`backend/.env`):

| Variable | Purpose |
|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL |
| `SECRET_KEY` | JWT signing |
| `FRONTEND_URL` | Stripe redirect URLs, email links |
| `SMTP_*` | Password reset emails to guardian email |

**Stripe** (used in `stripe_service.py`, not yet in `.env.example`):

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server-side Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |

**Frontend** (`frontend/.env.local`):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (defaults to `http://localhost:8000`) |

### Local development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

Parent portal: `http://localhost:3000/parent`

---

## Portal Tech Stack

Everything included in the Prodigy Pawns chess academy portal (student, coach, parent, and admin surfaces).

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** (App Router) | 16.x | React framework, routing, SSR/SSG |
| **React** | 19.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Framer Motion** | 12.x | Animations and transitions |
| **Lucide React** | 0.564+ | Icon set |
| **Axios** | 1.13+ | HTTP client (`withCredentials: true` for cookies) |
| **Zustand** | 5.x | Client state (auth session, UI) |
| **react-hot-toast** | 2.x | Toast notifications |
| **chess.js** | 1.4+ | Chess move validation and game logic |
| **react-chessboard** | 5.x | Interactive chess board UI |
| **socket.io-client** | 4.x | Real-time features (PvP, live updates) |
| **class-variance-authority**, **clsx**, **tailwind-merge** | — | Component styling utilities |
| **tailwindcss-animate** | 1.x | Animation utilities |
| **Playwright** | 1.59+ | End-to-end testing |
| **ESLint** + **eslint-config-next** | 9.x / 16.x | Linting |

**Fonts by portal:**
- Student dashboard: Fredoka + Nunito (kid-friendly)
- Coach & parent dashboards: Inter (professional)

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.104 | REST API framework |
| **Uvicorn** | 0.24 | ASGI server |
| **SQLAlchemy** | 2.0 | ORM |
| **PostgreSQL** (psycopg2-binary) | — | Primary database |
| **Pydantic** | 2.5 | Request/response validation |
| **python-jose** | 3.3 | JWT encode/decode |
| **passlib + bcrypt** | 1.7 | Password hashing |
| **python-dotenv** | 1.0 | Environment configuration |
| **python-multipart** | 0.0.6 | Form/file uploads |
| **python-chess** | 1.999 | Chess logic, FEN/PGN, move legality |
| **Stockfish** | (external binary) | Puzzle validation, bot moves, analysis |
| **Stripe** | 7.0 | Payment processing (parent portal) |
| **APScheduler** | 3.10 | Scheduled jobs (game timeouts, etc.) |

### Infrastructure & Services

| Service | Role |
|---------|------|
| **PostgreSQL** | Users, games, puzzles, batches, payments, attendance |
| **HttpOnly cookies** | JWT access (15 min) + refresh (7 days) — no tokens in JS |
| **SMTP (e.g. Resend)** | Password reset, guardian email notifications |
| **Stripe Checkout** | Monthly batch fee payments |
| **Stockfish** | Chess engine (local binary via `STOCKFISH_PATH`) |

### User Roles & Route Families

| Role | Route prefix | Backend guard |
|------|--------------|---------------|
| Student | `/dashboard`, `/play`, `/puzzles`, `/learn`, etc. | Auth only (frontend) |
| Coach / Admin | `/coach` | `require_coach()` |
| Parent | `/parent` | `require_parent()` |
| Public | `/`, `/login`, `/signup` | — |

### Core Domain Systems (All Portals)

| System | Description |
|--------|-------------|
| **Auth** | Cookie-based JWT, role-based access, guardian email linking |
| **Progression** | Rating → levels; XP from puzzles; stars economy (1 star = 250 XP) |
| **Puzzles** | Solve, hints (XP cost), Puzzle Racer |
| **Games** | PvP invites, bot games, analysis |
| **Batches** | Class groups, enrollment, payment status |
| **Assignments** | Coach-assigned homework with completion tracking |
| **Attendance** | Per-session tracking (coach marks; parent can view via API) |
| **Rewards / Star Shop** | XP-to-stars conversion, catalog purchases |
| **Bot system** | Profile versioning, calibration, telemetry |
| **Notifications** | Student notifications (parent notifications not yet built) |

---

## Improvements & Suggestions

### Priority: High (fix / complete existing work)

| # | Improvement | Why | Effort |
|---|-------------|-----|--------|
| 1 | **Fix parent payment redirect** | Known P0 bug in `payments/page.tsx` (lint/runtime policy violation) | Low |
| 2 | **Wire attendance UI** | `GET /api/attendance/child/{child_id}` exists; parents can't see it yet | Medium |
| 3 | **Add `parentAPI.getChildAssignments()`** | Children page uses raw Axios instead of typed `parentAPI` | Low |
| 4 | **Integrate `parent-header.tsx`** | Component exists but is orphaned — add notifications placeholder or remove | Low |
| 5 | **Fix currency display** | Backend uses USD; payments UI may show INR inconsistently | Low |
| 6 | **Document Stripe env vars** | Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `.env.example` | Low |

### Priority: Medium (feature parity with student/coach)

| # | Improvement | Why | Effort |
|---|-------------|-----|--------|
| 7 | **Child detail page** (`/parent/children/[id]`) | Deep view: games played, puzzle stats, rating history, full assignment list | High |
| 8 | **Parent settings / profile** | Change password, update name/email, notification preferences | Medium |
| 9 | **Parent notifications** | Payment reminders, class starting soon, new announcements, assignment due | High |
| 10 | **Shared loading/error components** | Each parent page duplicates spinner/empty-state patterns | Low |
| 11 | **Unlink / manage children** | Can create children but cannot remove a link | Medium |
| 12 | **Multiple batch per child** | Backend supports multiple `StudentBatch` rows; UI shows first active only | Medium |
| 13 | **Progress charts** | Rating/XP trends over time (parents want to see improvement) | High |
| 14 | **Print login cards** | ChessKid-style printable username/password cards for young children | Medium |

### Priority: Lower (polish & scale)

| # | Improvement | Why | Effort |
|---|-------------|-----|--------|
| 15 | **PIN login for young children** | Simpler than password for ages 5–8 (from account proposal) | High |
| 16 | **Onboarding wizard** | First-time parent: link children, explain payments, show how child logs in | Medium |
| 17 | **Mobile-first polish** | Sidebar works on mobile; card layouts could be tighter | Medium |
| 18 | **E2E: create-child + Stripe flows** | Current E2E covers happy path only | Medium |
| 19 | **Parent context provider** | Coach has `CoachStatsContext`; parent could cache dashboard data across pages | Medium |
| 20 | **Shop purchase visibility** | Parents see what children bought with stars (from `FUTURE_SCOPE.md`) | Medium |
| 21 | **Glicko-2 rating for parents** | When implemented, show more meaningful progress to parents | Depends on backend |
| 22 | **i18n / localization** | Support multiple languages for international academies | High |
| 23 | **Email digests** | Weekly summary: progress, upcoming classes, payment reminders | High |

### UX & Design Suggestions

1. **Dashboard home** — Add quick actions: "Pay now", "Join next class", "View child's latest game"
2. **Children page** — Click a child card to open detail page instead of showing everything inline
3. **Payment UX** — Show fee amount before redirecting to Stripe; confirm success/cancel states clearly
4. **Empty states** — When no children linked, guide parent to create child or contact coach
5. **Consistent theming** — Parent uses Inter + emerald green; align card shadows and spacing with coach dashboard
6. **Accessibility** — Ensure meeting links, payment buttons, and forms are keyboard-navigable

### Security Suggestions

1. **Always scope by `_get_children_ids()`** — Never expose another family's data
2. **Rate-limit child creation** — Prevent abuse of free account creation
3. **Audit log** — Track when parents view child data (optional, for compliance)
4. **COPPA-aware flows** — Minimize PII collected for children; guardian email only

### Testing Suggestions

| Test | Coverage |
|------|----------|
| Role guard | Non-parent cannot access `/parent/*` |
| Data isolation | Parent A cannot fetch Parent B's child attendance |
| Create child | Username uniqueness, guardian email auto-link |
| Payments | Stripe checkout redirect, webhook marks payment complete |
| Empty states | New parent with no children |

---

## Comparison: Student vs Coach vs Parent

| Aspect | Student | Coach | Parent |
|--------|---------|-------|--------|
| Route prefix | `/dashboard`, `/play`, etc. | `/coach` | `/parent` |
| Pages | 30+ | 15+ | 5 |
| Role guard | Auth only | coach/admin | parent only |
| API module | Many in `api.ts` | `coachAPI` | `parentAPI` (partial) |
| Font | Fredoka + Nunito | Inter | Inter |
| Doc | `STUDENT_DASHBOARD.md` | `COACH_DASHBOARD.md` | **This file** |
| Payments | — | Batch overview | Stripe checkout |
| Create accounts | Self-signup | Bulk create students | Create own children |

---

## Related Documentation

| Document | Path |
|----------|------|
| Parent & child account model (ChessKid-style) | `docs/PARENT_CHILD_ACCOUNT_PROPOSAL.md` |
| Student dashboard reference | `docs/STUDENT_DASHBOARD.md` |
| Coach dashboard reference | `docs/COACH_DASHBOARD.md` |
| Auth & sessions | `docs/AUTH_DOCUMENTATION.md` |
| Project overview & tech stack | `docs/PROJECT_OVERVIEW.md` |
| Technical design | `docs/TECHNICAL_DESIGN.md` |
| Project structure | `docs/PROJECT_STRUCTURE.md` |
| Known bugs | `docs/BUGS_AND_ERRORS_PRIORITY_TRACKER.md` |
| Future scope | `docs/FUTURE_SCOPE.md` |

---

## Quick Start Checklist

- [ ] Backend running with PostgreSQL and migrations applied
- [ ] `SECRET_KEY` and DB credentials in `backend/.env`
- [ ] Stripe keys configured for payments (optional for non-payment testing)
- [ ] Frontend `NEXT_PUBLIC_API_URL` points to backend
- [ ] Create parent account at `/signup` (parent mode) or via API
- [ ] Link children via guardian email or create from `/parent/children`
- [ ] Log in at `/login` → redirected to `/parent`
- [ ] Run E2E: `cd frontend && npm run test:e2e -- parent.spec.ts`

---

*Last updated: June 2026*
