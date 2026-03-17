-- Add per-player clock columns for 10+0 gameplay.
-- Run this against your database (e.g. psql -f add_game_clocks.sql).
-- Existing rows get 600000 (10 minutes) as default.

ALTER TABLE games ADD COLUMN IF NOT EXISTS white_time_ms INTEGER DEFAULT 600000;
ALTER TABLE games ADD COLUMN IF NOT EXISTS black_time_ms INTEGER DEFAULT 600000;

-- If your PostgreSQL version does not support IF NOT EXISTS, use:
-- ALTER TABLE games ADD COLUMN white_time_ms INTEGER DEFAULT 600000;
-- ALTER TABLE games ADD COLUMN black_time_ms INTEGER DEFAULT 600000;
-- (run once; omit if columns already exist)
