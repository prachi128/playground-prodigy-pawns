-- Puzzle play format: lichess (setup move at index 0) vs direct (solve from fen).
ALTER TABLE puzzles
  ADD COLUMN IF NOT EXISTS puzzle_format VARCHAR(16) NOT NULL DEFAULT 'direct';

UPDATE puzzles
SET puzzle_format = 'lichess'
WHERE lichess_id IS NOT NULL
  AND (puzzle_format IS NULL OR puzzle_format = 'direct');
