# Bot Pipeline Audit

## Current End-to-End Flow

1. `POST /api/games/bot` in `backend/main.py` creates a `Game` with:
   - `bot_difficulty` (string id from frontend)
   - `bot_depth` (frontend-selected depth)
2. If bot is white, backend immediately calls `_make_bot_move_if_needed`.
3. During gameplay, frontend calls `POST /api/games/{id}/bot-move` after player move.
4. `_make_bot_move_if_needed`:
   - rebuilds board from PGN/FEN
   - validates turn ownership
   - calls Stockfish service for move selection
   - applies move, rebuilds PGN, updates result/rating

## Strength Knobs in Current Runtime

- `bot_depth` is stored on `games` and logged during move generation.
- `bot_difficulty` is mapped to an approximate target rating via `backend/bot_opponents.py`.
- `stockfish_service.choose_bot_move` currently controls behavior using:
  - depth scaling from rating
  - top-N candidate sampling
  - weak-bot random out-of-top-line picks
  - forced short-mate behavior

## Defaults / Fallbacks

- Missing `bot_depth` defaults to 15.
- Unknown bot id falls back to derived or mid rating.
- If Stockfish returns no best move:
  - choose first legal move fallback.

## Gaps Identified

- No versioned bot profile source-of-truth in DB.
- No rollout / canary controls for bot behavior updates.
- No structured per-move telemetry for calibration.
- No queue-backed bot worker orchestration.
- No automated Elo calibration jobs / acceptance gates.
