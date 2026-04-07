# Prodigy Pawns - Launch Checklist

Date: 2026-04-01  
Purpose: Single launch-readiness checklist for academy release of `ProdigyPawns`.

This checklist consolidates open issues, release gates, product gaps, testing needs, operational readiness, and lower-priority items pulled from current project docs and code.

---

## 1. Launch Decision

Use these buckets during launch planning:

- **Blocker**: must be completed before academy launch.
- **High Priority**: should be completed before launch unless intentionally deferred with explicit sign-off.
- **Medium Priority**: desirable before launch, but can be launched with controlled risk if validated manually.
- **Low Priority**: safe to defer to post-launch roadmap.

---

## 2. Blockers

### Frontend quality and release gate

- [ ] Fix `frontend/components/dashboard/star-shop.tsx` parse/lint-breaking error.
- [ ] Fix `frontend/app/(parent)/parent/payments/page.tsx` redirect implementation issue so payment flow is reliable and lint-safe.
- [ ] Verify the frontend lint pipeline passes cleanly for launch-critical areas.
- [ ] Verify there are no runtime-breaking syntax errors in any student, parent, coach, or dashboard pages.

### PvP release gate

- [ ] Verify backend invite lifecycle tests pass.
- [ ] Verify backend draw-flow tests pass.
- [ ] Verify backend clock-timeout tests pass.
- [ ] Execute the full PvP browser/manual release gate from `docs/PVP_E2E_TEST_MATRIX.md`.
- [ ] Confirm there are no backend `500` errors during invite, accept, move, draw, resign, and timeout flows.
- [ ] Fix the dual polling loop issue in `/chess-game`, or explicitly accept and document the risk before launch.

### Security and logging hygiene

- [ ] Remove any backend startup logging that reveals `SECRET_KEY` preview or secret-derived metadata.
- [ ] Replace or remove emoji-based backend startup logs that can break in some terminal encodings.
- [ ] Confirm production logs do not expose secrets, tokens, cookies, or sensitive payment/user metadata.

### Must-not-ship unfinished user flows

- [ ] Implement or hide the unfinished profile save flow in `frontend/components/dashboard/settings-content.tsx`.
- [ ] Implement or remove placeholder reward update flow in `frontend/app/actions/update-progress.ts`.
- [ ] Verify every visible CTA in student, coach, parent, and dashboard surfaces either works end-to-end or is hidden before launch.

---

## 3. High Priority Before Launch

### Core user journeys

- [ ] Verify signup, login, logout, refresh, and session restore work cleanly.
- [ ] Verify role-based access works for `student`, `coach`, `admin`, and `parent`.
- [ ] Verify protected routes redirect correctly for unauthenticated users.
- [ ] Verify parent account flows work with linked children and role enforcement.

### Student gameplay and learning flows

- [ ] Verify puzzle list, filtering, solving, and attempt submission work end-to-end.
- [ ] Verify XP rewards are correct for solved puzzles.
- [ ] Verify hint flow deducts XP correctly and enforces balance rules.
- [ ] Verify puzzle failure and skip behavior work correctly.
- [ ] Verify `Beat the Bot` game creation, move flow, completion, and review work.
- [ ] Verify bot games never interfere with PvP routing and resume behavior.
- [ ] Verify chess legality, move history, result states, and post-game review behave correctly.

### PvP functional hardening

- [ ] Verify invite create/accept/reject lifecycle works between two student accounts.
- [ ] Verify sender auto-enters accepted game without refresh.
- [ ] Verify there is no ghost auto-start from stale accepted invites.
- [ ] Verify active in-progress games are not replaced by background invite events.
- [ ] Verify reopening `/chess-game` auto-loads active human PvP games only.
- [ ] Verify `/beat-the-bot` only auto-loads bot games.
- [ ] Verify time control displays correctly and clocks start with the selected control.
- [ ] Verify timeout adjudication awards the correct winner.
- [ ] Verify draw offer/accept/reject flow works reliably.
- [ ] Verify premove queue behavior is stable.
- [ ] Verify coach discoverability and coach invite flow work if this is part of academy usage.

### Rewards economy and shop

- [ ] Verify XP-to-stars conversion works correctly at `1 star = 250 XP`.
- [ ] Verify wallet balances update correctly after conversion and purchase.
- [ ] Verify shop purchases create persistent records correctly.
- [ ] Verify purchase notifications work as expected.
- [ ] Verify insufficient balance protection works for conversion and purchases.
- [ ] Verify star shop items, pricing, labels, and availability are academy-ready.

### Parent and payments

- [ ] Verify parent dashboard loads correct child/class/progress data.
- [ ] Verify payment page works end-to-end in the intended environment.
- [ ] Verify payment success, failure, and cancellation states are handled clearly.
- [ ] Verify no broken or placeholder payment UI is visible to parents.

### Coach/admin operations

