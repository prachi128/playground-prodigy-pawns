ALTER TABLE users
ADD COLUMN IF NOT EXISTS puzzle_rating INTEGER NOT NULL DEFAULT 800;

CREATE TABLE IF NOT EXISTS puzzle_themes (
    id SERIAL PRIMARY KEY,
    puzzle_id INTEGER NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
    theme_key VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_puzzle_themes_puzzle_id ON puzzle_themes(puzzle_id);
CREATE INDEX IF NOT EXISTS ix_puzzle_themes_theme_key ON puzzle_themes(theme_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_puzzle_themes_puzzle_theme ON puzzle_themes(puzzle_id, theme_key);
