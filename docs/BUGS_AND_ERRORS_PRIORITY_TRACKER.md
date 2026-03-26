# Bugs and Errors Priority Tracker

Date: 2026-03-26  
Purpose: Single prioritized backlog of current bugs/errors to fix over time.

## P0 - Blockers (Fix First)

1. **Frontend lint parse error in Star Shop (breaks lint pipeline)**
- File: `frontend/components/dashboard/star-shop.tsx`
- Error: `Parsing error: Unexpected token`
- Impact: CI/lint gate red; blocks clean quality checks.
- Status: Open

2. **Parent payment redirect lint/runtime policy violation**
- File: `frontend/app/(parent)/parent/payments/page.tsx`
- Error: `react-hooks/immutability` around `window.location.href = result.checkout_url`
- Impact: Payment flow reliability + lint red.
- Status: Open

## P1 - High Risk Functional/React Rules

3. **`setState` inside effects flagged by React Hooks rules**
- Files:
  - `frontend/components/coach/coach-header.tsx`
  - `frontend/components/coach/coach-layout.tsx`
  - `frontend/components/dashboard/dashboard-layout.tsx`
  - `frontend/components/dashboard/quest-character.tsx`
  - `frontend/hooks/use-onboarding.ts`
- Error: `react-hooks/set-state-in-effect`
- Impact: Cascading renders and unstable behavior risk.
- Status: Open

4. **Impure render usage (`Math.random` / `Date.now`)**
- Files:
  - `frontend/components/dashboard/map-scenery.tsx`
  - `frontend/components/dashboard/adventure/PuzzleModal.tsx`
- Errors: `react-hooks/purity`
- Impact: Non-deterministic renders and subtle UI glitches.
- Status: Open

5. **Ref access during render**
- File: `frontend/components/dashboard/adventure-map.tsx`
- Error: `react-hooks/refs` (`gameRef.current` read in render)
- Impact: Stale values / render consistency issues.
- Status: Open

## P2 - Type Safety and Maintainability

6. **Large `no-explicit-any` debt**
- Scope: multiple frontend files (student chess pages, bot page, puzzles pages, API helpers, auth pages, etc.)
- Representative files:
  - `frontend/app/(student)/chess-game/[gameId]/page.tsx`
  - `frontend/app/(student)/chess-game/page.tsx`
  - `frontend/app/(student)/beat-the-bot/page.tsx`
  - `frontend/lib/api.ts`
  - `frontend/components/HintSystem.tsx`
- Impact: weak compile-time checks; regression risk.
- Status: Open

7. **Hook dependency warnings (`exhaustive-deps`)**
- Scope: many pages/components (coach, student, leaderboard, puzzles)
- Impact: stale closures / inconsistent updates.
- Status: Open

8. **Unused vars/imports and style issues**
- Rules: `no-unused-vars`, `prefer-const`, `no-unescaped-entities`
- Impact: noise, readability, slower reviews.
- Status: Open

## P3 - Performance and Next.js Quality

9. **`<img>` usage instead of optimized image component**
- Scope: several dashboard and student pages
- Rule: `@next/next/no-img-element`
- Impact: poorer LCP/bandwidth efficiency.
- Status: Open

10. **Anchor navigation where `Link` is expected**
- File: `frontend/components/dashboard/level-card.tsx`
- Rule: `@next/next/no-html-link-for-pages`
- Impact: inconsistent client navigation behavior.
- Status: Open

## Backend Environment / Tooling Warnings

11. **IDE import-resolution warnings in backend**
- Files: `backend/main.py`, `backend/models.py`, `backend/schemas.py`
- Symptom: `basedpyright` "Import could not be resolved"
- Impact: editor noise; usually interpreter/venv configuration issue.
- Status: Open (non-runtime blocker)

---

## Suggested Fix Order (Incremental)

1. Fix P0 items (Star Shop parse error, parent payment redirect issue).  
2. Resolve React Hook rule violations (P1: set-state-in-effect, purity, refs).  
3. Tackle `any` debt in top-risk gameplay pages (`/chess-game`, `/beat-the-bot`) first.  
4. Clean hook dependency warnings in same touched files.  
5. Sweep quality/perf rules (`img`, `Link`, unused vars).

---

## Source Snapshot

- Lint snapshot source: `npm run lint` on 2026-03-26
- Reported totals: **169 problems (75 errors, 94 warnings)**