- [ ] Verify puzzle CRUD flows work for coaches/admins.
- [ ] Verify puzzle analysis/validation tooling works.
- [ ] Verify student/batch/admin operations needed by the academy are functional.
- [ ] Verify coach-facing dashboards show correct student data.
- [ ] Verify any planned academy operational workflows are documented for coaches/admins.

---

## 4. Medium Priority Before Launch

### Puzzle Racer readiness

- [ ] Decide whether `Puzzle Racer` is part of launch or should be labeled beta/internal-preview.
- [ ] If launching `Puzzle Racer`, verify room create/join/start/update-score/reset flows work with multiple users.
- [ ] Verify countdown, timer sync, score sync, leave/rejoin rules, and end screen work correctly.
- [ ] Verify host/non-host behavior is understandable and free of obvious dead ends.
- [ ] Confirm academy users accept current limitations:
  - in-memory room state,
  - no room cleanup,
  - beginner-only difficulty,
  - client-side shuffled puzzle order,
  - polling-based eventual score consistency,
  - backend still allows solo start for testing.

### Type/lint debt in high-risk surfaces

- [ ] Reduce `no-explicit-any` debt in high-risk gameplay pages.
- [ ] Resolve hook dependency warnings in pages/components that drive gameplay and auth-sensitive behavior.
- [ ] Resolve `setState`-in-effect issues in dashboard/coach flows where they may create unstable behavior.
- [ ] Resolve purity/ref-rule issues in gameplay/dashboard components where they may cause subtle UI bugs.
- [ ] Clean unused imports/vars and style issues in files touched for launch.

### Next.js and frontend quality

- [ ] Replace critical `<img>` usages with optimized image handling where it meaningfully affects launch UX.
- [ ] Fix anchor navigation where framework-native `Link` behavior is expected.
- [ ] Verify there are no hydration or render-order issues in launch-critical routes.
- [ ] Verify mobile/tablet layouts for student and parent experiences if academy users depend on them.

### Backend and environment consistency

- [ ] Confirm backend dependencies and environment variables are documented and complete.
- [ ] Resolve import-resolution/editor setup issues for the backend if they are hiding real problems.
- [ ] Verify DB migrations required for launch have been applied.
- [ ] Verify startup, health endpoint, and background scheduler behavior in the target deployment environment.

---

## 5. Product and Content Readiness

### Academy launch scope

- [ ] Freeze the exact feature list included in academy launch.
- [ ] Decide which features are production-ready vs beta vs hidden.
- [ ] Confirm whether `Puzzle Racer`, parent payments, bot laddering, and coach invite flows are in launch scope.
- [ ] Confirm whether any legacy dashboard variants or deleted prototype directories are intentionally excluded from release artifacts.

### Data and content quality

- [ ] Verify puzzle inventory is sufficient for launch students.
- [ ] Verify bot difficulty lineup is calibrated for the academy's student range.
- [ ] Verify any shop catalog content is appropriate and up to date.
- [ ] Verify labels, copy, onboarding text, and parent/coaching language are academy-appropriate.
- [ ] Remove or hide placeholder, demo, or prototype content.

### Documentation alignment

- [ ] Make sure user-facing behavior matches current docs.
- [ ] Update any stale docs that still reference outdated XP/level assumptions or retired flows.
- [ ] Ensure support/runbook documentation exists for the academy team using the app.

---

## 6. Testing and Verification

### Current automated status

- [x] Playwright E2E coverage has been executed for all three primary panels:
  - student: `frontend/tests/e2e/student.spec.ts`
  - coach: `frontend/tests/e2e/coach.spec.ts`
  - parent: `frontend/tests/e2e/parent.spec.ts`
- [x] Current E2E result snapshot:
  - student suite passing (`5/5`)
  - coach suite passing (`1/1`)
  - parent suite passing (`1/1`)
- [x] Backend puzzle reward/validation regression coverage passed in `backend/tests/test_xp_system_flow.py`, including SAN/UCI normalization cases.
- [ ] Preserve this green test state by rerunning these suites before final production launch sign-off.

### Automated checks

- [ ] Run frontend lint and ensure launch-critical surfaces are clean.
- [ ] Run backend unit/integration suites for invites, draw flow, timeout logic, and other core domains.
- [ ] Run any available tests for auth, puzzles, rewards, and bot systems.
- [ ] Record pass/fail status for each suite before launch sign-off.

### Manual regression checklist

- [ ] Student account: onboarding, dashboard, puzzles, PvP, bot, progress, settings.
- [ ] Parent account: child linkage, dashboard, payments, announcements/progress visibility.
- [ ] Coach account: dashboard, student access, puzzle management, academy workflows.
- [ ] Admin account: operational access and any required management flows.
- [ ] Cross-browser sanity check for the browsers the academy will actually use.
- [ ] Verify the app under realistic network conditions and multiple simultaneous users where needed.

