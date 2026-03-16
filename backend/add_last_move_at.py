"""
Migration script to add last_move_at column to games table (for auto-resign timeout).
Run once: python add_last_move_at.py
"""
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os
from urllib.parse import quote_plus

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
encoded_password = quote_plus(DB_PASSWORD)
DATABASE_URL = f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)


def add_last_move_at():
    """Add last_move_at column to games table if it doesn't exist."""
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'games' AND column_name = 'last_move_at'
                    ) THEN
                        ALTER TABLE games ADD COLUMN last_move_at TIMESTAMP;
                    END IF;
                END $$;
            """))
            conn.commit()
            print("Successfully added last_move_at column to games table")
        except Exception as e:
            print(f"Error adding column: {e}")
            conn.rollback()
            raise


if __name__ == "__main__":
    add_last_move_at()
