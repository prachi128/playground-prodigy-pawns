"""
Migration: add users.gender column ('girl' | 'boy' for students).
Run once with venv: python migrate_add_user_gender.py
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
encoded_password = quote_plus(DB_PASSWORD or "")
DATABASE_URL = f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)


def migrate():
    with engine.connect() as conn:
        r = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'gender'
        """))
        if r.fetchone():
            print("users.gender already exists, skipping")
            conn.commit()
            return
        conn.execute(text("ALTER TABLE users ADD COLUMN gender VARCHAR NULL"))
        conn.commit()
        print("Added users.gender column.")


if __name__ == "__main__":
    migrate()
