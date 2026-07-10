"""Create payment_billing_adjustments table."""
from pathlib import Path
import os
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

pw = quote_plus(os.getenv("DB_PASSWORD", ""))
url = (
    f"postgresql://{os.getenv('DB_USER')}:{pw}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)
sql = Path(__file__).parent.joinpath("migrations", "add_payment_billing_adjustments.sql").read_text()
engine = create_engine(url)
with engine.connect() as conn:
    conn.execute(text(sql))
    conn.commit()
print("payment_billing_adjustments migration applied")
