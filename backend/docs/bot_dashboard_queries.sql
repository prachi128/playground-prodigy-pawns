-- Bot telemetry by bot id
SELECT
  bot_id,
  COUNT(*) AS moves,
  AVG(eval_loss_cp) AS avg_eval_loss_cp,
  AVG(selected_rank) AS avg_selected_rank
FROM bot_move_telemetry
GROUP BY bot_id
ORDER BY bot_id;

-- Queue health
SELECT
  status,
  COUNT(*) AS jobs
FROM bot_move_jobs
GROUP BY status
ORDER BY status;

-- Recent failed jobs
SELECT id, game_id, attempts, error_message, created_at, completed_at
FROM bot_move_jobs
WHERE status = 'failed'
ORDER BY completed_at DESC
LIMIT 100;

-- Calibration pass-rate
SELECT
  run_type,
  COUNT(*) AS runs,
  SUM(CASE WHEN acceptance_passed THEN 1 ELSE 0 END) AS passed
FROM bot_calibration_runs
GROUP BY run_type;
