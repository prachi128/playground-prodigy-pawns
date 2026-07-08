-- Optional contact fields on student accounts (coach-managed)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30);
