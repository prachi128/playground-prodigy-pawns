# Coach Puzzle UAT - Quick Checklist

Use this short checklist for fast manual validation after all puzzles are imported.

Estimated time: 20-30 minutes.

---

## 1) Basic Access

- [ ] Login works for student test account.
- [ ] Open `/puzzles`.
- [ ] See exactly 3 tiles:
  - [ ] Solve Puzzles
  - [ ] Puzzle Themes
  - [ ] Puzzle Racer

---

## 2) Solve Puzzles (Random Mode)

- [ ] Click `Solve Puzzles` and puzzle opens automatically.
- [ ] Solve 3 puzzles correctly.
- [ ] Intentionally fail 2 puzzles.
- [ ] Click `Next Puzzle` after each attempt.
- [ ] Confirm no previously attempted puzzle repeats.
- [ ] Confirm flow still feels random (not stuck to one theme).

Pass if:
- No repeats in attempted puzzles.
- No crashes/spinners that do not recover.

---

## 3) Puzzle Themes

- [ ] Open `Puzzle Themes`.
- [ ] Verify difficulty tabs load (All/Beginner/Intermediate/Advanced/Expert).
- [ ] Pick Theme A (example: Endgame), solve 3 puzzles.
- [ ] Click `Next Puzzle` each time.
- [ ] Confirm next stays in same theme.
- [ ] Pick Theme B (example: Fork), solve 3 puzzles.
- [ ] Confirm no repeats of attempted puzzles.

Pass if:
- Theme continuity is correct.
- No-repeat logic works.

---

## 4) Puzzle Racer

- [ ] Open `Puzzle Racer`.
- [ ] Start one race session.
- [ ] Solve a few puzzles.
- [ ] Confirm page is functional and responsive.

Pass if:
- Racer flow starts and runs without blocking issues.

---

## 5) Rating Behavior (Puzzle Only)

- [ ] Record puzzle rating before attempts.
- [ ] Solve a puzzle correctly and verify rating tends to increase.
- [ ] Fail a puzzle and verify rating tends to decrease.
- [ ] (Optional) Check stats API for RD/volatility updates.

Pass if:
- Correct and wrong outcomes affect puzzle rating directionally as expected.

---

## 6) Performance Quick Check

- [ ] `Puzzle Themes` page opens in acceptable time.
- [ ] `Next Puzzle` actions are reasonably fast in both random + theme modes.

Pass if:
- No major delay/regression noticed by tester.

---

## 7) Report Format (Send back to dev team)

Please send:

1. Overall result: `PASS` / `PASS with issues` / `FAIL`
2. Any bug with:
   - Page/URL
   - Steps to reproduce
   - Expected vs actual
   - Screenshot/video
3. Severity:
   - `Critical` (blocks flow)
   - `Major` (wrong behavior)
   - `Minor` (cosmetic/small UX)

---

## 8) Optional Notes

- Mention if puzzle difficulty felt too easy/hard for account level.
- Mention if any repeated puzzle appeared after it was attempted.
