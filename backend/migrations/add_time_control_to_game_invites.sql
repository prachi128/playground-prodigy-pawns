-- Add time control to game invites so inviter-selected control is preserved
ALTER TABLE game_invites
ADD COLUMN IF NOT EXISTS time_control VARCHAR(32);

UPDATE game_invites
SET time_control = 'unlimited'
WHERE time_control IS NULL OR TRIM(time_control) = '';

ALTER TABLE game_invites
ALTER COLUMN time_control SET DEFAULT 'unlimited';
