-- Add draw-offer tracking fields for PvP handshake flow
ALTER TABLE games
ADD COLUMN IF NOT EXISTS draw_offered_by INTEGER REFERENCES users(id);

ALTER TABLE games
ADD COLUMN IF NOT EXISTS draw_offered_at TIMESTAMP NULL;
