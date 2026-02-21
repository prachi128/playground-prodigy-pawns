"""
Migration script to add bot_difficulty and bot_depth columns to games table
"""
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os
from urllib.parse import quote_plus

# Load environment variables
load_dotenv()

# Get database credentials
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# URL-encode the password to handle special characters
encoded_password = quote_plus(DB_PASSWORD)

# Create database URL
DATABASE_URL = f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create engine
engine = create_engine(DATABASE_URL)

def add_bot_columns():
    """Add bot_difficulty and bot_depth columns to games table if they don't exist"""
    with engine.connect() as conn:
        # Check if columns exist and add them if they don't
        try:
            # Add bot_difficulty column
            conn.execute(text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='games' AND column_name='bot_difficulty'
                    ) THEN
                        ALTER TABLE games ADD COLUMN bot_difficulty VARCHAR;
                    END IF;
                END $$;
            """))
            
            # Add bot_depth column
            conn.execute(text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='games' AND column_name='bot_depth'
                    ) THEN
                        ALTER TABLE games ADD COLUMN bot_depth INTEGER;
                    END IF;
                END $$;
            """))
            
            conn.commit()
            print("Successfully added bot_difficulty and bot_depth columns to games table")
        except Exception as e:
            print(f"Error adding columns: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    add_bot_columns()
