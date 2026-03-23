from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv
import os
from urllib.parse import quote_plus
from models import Base

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

# Database setup — pool_pre_ping avoids long hangs on stale connections; connect_timeout caps wait
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all tables
Base.metadata.create_all(bind=engine)


REQUIRED_SCHEMA_COLUMNS = {
    "users": {"primary_coach_id"},
}


def validate_required_schema() -> None:
    """
    Validate runtime-critical schema columns so startup fails with a
    clear migration message instead of failing on first request.
    """
    inspector = inspect(engine)
    missing_items = []
    for table_name, required_columns in REQUIRED_SCHEMA_COLUMNS.items():
        if not inspector.has_table(table_name):
            missing_items.append(f"{table_name} (table missing)")
            continue
        existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
        for column_name in required_columns:
            if column_name not in existing_columns:
                missing_items.append(f"{table_name}.{column_name}")
    if missing_items:
        missing = ", ".join(missing_items)
        raise RuntimeError(
            "Database schema is missing required columns: "
            f"{missing}. Run backend migrations before starting the API."
        )

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
