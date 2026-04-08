-- Performance indexes for grouped puzzle theme counting and filtered fetches.
-- Safe to run multiple times.

CREATE INDEX IF NOT EXISTS ix_puzzles_is_active_rating ON puzzles(is_active, rating);
CREATE INDEX IF NOT EXISTS ix_puzzle_themes_theme_key_puzzle_id ON puzzle_themes(theme_key, puzzle_id);
CREATE INDEX IF NOT EXISTS ix_puzzle_attempts_user_puzzle ON puzzle_attempts(user_id, puzzle_id);
