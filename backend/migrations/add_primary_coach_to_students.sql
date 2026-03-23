ALTER TABLE users
ADD COLUMN primary_coach_id INTEGER NULL;

CREATE INDEX IF NOT EXISTS ix_users_primary_coach_id
ON users (primary_coach_id);
