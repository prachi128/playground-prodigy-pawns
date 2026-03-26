from datetime import datetime
from typing import Callable, Dict

from sqlalchemy.orm import Session

from models import BotMoveJob


def process_pending_jobs(
    db: Session,
    *,
    limit: int,
    execute_move_for_game: Callable[[int], None],
) -> Dict[str, int]:
    """
    Pull pending bot jobs in priority order and execute them.
    This is intentionally simple and can be run in a dedicated worker process.
    """
    rows = (
        db.query(BotMoveJob)
        .filter(BotMoveJob.status == "pending")
        .order_by(BotMoveJob.priority.asc(), BotMoveJob.created_at.asc())
        .limit(max(1, min(500, limit)))
        .all()
    )
    processed = 0
    failed = 0
    for job in rows:
        job.status = "processing"
        job.started_at = datetime.utcnow()
        job.attempts = (job.attempts or 0) + 1
        db.commit()
        try:
            execute_move_for_game(job.game_id)
            job.status = "completed"
            job.error_message = None
            processed += 1
        except Exception as exc:
            job.status = "failed"
            job.error_message = str(exc)
            failed += 1
        finally:
            job.completed_at = datetime.utcnow()
            db.commit()
    return {"processed": processed, "failed": failed}
