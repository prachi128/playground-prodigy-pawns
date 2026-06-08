"""Set missing defaults on users rows (e.g. after manual SQL INSERT)."""
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
import os

load_dotenv()
pw = quote_plus(os.getenv("DB_PASSWORD", ""))
url = (
    f"postgresql://{os.getenv('DB_USER')}:{pw}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)
engine = create_engine(url)
SQL = """
UPDATE users SET
  total_xp = COALESCE(total_xp, 0),
  star_balance = COALESCE(star_balance, 0),
  level = COALESCE(level, 1),
  rating = COALESCE(rating, 100),
  puzzle_rating = COALESCE(puzzle_rating, 800),
  puzzle_rating_rd = COALESCE(puzzle_rating_rd, 350.0),
  puzzle_rating_volatility = COALESCE(puzzle_rating_volatility, 0.06),
  puzzle_rating_updated_at = COALESCE(puzzle_rating_updated_at, NOW()),
  avatar_url = COALESCE(avatar_url, '/avatars/default.png'),
  is_active = COALESCE(is_active, true),
  created_at = COALESCE(created_at, NOW()),
  last_login = COALESCE(last_login, NOW())
WHERE total_xp IS NULL OR rating IS NULL OR created_at IS NULL
   OR star_balance IS NULL OR level IS NULL OR is_active IS NULL
   OR avatar_url IS NULL OR puzzle_rating IS NULL
"""
with engine.connect() as conn:
    result = conn.execute(text(SQL))
    conn.commit()
    print(f"Fixed {result.rowcount} user row(s) with missing defaults")
