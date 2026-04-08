# Puzzle Manual Test Plan (Coach + QA)

This document defines manual test scenarios for puzzle features, including:
- `Solve Puzzles` (random flow)
- `Puzzle Themes` (theme-based flow)
- `Puzzle Racer`
- Attempt exclusion logic
- Puzzle-only Glicko-2 rating behavior

Use this after full puzzle import is complete.

---

## 1) Scope

### In Scope
- Student puzzle landing page with 3 tiles.
- Theme listing and selection by difficulty.
- Random puzzle start + random next behavior.
- "Do not repeat attempted puzzle" behavior.
- Puzzle attempt correctness, XP award, and stats updates.
- Puzzle rating updates via Glicko-2 fields:
  - `puzzle_rating`
  - `puzzle_rating_rd`
  - `puzzle_rating_volatility`

### Out of Scope
- PvP/game rating updates (must remain untouched).
- Coach puzzle authoring workflows not related to student solving.

---

## 2) Test Environment Prerequisites

- Backend migrated with:
  - `add_puzzle_rating_and_themes.sql`
  - `add_puzzle_theme_perf_indexes.sql`
  - `add_puzzle_glicko2_user_fields.sql`
- Backend restarted after migrations.
- Frontend running latest code.
- Full puzzle import completed (all intended CSVs loaded).
- At least 2 student test accounts:
  - `Student A`: new/light activity (high RD expected).
  - `Student B`: many solved attempts (lower RD expected).
- 1 coach account for UAT.

---

## 3) Data Sanity Checks (Before UI Testing)

Run these checks in DB once:

1. Users table has puzzle Glicko fields and defaults.
2. `puzzle_themes` table has data and unique pairs `(puzzle_id, theme_key)`.
3. `puzzles` rows have valid `rating`, `fen`, and `moves`.
4. `puzzle_attempts` has index on `(user_id, puzzle_id)`.

Expected:
- No migration errors.
- No duplicate theme rows for same puzzle and theme.

---

## 4) Smoke Tests (Must Pass First)

1. Login as student -> open `/puzzles`.
2. Verify 3 tiles visible:
   - Solve Puzzles
   - Puzzle Themes
   - Puzzle Racer
3. Click each tile and confirm destination page loads.

Expected:
- No errors, no blank screens, no 500 API responses.

---

## 5) Solve Puzzles (Random Flow) Test Cases

### SP-01 Random start on entry
Steps:
1. Open `/puzzles/solve`.
2. Wait for loading.
Expected:
- A puzzle opens automatically.
- URL includes `mode=random`.
- Difficulty in URL matches user puzzle rating band.

### SP-02 Random next behavior
Steps:
1. Solve puzzle correctly.
2. Click `Next Puzzle`.
Expected:
- Next puzzle is different.
- Still random mode (`mode=random` remains).
- Should not be restricted to a single theme.

### SP-03 Random flow no-repeat (attempt exclusion)
Steps:
1. Solve/attempt 10+ random puzzles.
2. Continue clicking `Next Puzzle`.
Expected:
- Previously attempted puzzles do not reappear for same user.
- If pool exhausted, user gets graceful fallback/message.

### SP-04 Wrong attempt handling
Steps:
1. Submit wrong move sequence.
2. Observe response and retry behavior.
Expected:
- Attempt recorded as incorrect.
- No XP reward for wrong attempt.
- Puzzle rating decreases (or lower than prior value trend).

---

## 6) Puzzle Themes Flow Test Cases

### PT-01 Theme groups load by difficulty
Steps:
1. Open `/puzzles/themes`.
2. Switch tabs: All, Beginner, Intermediate, Advanced, Expert.
Expected:
- Theme groups update per tab.
- Only non-zero count themes shown.

### PT-02 Start selected theme
Steps:
1. Choose one theme tile (example: Endgame).
2. Solve puzzle and click `Next Puzzle`.
Expected:
- Next puzzle remains in same selected theme.
- Difficulty stays in selected band unless changed by user flow.