### Release sign-off evidence

- [ ] Capture screenshots or notes for major passing flows.
- [ ] Track unresolved risks explicitly.
- [ ] Get final sign-off from product/academy owner on any knowingly deferred issue.

---

## 7. Operational Readiness

### Deployment and environment

- [ ] Confirm production/staging environment variables are present and correct.
- [ ] Confirm backend, frontend, and database deployment steps are documented.
- [ ] Confirm database backup/restore expectations for launch.
- [ ] Confirm the deployment target is appropriate for current architecture constraints.

### Monitoring and support

- [ ] Verify health checks are working.
- [ ] Verify error logs are accessible and monitored.
- [ ] Verify bot telemetry and operational dashboards are available if bot play is in launch scope.
- [ ] Define who will monitor the app during the launch window.
- [ ] Define how bug reports from students, parents, and coaches will be captured and triaged.

### Bot rollout operations

- [ ] If new bot versions are launching, follow staged rollout guidance.
- [ ] Verify calibration run pass criteria for any updated bot profile versions.
- [ ] Verify bot queue latency and failure rate are within acceptable thresholds.
- [ ] Confirm rollback steps are known before launch.

---

## 8. Release Cleanup

- [ ] Review the current git working tree and confirm all deletions/changes are intentional before shipping.
- [ ] Remove dead prototype artifacts from deployment if they are no longer needed.
- [ ] Confirm no hidden broken imports or references remain after deleting old dashboard variants.
- [ ] Verify global styling changes in `frontend/app/globals.css` did not regress visible screens.
- [ ] Remove feature flags, stubs, or dead code that could confuse launch behavior where practical.

---

## 9. Known Risks to Explicitly Accept If Launching

Only launch with these items if they are consciously accepted by the academy owner:

- [ ] `Puzzle Racer` room state is in-memory and non-durable.
- [ ] `Puzzle Racer` has no automatic room cleanup.
- [ ] `Puzzle Racer` puzzle difficulty is hardcoded to beginner.
- [ ] PvP still relies on polling rather than push-based realtime infrastructure.
- [ ] Some frontend lint/type debt may remain outside the most critical paths.
- [ ] Coach-facing aggregate progression views are still evolving.
- [ ] Parent/payment flows may require tighter production hardening depending on real usage.

---

## 10. Low Priority Items (Safe to Defer Post-Launch)

### Product evolution

- [ ] Adaptive puzzle difficulty based on student performance.
- [ ] Dedicated puzzle rating system and richer progression modeling.
- [ ] Glicko-2-based player/puzzle ratings.
- [ ] Richer matchmaking, rematches, mini-matches, and variants.
- [ ] Coach live spectating and post-game annotation tools.
- [ ] Richer child-friendly endgame feedback and celebratory UX.

### Realtime and scaling

- [ ] WebSocket migration for invites, notifications, and live game state.
- [ ] Rich presence indicators.
- [ ] Push notifications instead of polling.
- [ ] Scaling architecture for hundreds of concurrent players.
- [ ] Redis/DB-backed durable multiplayer room state for `Puzzle Racer`.

### Rewards and commerce maturity

- [ ] Configurable shop catalog windows, stock control, and seasonal rewards.
- [ ] Purchase lifecycle states such as `pending`, `approved`, `ordered`, `shipped`, `delivered`, and `cancelled`.
- [ ] Parent/coach visibility into purchase lifecycle.
- [ ] Anti-abuse guardrails, anomaly detection, and audit logs for rewards.
- [ ] Fulfillment integrations for real-world gift operations.

### Bot platform maturity

- [ ] Stronger calibration confidence methods and periodic scheduled recalibration.
- [ ] Student-to-bot recommendation logic.
- [ ] More advanced bot fairness and engagement dashboards.
- [ ] Stricter rollout governance and richer promotion dashboards.

### Analytics and reporting

- [ ] Unified coach progression analytics combining rating, level, XP, and stars.
- [ ] Trend lines, milestone views, and intervention flags for coaches.
- [ ] Broader academy operational dashboards and service-level reporting.

### Engineering quality improvements

- [ ] Full browser E2E automation for PvP, rewards, parent payments, and bot journeys.
- [ ] Broader cleanup of `any` usage and non-critical lint warnings across the frontend.
- [ ] Full documentation versioning cadence across product and technical docs.
- [ ] Non-critical performance optimizations and image/component modernization.

---

## 11. Final Go-Live Checklist

Mark this section only when launch is imminent:

- [ ] Scope frozen.
- [ ] Blockers resolved.
- [ ] High-priority launch flows verified.
- [ ] Required migrations applied.
- [ ] Environment variables confirmed.
- [ ] Rollback plan documented.
- [ ] Monitoring owner assigned.
- [ ] Known risks documented and accepted.
- [ ] Academy owner sign-off received.
- [ ] Go live.
