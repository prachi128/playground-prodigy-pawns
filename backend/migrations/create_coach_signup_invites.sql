CREATE TABLE IF NOT EXISTS coach_signup_invites (
  id SERIAL PRIMARY KEY,
  token VARCHAR(128) NOT NULL UNIQUE,
  email VARCHAR NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  used_by INTEGER NULL REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_signup_invites_token ON coach_signup_invites(token);
CREATE INDEX IF NOT EXISTS idx_coach_signup_invites_created_by ON coach_signup_invites(created_by);
