"""
Simple worker loop for bot move jobs.

Run as a dedicated process:
    python bot_worker_loop.py
"""

import os
import time

from database import SessionLocal
from bot_worker import process_pending_jobs
from main import _make_bot_move_if_needed, get_or_create_bot_user
from models import Game


POLL_SECONDS = float(os.getenv("BOT_WORKER_POLL_SECONDS", "1.5"))
BATCH_LIMIT = int(os.getenv("BOT_WORKER_BATCH_LIMIT", "50"))


def run_forever() -> None:
    while True:
        db = SessionLocal()
        try:
            bot_user = get_or_create_bot_user(db)

            def _exec(game_id: int) -> None:
                game = db.query(Game).filter(Game.id == game_id).first()
                if not game:
                    raise RuntimeError(f"Game not found: {game_id}")
                _make_bot_move_if_needed(game, db, bot_user.id)

            result = process_pending_jobs(db, limit=BATCH_LIMIT, execute_move_for_game=_exec)
            if result["processed"] == 0 and result["failed"] == 0:
                time.sleep(POLL_SECONDS)
        finally:
            db.close()


if __name__ == "__main__":
    run_forever()
