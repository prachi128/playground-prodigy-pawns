# Bot Strength Calibration Guide

This document explains how bot strength calibration works in Prodigy Pawns, what data you need, and what to do after collecting games.

## What "bot strength calibration" means

Calibration means checking whether a bot's observed performance matches its target rating label.

Example:
- Martin target rating: `400`
- Calibration target band: `400 +/- 75`
- If observed rating stays in-band with enough samples, profile passes.

In short, calibration is:
1. Collect game outcomes.
2. Estimate observed bot rating from those outcomes.
3. Accept/reject the bot profile against target + tolerance.

## Does playing 10 games against Martin help?

Yes, but only as an early signal.

- 10 games can reveal obvious problems (too strong/too weak).
- 10 games are **not enough** for reliable rating calibration.
- Current acceptance gate in backend uses `min_samples=80` by default.

Practical interpretation:
- `10 games`: smoke test only.
- `30-50 games`: directional confidence.
- `80+ games`: minimum for pass/fail gate.
- `150+ games`: much more stable for production decisions.

## Which games are used?

Primary source:
- Finished rows in `games` where one side is bot user `__BOT__`.
- Uses:
  - `games.result` (`1-0`, `0-1`, `1/2-1/2`)
  - human opponent rating from `users.rating`
  - bot persona id from `games.bot_difficulty`

Fallback source:
- Bot telemetry proxy (from eval loss), used only when requested or when no game samples exist in `auto` mode.

## Do we need to import games into `games` table?

For normal platform usage: **No manual import needed**.
- If users play bot games through app endpoints, rows already land in `games`.

For external datasets: **Yes, import or map into `games`-compatible records** if you want calibration to use them.

Minimum required fields for imported records:
- `white_player_id`, `black_player_id`
- `bot_difficulty` (for persona mapping, e.g. `martin`)
- `result`
- `ended_at`
- valid human opponent with meaningful `users.rating`

## Current calibration API flow

### 1) Create a calibration run

`POST /api/admin/bots/calibration-runs`

Example body:

```json
{
  "profile_version_id": 12,
  "run_type": "live_sample"
}
```

### 2) Execute calibration

`POST /api/admin/bots/calibration-runs/{run_id}/execute`

Useful query params:
- `sample_source=auto|games|telemetry` (default `auto`)
- `games_scope=persona|profile_version` (default `persona`)
- `min_samples=80`
- `tolerance=75`
- `games_limit=5000`

Recommended start:
- `sample_source=games`
- `games_scope=persona`

This stores:
- `estimated_rating`
- confidence band (`confidence_low`, `confidence_high`)
- `acceptance_passed`
- metadata in `summary_json`

## Should we run a script to improve accuracy?

Yes, recommended.

Calibration is better when run periodically as new games arrive.

Suggested routine:
- Run calibration nightly (or every few hours on active days).
- Keep a rolling window (for example, last 30-60 days).
- Use the same defaults (`min_samples`, `tolerance`) for consistency.
- Promote/rollback bot profile versions based on repeated passes/fails, not one-off spikes.

You can do this with:
- a cron job calling calibration endpoints, or
- an internal scheduled worker task.

## Recommended operating playbook (Martin example)

1. Collect at least `80` finished Martin games in-app.
2. Run calibration with `sample_source=games`.
3. Check whether confidence interval intersects `[325, 475]`.
4. If fail (too strong):
   - reduce strength knobs in profile config (more sub-top sampling, higher oversight/blunder for weak persona).
5. If fail (too weak):
   - tighten move quality (less randomization, stronger top-line preference).
6. Re-run after another batch of games.

## What "more accurate" really depends on

Accuracy mostly improves with:
- more outcome samples,
- better opponent rating quality (`users.rating` realism),
- stable time control and consistent gameplay conditions,
- avoiding mixed profiles without version-aware scoping.

Without enough games, calibration output is noisy even if the code path is correct.

## Our chosen approach (hybrid automation)

For current stage, use a hybrid model:
- automate data collection and run creation,
- keep human review before changing bot profiles.

Why this is the best fit now:
- sample sizes are still growing,
- one noisy batch can mislead fully automatic tuning,
- product feel (kid-friendly difficulty) matters in addition to Elo math.

### Workflow we will follow

1. Let players complete bot games normally (data lands in `games`).
2. At around `50` games for a bot/persona, admin clicks "Run Calibration".
3. Review result:
   - `calibration_samples`
   - `estimated_rating`
   - confidence interval
   - pass/fail status
4. Tune profile config if needed.
5. After reaching `80+` games, run calibration again.
6. Promote/rollback only after repeated stable outcomes.

This gives fast iteration at 50 games and stronger confidence at 80+ games.

## Can we copy chess.com bots/games and skip calibration?

Short answer: **No, not reliably**.

You can borrow ideas, but you cannot assume "same rating label => same strength" without local calibration.

Reasons:
- chess.com bot internals (personality/policies/openings/time behavior) are proprietary and not exactly reproducible.
- rating pools are platform-specific; a "400" on one platform is not guaranteed to match another.
- your users, time controls, and move request flow are different from chess.com.

What is possible:
- use public games as inspiration for openings/style,
- import external games as auxiliary data,
- use them for initial seeding only.

What is still required:
- calibrate against **your own environment** (your `games` outcomes),
- verify confidence bands before trusting rating labels in production.

## Do we need to calibrate forever?

Short answer: **yes, periodically** - but not with the same intensity forever.

Calibration should shift from active tuning to maintenance:
- early stage: frequent checks while profiles are unstable,
- mature stage: scheduled checks to catch drift.

Why periodic calibration still matters:
- student population and rating distribution change over time,
- bot configs/opening books may change,
- product flow changes (time controls, UI behavior, move latency) can affect outcomes,
- rating pools naturally drift.

## Practical long-term cadence

Use this as default operating policy:

1. **Early stage (current):**
   - run at ~50 games (directional check),
   - run again at 80+ games (confidence gate),
   - tune profile between runs as needed.

2. **After ~300-400 games per bot persona:**
   - move to weekly or biweekly calibration,
   - only retune if confidence band drifts meaningfully from target.

3. **Stable production (no major changes):**
   - run monthly maintenance calibration.

4. **Whenever profile/config changes:**
   - run immediate pre/post calibration (do not wait for schedule),
   - compare with previous baseline before promoting rollout.

## Is more data still useful after 300-400 games?

Yes.

- 300-400 games usually gives a strong baseline estimate.
- Additional data improves stability and helps detect slow drift.
- Large sample sizes reduce overreaction to short-term variance.

So the goal is not "stop calibration"; the goal is "calibrate less often, but consistently."