### PT-03 Theme exclusion logic
Steps:
1. Attempt multiple puzzles from same theme.
2. Keep advancing next puzzle.
Expected:
- Attempted puzzles are excluded for that user.
- No repeats in same theme flow.

### PT-04 Theme exhausted behavior
Steps:
1. Keep solving until theme pool at that level is exhausted.
Expected:
- Friendly fallback message/no-next behavior.
- No crash or infinite spinner.

---

## 7) Puzzle Racer Regression Cases

### PR-01 Racer starts normally
Steps:
1. Open `/puzzles/racer`.
2. Start race session.
Expected:
- Race initializes and puzzles load.

### PR-02 Attempt exclusion in racer seed
Steps:
1. Solve several racer puzzles.
2. Start another race.
Expected:
- Bootstrapped list should honor exclusion setting.

---

## 8) Glicko-2 Rating Validation (Puzzle Only)

### GR-01 Correct solve increases rating
Steps:
1. Record baseline from `/api/users/me/stats`:
   - `puzzle_rating`, `puzzle_rating_rd`, `puzzle_rating_volatility`
2. Solve a puzzle correctly.
3. Re-check stats.
Expected:
- `puzzle_rating` tends to increase.
- `puzzle_rating_updated_at` changes in DB.

### GR-02 Incorrect solve decreases rating
Steps:
1. Record baseline stats.
2. Submit incorrect attempt.
3. Re-check stats.
Expected:
- `puzzle_rating` tends to decrease.

### GR-03 RD convergence with activity
Steps:
1. Play 20-30 attempts as same student.
Expected:
- `puzzle_rating_rd` gradually trends downward (bounded by min clamp).

### GR-04 Volatility updates smoothly
Steps:
1. Alternate right/wrong over many attempts.
Expected:
- `puzzle_rating_volatility` changes gradually; no extreme jumps.

### GR-05 Game ratings unaffected
Steps:
1. Record user's `rating` (game rating).
2. Play puzzles only.
Expected:
- Game rating remains unchanged.

---

## 9) Performance Scenarios (After Full Import)

### PF-01 Theme load performance
Steps:
1. Open `/puzzles/themes`.
2. Capture API time for `/api/puzzle-themes` across tabs.
Expected target:
- Should remain responsive (ideally single-digit seconds).

### PF-02 Next puzzle latency
Steps:
1. In both random/theme flows, click `Next Puzzle` repeatedly.
Expected:
- Acceptable response without noticeable degradation.

### PF-03 Peak test with active imports complete
Steps:
1. After all CSVs imported, run full smoke + key flows.
Expected:
- No major regression from partial-import behavior.

---

## 10) Negative / Edge Cases

- User with no attempts and default puzzle rating.
- User with very high puzzle rating entering Expert band.
- Theme with very low inventory.
- No unseen puzzles left for chosen difficulty/theme.
- Session expiry mid-puzzle.
- Invalid puzzle id route manually entered.

Expected:
- Friendly fallback states, no crashes, no server 500.

---

## 11) Coach UAT Script (Ready to Share)

Ask coach to test in this order:

1. Login as student test account.
2. Verify 3 puzzle tiles and navigation.
3. Random flow: solve 5, intentionally fail 2, use next each time.
4. Theme flow: pick 2 themes, solve 3 each, verify no repeats.
5. Racer: run 1 session.
6. Report:
   - Any repeated attempted puzzle?
   - Any long loading (>10s perceived)?
   - Any wrong difficulty/theme puzzle shown?
   - Any incorrect XP/rating update feeling?

---

## 12) Bug Report Template

For every issue, capture:
- Account used:
- Page/URL:
- Puzzle id(s):
- Theme + difficulty:
- Expected:
- Actual:
- Repro steps:
- Screenshot/video:
- API endpoint + response (if available):

---

## 13) Exit Criteria (Go/No-Go)

Release is acceptable when:
- All smoke tests pass.
- No-repeat attempt logic confirmed in random + theme flows.
- Glicko-2 fields update correctly after right/wrong attempts.
- No critical errors in logs.
- Performance remains acceptable after full import.
