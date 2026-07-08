"""Add schedule_timezone to batches. Run once: python migrate_batch_timezone.py"""

from pathlib import Path
from sqlalchemy import text
from database import engine


def migrate():
    sql_path = Path(__file__).parent / "migrations" / "add_batch_schedule_timezone.sql"
    statements = [s.strip() for s in sql_path.read_text(encoding="utf-8").split(";") if s.strip()]
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
    print("Migration complete: batch schedule_timezone")


if __name__ == "__main__":
    migrate()
