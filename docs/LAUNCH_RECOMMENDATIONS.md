# Prodigy Pawns - Suggested Changes Before Launch

Date: 2026-04-30

This document captures the immediate launch recommendations discussed, grouped by urgency and execution value.

---

## Must Fix Before Launch (P0)

1. **Close current lint/blocking issues first**
   - Use `docs/BUGS_AND_ERRORS_PRIORITY_TRACKER.md` as the baseline.
   - Do not launch with red lint in core routes.

2. **Remove secret exposure in backend logs**
   - File: `backend/auth.py`
   - Remove startup logging that prints `SECRET_KEY` presence/length/preview.

3. **Eliminate insecure auth defaults**
   - File: `backend/auth.py`
   - Ensure no production fallback `SECRET_KEY` is accepted.

4. **Harden cookie settings for production**
   - File: `backend/main.py` (`_cookie_attrs()`)
   - Add production-safe cookie flags (including `secure` in production environments).

5. **Fix unfinished visible user flows**
   - `frontend/components/dashboard/settings-content.tsx` (profile update TODO)
   - `frontend/app/actions/update-progress.ts` (reward update TODO)
   - All visible CTAs should either work end-to-end or be hidden.

6. **Run release-gate tests for PvP and auth flows**
   - Follow `docs/PVP_E2E_TEST_MATRIX.md`
   - Verify launch-critical checks in `docs/LAUNCH_CHECKLIST.md`

---

## High-Value Enhancements (High ROI, If Time Allows)

1. **Production environment correctness**
   - Set real `NEXT_PUBLIC_API_URL` and production CORS allowlist.
   - Validate all required backend env vars and Stripe values.

2. **Observability and error tracking**
   - Add centralized error tracking.
   - Move from ad-hoc prints to structured logging.
   - Review broad `except Exception` handling to improve diagnostics.

3. **Operational readiness**
   - Finalize DB migration runbook and rollback plan.
   - Assign launch monitoring owner and bug triage owner.

4. **Frontend stability hardening**
   - Reduce `any` usage in gameplay-critical paths first.
   - Resolve key hook/dependency warnings in launch-critical pages.

---

## Practical Fast Launch Strategy

1. **Scope freeze**
   - Launch only stable modules required by academy users.

2. **Beta-flag risky modules**
   - Keep `Puzzle Racer` as beta/internal until fully validated.

3. **Go/No-Go gate**
   - All P0 items completed.
   - Core E2E suites pass.
   - No secret/logging hygiene violations.
   - Rollback plan documented.

---

## Suggested Next Step

Create a 48-hour execution plan with owners (`dev`, `QA`, `ops`) and status tracking for each P0 line item.
