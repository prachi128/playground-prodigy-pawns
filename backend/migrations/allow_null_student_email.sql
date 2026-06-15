-- Students without a real email should not store internal placeholder addresses.
UPDATE users
SET email = NULL
WHERE email ILIKE '%@students.prodigypawns.internal';

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
