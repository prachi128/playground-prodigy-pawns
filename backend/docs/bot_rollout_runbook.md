# Bot Rollout Runbook

## Rollout stages

1. Create new profile version (`/api/admin/bots/profiles/{bot_id}/versions`).
2. Promote with 5% traffic (`/api/admin/bots/profiles/{bot_id}/versions/{version_id}/promote?traffic_percent=5`).
3. Monitor telemetry summary and calibration run.
4. Increase to 25%, then 100% if gates pass.

## Rollback

- Use `/api/admin/bots/profiles/{bot_id}/rollback` to restore previous active rollout.

## Statistical gates

- Run `/api/admin/bots/calibration-runs` then `/api/admin/bots/calibration-runs/{run_id}/execute`.
- Default pass criteria:
  - samples >= 80
  - confidence interval intersects `[target - 75, target + 75]`

## Latency SLO

- Target p95 bot move response <= 2.0s for active queue path.
- Investigate when failed jobs > 1% or queue backlog > 200 pending jobs.
