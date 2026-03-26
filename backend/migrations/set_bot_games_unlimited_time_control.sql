-- Normalize historical bot games to untimed mode.
-- Safe: only touches rows explicitly marked as bot games.

BEGIN;

UPDATE games
SET time_control = 'unlimited'
WHERE bot_difficulty IS NOT NULL
  AND COALESCE(time_control, '') <> 'unlimited';

COMMIT;

