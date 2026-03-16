"""
Migration: convert games.result from enum gameresult (win/loss/draw) to VARCHAR for PGN results (1-0, 0-1, 1/2-1/2).
Run once with venv: python migrate_games_result_to_string.py
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
        try:
            r = conn.execute(text("""
                SELECT data_type, udt_name
                FROM information_schema.columns
                WHERE table_name = 'games' AND column_name = 'result'
            """))
            row = r.fetchone()
            if not row:
                print("games.result column not found, skipping")
                conn.commit()
                return
            data_type, udt_name = row[0], row[1]
            if data_type == "character varying" or data_type == "varchar":
                print("games.result is already VARCHAR, nothing to do")
                conn.commit()
                return

            print(f"Converting games.result from {data_type}/{udt_name} to VARCHAR(20)...")
            conn.execute(text("ALTER TABLE games ADD COLUMN IF NOT EXISTS result_new VARCHAR(20)"))
            conn.execute(text("""
                UPDATE games
                SET result_new = CASE
                    WHEN result::text = 'draw' THEN '1/2-1/2'
                    WHEN result::text = 'win' AND winner_id = white_player_id THEN '1-0'
                    WHEN result::text = 'win' AND winner_id = black_player_id THEN '0-1'
                    WHEN result::text = 'loss' AND winner_id = black_player_id THEN '1-0'
                    WHEN result::text = 'loss' AND winner_id = white_player_id THEN '0-1'
                    WHEN result::text IN ('win','loss') THEN COALESCE(
                        CASE WHEN winner_id = white_player_id THEN '1-0' ELSE '0-1' END,
                        '1-0'
                    )
                    ELSE NULL
                END
            """))
            conn.execute(text("ALTER TABLE games DROP COLUMN result"))
            conn.execute(text("ALTER TABLE games RENAME COLUMN result_new TO result"))
            conn.commit()
            print("Successfully converted games.result to VARCHAR(20)")
        except Exception as e:
            print(f"Error: {e}")
            conn.rollback()
            raise


if __name__ == "__main__":
    migrate()
