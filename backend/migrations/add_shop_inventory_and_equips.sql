ALTER TABLE users
ADD COLUMN IF NOT EXISTS equipped_accessory_item_key VARCHAR(64);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS equipped_board_theme_item_key VARCHAR(64);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS equipped_trail_item_key VARCHAR(64);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS equipped_companion_item_key VARCHAR(64);

CREATE TABLE IF NOT EXISTS user_shop_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    item_key VARCHAR(64) NOT NULL,
    item_name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL,
    rarity VARCHAR(32) NOT NULL,
    purchased_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_shop_items_user_item UNIQUE (user_id, item_key)
);

CREATE INDEX IF NOT EXISTS ix_user_shop_items_user_id ON user_shop_items(user_id);
CREATE INDEX IF NOT EXISTS ix_user_shop_items_item_key ON user_shop_items(item_key);
