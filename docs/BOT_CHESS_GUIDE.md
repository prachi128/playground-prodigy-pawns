# Bot Chess Guide — Full Technical Reference (Updated)

Date: 2026-03-26  
Audience: Coaches, product owners, and engineers

This is the complete current-state guide for how bot chess works in Prodigy Pawns.

---

## 1) Executive Summary

- Bots are powered by **Stockfish**.
- Strength is no longer "depth only"; it is primarily controlled by:
  - bot target rating,
  - runtime policy/profile config,
  - top-N move sampling behavior,
  - optional opening-book behavior,
  - oversight/blunder knobs.
- Legacy 4-tier inputs still work, but production runtime supports a richer named-bot system and profile rollouts.

---

## 2) Bot Roster and Rating Mapping

Current named bot ids and nominal ratings:

| Bot ID | Rating |
|---|---:|
| `martin` | 400 |
| `elena` | 550 |
| `mika` | 700 |
| `ravi` | 950 |
| `nova` | 1100 |
| `diego` | 1250 |
| `astra` | 1450 |
| `irina` | 1600 |
| `viktor` | 1750 |
| `noor` | 1950 |
| `zeno` | 2100 |

Legacy difficulty compatibility (still accepted):

| Legacy difficulty | Mapped rating |
|---|---:|
| `beginner` | 400 |
| `intermediate` | 900 |
| `advanced` | 1450 |
| `expert` | 2000 |

Unknown id fallback:
- If depth is present: rough map `350 + depth * 85`, clamped to `[400, 2400]`.
- Otherwise fallback rating: `1200`.

---

## 3) Game Creation and Core Flow

### Bot game creation

Endpoint: `POST /api/games/bot`

Request shape:
```json
{
  "bot_difficulty": "martin",
  "bot_depth": 4,
  "player_color": "white"
}
```

Behavior:
- Creates game with:
  - `time_control = "unlimited"` (untimed bot mode),
  - `bot_difficulty`,
  - `bot_depth`.
- Uses special bot account: `username="__BOT__"`.
- If bot is white, backend immediately plays first move.

### Bot move trigger

Endpoint: `POST /api/games/{game_id}/bot-move`

Behavior:
- Validates membership and bot-game type.
- Enqueues a `bot_move_job`, marks processing, executes move, marks completed/failed.
- Returns updated game state.

### Optional worker/queue processing path

- Endpoint: `POST /api/admin/bots/jobs/process` (admin-only)
- Standalone loop: `backend/bot_worker_loop.py`
- Job runner logic: `backend/bot_worker.py`

---

## 4) Move Selection Model (Current Runtime)

Move generation path:
1. Rebuild board from PGN/FEN.
2. Resolve runtime profile (rollout config + target rating).
3. Try opening-book move (if line/prefix matches).
4. Else call `choose_bot_move(fen, bot_rating, profile_config)`.
5. Apply move, rebuild PGN, update FEN/move count/result.
6. Log telemetry per move.

### Strength knobs used by runtime

- `target_rating` (resolved from bot id/profile)
- Dynamic depth bounded by profile (`min_depth`, `max_depth`)
- `top_n` candidate moves
- weighted rank selection (weaker ratings sample lower-ranked lines more often)
- wild move probability cap
- tactical oversight rate
- blunder rate + severity
- short-mate forcing (`force_mate_in`)
- opening book choice (`openings.book_name`, `openings.max_ply`)

### What this means practically

- Higher nominal rating bots:
  - choose top lines more frequently,
  - blunder/oversight less,
  - act stronger and more stable.
- Lower nominal rating bots:
  - pick more sub-top moves,
  - can intentionally miss tactical best lines,
  - feel more "human beginner."

---

## 5) Opening Books

Opening books are lightweight UCI sequence templates.

- Default book plus bot-specific books currently configured for:
  - `martin`, `elena`, `noor`, and `default`.
- Opening move is chosen only when:
  - current move history matches a known prefix,
  - current ply is below configured `max_ply`,
  - next move is legal.

If no opening move matches, runtime falls back to Stockfish policy selection.

---

## 6) Fallback and Safety Behavior

- If no legal move exists: bot move skipped (game likely over).
- If Stockfish returns no candidates:
  - fallback to `get_best_move` if legal,
  - else random legal move.
- If PGN and `final_fen` are out of sync:
  - PGN-derived board is trusted,
  - `final_fen` is repaired.
