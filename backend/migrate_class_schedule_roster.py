"""
Add structured class schedule columns and session_students roster table.
Run once: python migrate_class_schedule_roster.py
"""

from pathlib import Path

from sqlalchemy import text

from database import engine


def migrate():
    migration_dir = Path(__file__).parent / "migrations"
    for name in (
        "add_class_schedule_and_session_roster.sql",
        "add_batch_schedule_timezone.sql",
    ):
        sql_path = migration_dir / name
        if not sql_path.exists():
            continue
        sql = sql_path.read_text(encoding="utf-8")
        statements = [s.strip() for s in sql.split(";") if s.strip()]
        with engine.begin() as conn:
            for stmt in statements:
                conn.execute(text(stmt))
        print(f"Applied: {name}")
    print("Migration complete: class schedule + session roster + timezone")


if __name__ == "__main__":
    migrate()
