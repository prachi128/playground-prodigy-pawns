-- Guardian email on student accounts (parent contact; not used for student login)
ALTER TABLE users ADD COLUMN IF NOT EXISTS guardian_email VARCHAR;

CREATE INDEX IF NOT EXISTS idx_users_guardian_email ON users (LOWER(guardian_email))
WHERE guardian_email IS NOT NULL;
