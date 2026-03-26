import hashlib
import json
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from bot_opponents import get_bot_rating_for_game
from models import (
    BotCalibrationRun,
    BotMoveJob,
    BotMoveTelemetry,
    BotProfile,
    BotProfileRollout,
    BotProfileVersion,
    Game,
)


DEFAULT_PROFILE_CONFIG: Dict[str, Any] = {
    "policy_name": "humanized_v1",
    "min_depth": 6,
    "max_depth": 18,
    "top_n": 10,
    "wild_move_probability_cap": 0.35,
    "force_mate_in": 2,
    "openings": {"book_name": "default", "max_ply": 8},
    "oversight_model": {
        "tactical_oversight_rate": 0.0,
        "blunder_rate": 0.0,
        "blunder_severity_cp": 0,
    },
}


def _stable_bucket(value: str) -> int:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % 100


def _select_rollout_version(db: Session, profile: BotProfile, game: Game) -> Optional[BotProfileVersion]:
    """
    Selects the latest enabled rollout version using stable bucketing by game id.
    """
    rows = (
        db.query(BotProfileRollout)
        .join(BotProfileVersion, BotProfileRollout.profile_version_id == BotProfileVersion.id)
        .filter(
            BotProfileVersion.profile_id == profile.id,
            BotProfileRollout.is_enabled == True,
        )
        .order_by(BotProfileRollout.created_at.desc())
        .all()
    )
    if not rows:
        return None
    bucket = _stable_bucket(f"{profile.bot_id}:{game.id}")
    for row in rows:
        if bucket < max(0, min(100, row.traffic_percent)):
            return row.profile_version
    return None


def resolve_runtime_profile(db: Session, game: Game) -> Dict[str, Any]:
    """
    Resolve active runtime config for a bot game.
    Falls back safely to default config + rating mapping.
    """
    bot_id = (game.bot_difficulty or "").strip().lower()
    target_rating = get_bot_rating_for_game(game.bot_difficulty, game.bot_depth)
    out: Dict[str, Any] = {
        "bot_id": bot_id or "unknown",
        "target_rating": target_rating,
        "profile_version_id": None,
        "policy_name": DEFAULT_PROFILE_CONFIG["policy_name"],
        "config": DEFAULT_PROFILE_CONFIG.copy(),
    }
    if not bot_id:
        return out
    profile = db.query(BotProfile).filter(BotProfile.bot_id == bot_id, BotProfile.is_active == True).first()
    if not profile:
        return out
    version = _select_rollout_version(db, profile, game)
    if not version:
        # fallback to latest active/approved version
        version = (
            db.query(BotProfileVersion)
            .filter(
                BotProfileVersion.profile_id == profile.id,
                BotProfileVersion.status.in_(["active", "approved"]),
            )
            .order_by(BotProfileVersion.version_number.desc())
            .first()
        )
    if not version:
        return out
    try:
        cfg = json.loads(version.config_json) if version.config_json else {}
    except Exception:
        cfg = {}
    merged = DEFAULT_PROFILE_CONFIG.copy()
    merged.update(cfg or {})
    out["profile_version_id"] = version.id
    out["policy_name"] = merged.get("policy_name", DEFAULT_PROFILE_CONFIG["policy_name"])
    out["config"] = merged
    return out


def enqueue_bot_move_job(db: Session, game_id: int, requested_by: Optional[int], priority: int = 100) -> BotMoveJob:
    job = BotMoveJob(
        game_id=game_id,
        requested_by=requested_by,
        status="pending",
        priority=priority,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def complete_bot_move_job(db: Session, job: BotMoveJob, success: bool, error_message: Optional[str] = None) -> None:
    job.status = "completed" if success else "failed"
    job.completed_at = datetime.utcnow()
    job.error_message = error_message
    db.commit()


def mark_job_processing(db: Session, job: BotMoveJob) -> None:
    job.status = "processing"
    job.started_at = datetime.utcnow()
    job.attempts = (job.attempts or 0) + 1
    db.commit()


def create_calibration_run(db: Session, profile_version_id: Optional[int], run_type: str = "simulation") -> BotCalibrationRun:
    row = BotCalibrationRun(
        profile_version_id=profile_version_id,
        status="queued",
        run_type=run_type,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def log_bot_move_telemetry(
    db: Session,
    *,
    game: Game,
    runtime_profile: Dict[str, Any],
    move_number: int,
    selected_move_uci: Optional[str],
    selected_rank: Optional[int],
    eval_cp: Optional[int],
    eval_loss_cp: Optional[int],
    decision_meta_json: Optional[str],
) -> None:
    row = BotMoveTelemetry(
        game_id=game.id,
        move_number=move_number,
        bot_id=runtime_profile.get("bot_id") or "unknown",
        profile_version_id=runtime_profile.get("profile_version_id"),
        target_rating=runtime_profile.get("target_rating"),
        selected_move_uci=selected_move_uci,
        selected_rank=selected_rank,
        eval_cp=eval_cp,
        eval_loss_cp=eval_loss_cp,
        policy_name=runtime_profile.get("policy_name"),
        decision_meta_json=decision_meta_json,
    )
    db.add(row)
    db.commit()
