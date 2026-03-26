# PvP Bug Register (`/chess-game`)

This register tracks all identified PvP flow issues from code audit, runtime traces, and current tests.

## Critical

1. **Invite accept could 500 due naive/aware datetime compare**
- Symptom: `TypeError: can't compare offset-naive and offset-aware datetimes` in `accept_game_invite`.
- Status: **Fixed**
- Fix: normalize invite expiry datetime to UTC-aware before comparison.

2. **Frontend runtime init-order crashes**
- Symptom: `Cannot access 'PREVIEW_START_FEN' before initialization` and `Cannot access 'inGame' before initialization`.
- Status: **Fixed**
- Fix: moved declarations above first usage.

3. **Sender not auto-entering game after invite accepted (race)**
- Symptom: accepter enters game; sender remains on lobby and only sees Resume after refresh/poll.
- Status: **Fixed**
- Current behavior: sender auto-enters accepted invite game inline without refresh.

4. **Ghost "invite accepted" / stale invite auto-load risk**
- Symptom: users can see accept/start behavior from stale accepted records.
- Status: **Mitigated**
- Current behavior: session pending-id gate prevents random stale auto-starts in normal flow.
- Residual risk: still relies on dual polling loops.

## High

5. **Dual polling loops create race windows**
- `loadInvites()` and `checkForAcceptedInvites()` run independently every 2s.
- Status: **Open**
- Risk: inconsistent ordering, missed transitions, or stale UI decisions.
- Next fix: single poll loop for all invites; derive pending/accepted views from one snapshot.

6. **Active game can be vulnerable to background invite events**
- Status: **Mitigated**
- Current behavior: when already in game, accepted invites are marked handled and do not interrupt.
- Next fix: explicit queue/notification UX for "new accepted invite while playing".

7. **Resume banner freshness lag**
- Status: **Fixed (feature removed)**
- Current behavior: no resume banner; `/chess-game` auto-enters ongoing PvP game directly.

## Medium

8. **Security-sensitive key preview logged at startup**
- Symptom: auth startup prints `SECRET_KEY preview`.
- Status: **Open**
- Risk: secret handling hygiene issue; logs may leak sensitive metadata.
- Next fix: remove key preview logging entirely.

9. **Console encoding crash risk from emoji logs in some terminals**
- Symptom: cp1252 encoding error when printing emoji in auth log lines during tests.
- Status: **Open**
- Workaround used: force `PYTHONIOENCODING=utf-8`.
- Next fix: remove emoji logs or ensure plain ASCII logging in backend startup.

## Low / Quality

10. **Frontend `/chess-game` still has `any` types and hook-dependency warnings**
- Status: **Open**
- Risk: maintainability/regression risk.
- Next fix: type hardening and hook dependency cleanup.

11. **No true browser automation yet for two-user PvP race conditions**
- Status: **Open**
- Next fix: introduce Playwright multi-context E2E suite.

12. **Draw flow was previously immediate (no handshake)**
- Status: **Fixed**
- Current behavior: `Offer Draw` -> opponent sees dialog with `Accept` or `Reject`.
- Accept ends game as draw; reject closes offer and sender gets rejection toast.

13. **Timed games started from wrong default clock (10:00)**
- Status: **Fixed**
- Current behavior: clocks initialize from selected time control (`3+0`, `5+0`, `10+0`, etc.).

14. **Clock timeout did not always auto-award win**
- Status: **Fixed**
- Current behavior: when timed clock reaches zero, game auto-ends and opponent wins (`result_reason=timeout`).

15. **Only one premove supported**
- Status: **Fixed**
- Current behavior: multiple premoves can be queued and are executed in order when legal.

16. **Coaches not visible/invitable in friend search**
- Status: **Fixed**
- Current behavior: students can find and invite coaches by username/full name in PvP flow.

---

## Recommended Work Order

1. Unify invite polling and implement transition-based accepted detection.
2. Remove secret preview + emoji startup logs.
3. Add browser E2E suite for two-user invite/accept/resume race scenarios.
4. Clean remaining TypeScript and hook warnings in PvP page.
5. Remove secret preview + emoji startup logs in backend auth output.
