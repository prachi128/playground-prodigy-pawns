# XP, Stars, Rating, and Level Audit

Date: 2026-03-26  
Scope: Verify whether XP system and Star system (with rating and level) work correctly, and document how values are added/deducted.

## Test Verdict

- XP system: **Working in backend puzzle flow** (award on solve, deduction on hints).
- Rating system: **Working for PvP games** (Elo updates applied to both players).
- Level system: **Working and driven by rating only** (not by XP).
- Star system: **Working with persistent backend wallet + shop deduction**.

## Tests Executed

Command run from `backend`:

`.\venv\Scripts\python -m pytest tests/test_star_wallet_shop_flow.py tests/test_schema_sanity.py tests/test_rating_level_system.py tests/test_xp_system_flow.py`

Result:
- 13 passed
- 0 failed

## How XP Is Added and Deducted

### XP Additions

1. Puzzle solve endpoint: `POST /api/puzzles/{puzzle_id}/attempt`
2. Backend logic:
   - Base XP = `puzzle.xp_reward`
   - Hint penalty on solved attempts = `hints_used * 2`
   - Minimum awarded XP floor = `5` (`max(5, xp_reward - penalty)`)
3. XP is added to user:
   - `current_user.total_xp += xp_earned`

### XP Deductions

1. Hint endpoint: `POST /api/puzzles/{puzzle_id}/hint`
2. XP cost is provided by hint service (`xp_cost`), with documented levels:
   - Level 1 hint: 2 XP
   - Level 2 hint: 4 XP
   - Level 3 hint: 8 XP
3. Validation:
   - If user XP is below cost, request fails (`400 Not enough XP`).
4. Deduction:
   - `user.total_xp -= xp_cost`

## How Rating Is Added and Deducted

1. Ratings are updated after finished PvP games using Elo in `update_ratings_after_game`.
2. Rules:
   - K-factor = `32`
   - Minimum rating floor = `100`
   - Result mapping: win/loss/draw (`1-0`, `0-1`, `1/2-1/2`)
3. Update math:
   - White gain/loss = `K * (actual - expected)`
   - Black gets inverse of white delta
4. Bot exception:
   - If either player username is `__BOT__`, rating and level are not changed.

## How Levels Are Added and Deducted

There is no direct level add/deduct operation.  
Level is **derived from rating bands** only:

- Level 1 starts at rating 100
- Level 2 starts at 300
- Level 3 starts at 500
- ...
- Level 15 starts at 2900+

Whenever rating changes, level is recalculated from rating.

## How Stars Are Added and Deducted

### Rules now implemented

- Conversion rate: `1 star = 200 XP` (`XP_PER_STAR = 200`).
- Stars are persisted per user in `users.star_balance`.
- XP-to-star conversion endpoint:
  - `POST /api/rewards/convert-xp-to-stars`
  - Deducts XP (`stars * 200`) and adds to `star_balance`.
- Wallet endpoint:
  - `GET /api/rewards/wallet`
  - Returns XP, stars, and convertible amount.
- Shop purchase endpoint:
  - `POST /api/shop/purchase`
  - Deducts stars from wallet and writes `shop_purchases` row.
- Shop catalog endpoint:
  - `GET /api/shop/catalog`
  - Returns purchasable items and current star balance.

### Current frontend behavior

- Dashboard Star Shop now uses live API data.
- Students can convert XP to stars and purchase items from the dashboard shop preview.
- Rating and stars are now visually separate in core UI surfaces (header/sidebar).

## Practical Conclusion

- XP, rating, level, and stars now have backend-backed add/deduct logic.
- Shop purchases are persisted and deduct stars correctly.
- Star Collector lesson reward persistence is still separate and can be wired into this wallet in a follow-up.
