ALTER TABLE users
ADD COLUMN IF NOT EXISTS star_balance INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS shop_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    item_key VARCHAR(64) NOT NULL,
    item_name VARCHAR(128) NOT NULL,
    stars_spent INTEGER NOT NULL,
    delivery_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    purchased_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_shop_purchases_user_id ON shop_purchases(user_id);