- Bot games are untimed; no clock pressure logic like PvP timed games.

---

## 7) Rating, Levels, and Results

- Bot game completion updates game result as normal (`1-0`, `0-1`, `1/2-1/2`).
- **No rating/level updates for bot user games** in Elo updater path (bot exception logic).
- PvP rating logic remains separate.

---

## 8) Production Bot Platform (Profiles, Versions, Rollouts)

Production bot orchestration tables:
- `bot_profiles`
- `bot_profile_versions`
- `bot_profile_rollouts`
- `bot_calibration_runs`
- `bot_move_jobs`
- `bot_move_telemetry`

Key capabilities:
- Versioned config per bot.
- Traffic-based rollout (`traffic_percent`) with stable bucketing.
- Promote and rollback controls.
- Runtime config resolution merges defaults + version config.

Default runtime profile baseline:
- `policy_name: humanized_v1`
- `min_depth: 6`
- `max_depth: 18`
- `top_n: 10`
- `wild_move_probability_cap: 0.35`
- opening book and oversight model defaults.

---

## 9) Telemetry

Per move, telemetry captures:
- `bot_id`
- `profile_version_id`
- `target_rating`
- `selected_move_uci`
- `selected_rank`
- `eval_cp`
- `eval_loss_cp`
- `policy_name`
- `decision_meta_json`
- timestamps

Admin telemetry endpoints:
- `GET /api/admin/bots/telemetry/recent`
- `GET /api/admin/bots/telemetry/summary`

---

## 10) Calibration and Acceptance Gates

Calibration data sources:
- Primary: finished bot games in `games` (preferred).
- Optional fallback: telemetry proxy.

Calibration flow:
1. Create run: `POST /api/admin/bots/calibration-runs`
2. Execute run: `POST /api/admin/bots/calibration-runs/{run_id}/execute`

Important execute parameters:
- `sample_source=auto|games|telemetry`
- `games_scope=persona|profile_version`
- `min_samples` (default 80)
- `tolerance` (default 75)

Pass criteria (default):
- sample count >= 80, and
- confidence interval intersects target band `[target - 75, target + 75]`.

Coverage endpoint:
- `GET /api/admin/bots/calibration/coverage`

Run history endpoint:
- `GET /api/admin/bots/calibration-runs/recent`

---

## 11) Admin Operations API (Bots)

Main admin endpoints:
- Profiles:
  - `GET /api/admin/bots/profiles`
  - `POST /api/admin/bots/profiles`
- Versions:
  - `GET /api/admin/bots/profiles/{bot_id}/versions`
  - `POST /api/admin/bots/profiles/{bot_id}/versions`
- Rollouts:
  - `POST /api/admin/bots/rollouts`
  - `POST /api/admin/bots/profiles/{bot_id}/versions/{version_id}/promote`
  - `POST /api/admin/bots/profiles/{bot_id}/rollback`
- Calibration:
  - `POST /api/admin/bots/calibration-runs`
  - `POST /api/admin/bots/calibration-runs/{run_id}/execute`
  - `GET /api/admin/bots/calibration-runs/recent`
- Jobs:
  - `GET /api/admin/bots/jobs`
  - `POST /api/admin/bots/jobs/process`
- Telemetry:
  - `GET /api/admin/bots/telemetry/recent`
  - `GET /api/admin/bots/telemetry/summary`

---

## 12) Coach-Facing Interpretation

- Bot "difficulty" labels are now better interpreted as **rating bands with personality policies**, not only search depth.
- Two bots with similar depth can still feel different due to:
  - opening choices,
  - weighted top-N sampling,
  - oversight/blunder controls.
- For student progression, use bot rating bands as the primary signal.

---

## 13) Legacy vs Current Model (Important)

Legacy statement:
- "All difficulty comes from depth 5/10/15/20."

Current truth:
- Depth is one input, but behavior is driven by **rating + runtime policy + rollout config + opening book + sampling mechanics**.
- Legacy `beginner/intermediate/advanced/expert` mapping is still supported for compatibility.

---

## 14) Related Docs

- `docs/BOT_STRENGTH_CALIBRATION.md`
- `backend/docs/bot_pipeline_audit.md`
- `backend/docs/bot_rollout_runbook.md`

---

Last updated: 2026-03-26 (aligned to current backend/frontend bot runtime and admin pipeline).
