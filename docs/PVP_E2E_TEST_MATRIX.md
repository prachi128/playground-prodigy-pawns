# PvP E2E Test Matrix (Play with Friends)

This matrix is intended as the release gate for `/chess-game` inline PvP flow.

## Environment

- Backend running and migrated (including `add_time_control_to_game_invites.sql`).
- Frontend running.
- Two student users available: `student_a`, `student_b`.
- Optional third user for multi-invite race cases: `student_c`.

## Automated Backend Suites (already present)

Run:

```bash
python -m unittest tests.test_game_invite_time_control tests.test_game_invite_lifecycle tests.test_game_invite_create_validation tests.test_game_draw_flow tests.test_game_clock_timeout
```

Coverage:
- invite creation validation
- invite acceptance/rejection lifecycle
- time control propagation and fallback
- timezone-naive/aware expiry handling
- draw offer/accept lifecycle
- draw reject lifecycle
- clock timeout auto-win adjudication

## Manual/Browser E2E Scenarios

### A. Invite create + accept core path
1. Open `/chess-game` as `student_a`.
2. Send invite to `student_b` with `5+0`.
3. Open `/chess-game` as `student_b`.
4. Accept invite.
5. Verify both users auto-enter same inline game board.
6. Verify game `time_control` shown/loaded as `5+0`.

Expected:
- No refresh required.
- Both boards reflect same move count and turn.
- Sender should no longer land on initial invite screen after acceptance.
- Sender should auto-enter the same inline game directly.

### B. No ghost auto-start
1. Ensure no new invite is sent.
2. Open `/chess-game` for both users.
3. Wait >= 15 seconds.

Expected:
- No "Invite accepted" toast.
- No spontaneous game load.

### C. Sender active game should not be replaced
1. `student_a` and `student_b` start a game.
2. While `student_a` is still in that game, have `student_c` accept another invite sent earlier by `student_a`.

Expected:
- `student_a` current active board is NOT replaced.
- no forced game switch.
- if additional accepted invite exists, it should not interrupt current board state.

### D. Auto-enter ongoing game (no resume banner)
1. Start a PvP game and leave `/chess-game` (navigate away or re-login).
2. Return to `/chess-game`.

Expected:
- page should directly open the ongoing inline game.
- user should not be able to start a new invite while that game is ongoing.

3. If game ended (result set) before returning, reopen `/chess-game`.

Expected:
- no ongoing-game auto-open occurs.
- user lands on invite/search screen and can start a new game.

### E. Bot and PvP separation
1. Keep one ongoing bot game.
2. Open `/chess-game`.

Expected:
- `/chess-game` should never auto-load bot games.
- `/beat-the-bot` should only auto-load bot games.

### F. Move UX parity checks
In active PvP game, verify:
- legal move dots
- capture square highlight
- check king red highlight
- promotion choice modal (Q/R/B/N)
- move history updates after each move

### G. Result states
Validate:
- resign from either side
- checkmate end
- draw by offer/accept handshake:
  - player A clicks `Offer Draw`
  - player B sees draw dialog with `Accept` / `Reject`
  - player B accepts and game ends as draw
  - OR player B rejects and game continues

Expected:
- status/result panel updates correctly
- board/polling do not oscillate
- no stale "in progress" after terminal result
- draw offer clears when a move is made instead of accepting
- when draw is rejected, offer sender sees "draw rejected" toast

### H. Query-param entry path
1. Open `/chess-game?gameId=<active_pvp_game_id>`.

Expected:
- specific game loads inline.

2. Open `/chess-game/[gameId]` for friend game via old link.

Expected:
- redirected to `/chess-game?gameId=...` and loads inline.

### I. Duplicate invite edge cases
1. Try self-invite.
2. Try duplicate pending invite.
3. Try invite unsupported role account (for example parent/admin).

Expected:
- backend validation messages appear, no invalid state created.

### J. Clock display + timeout adjudication
1. Start a `5+0` game.
2. Verify both clocks start from `05:00` (not `10:00`).
3. Let one side run out of time without resign/draw/move.

Expected:
- active side clock ticks down once game starts.
- when a clock reaches `00:00`, game auto-ends with timeout.
- opponent is declared winner automatically.

### K. Multi-premove queue behavior
1. In a live game, while waiting for opponent move, queue 2-3 premoves.
2. Let opponent move and observe turn returning.

Expected:
- queued premoves execute in order when legal.
- illegal queued premoves are skipped/cancelled safely.
- queue indicator updates as premoves are consumed.

### L. Coach discoverability in invite search
1. Open `/chess-game` as a student.
2. Search for a coach username.
3. Send invite to coach and accept from coach account.

Expected:
- coach appears in search results with username/full name.
- invite creation to coach succeeds.
- coach receives invite and can accept normally.

## Release Gate

Do not release PvP changes unless:
- backend invite suites pass
- backend draw flow suite passes
- backend clock timeout suite passes
- scenarios A through L pass in browser verification
- no 500s in backend logs during invite/accept/move/resign
