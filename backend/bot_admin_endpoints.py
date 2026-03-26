import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import (
    BotCalibrationRun,
    BotMoveJob,
    BotMoveTelemetry,
    BotProfile,
    BotProfileRollout,
    BotProfileVersion,
    Game,
    User,
    UserRole,
)
from bot_calibration import run_acceptance_gate
from bot_calibration_sources import build_calibration_samples
from schemas import (
    BotCalibrationRunCreate,
    BotCalibrationRunResponse,
    BotMoveTelemetryResponse,
    BotProfileCreate,
    BotProfileResponse,
    BotProfileRolloutCreate,
    BotProfileRolloutResponse,
    BotProfileVersionCreate,
    BotProfileVersionResponse,
)


router = APIRouter(prefix="/api/admin/bots", tags=["admin-bots"])


def require_admin(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRole.admin, "admin"]:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


@router.get("/calibration/coverage")
def calibration_coverage(
    bot_id: Optional[str] = None,
    target_samples: int = 80,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Return finished game counts per bot persona to track calibration readiness.
    Counts games where one side is the internal bot user and result is final.
    """
    bot_user = db.query(User).filter(User.username == "__BOT__").first()
    if not bot_user:
        return {"target_samples": max(1, target_samples), "rows": []}

    q = db.query(
        func.lower(Game.bot_difficulty).label("bot_id"),
        func.count(Game.id).label("finished_games"),
    ).filter(
        (Game.white_player_id == bot_user.id) | (Game.black_player_id == bot_user.id),
        Game.bot_difficulty.isnot(None),
        Game.ended_at.isnot(None),
        Game.result.in_(["1-0", "0-1", "1/2-1/2"]),
    )
    if bot_id:
        q = q.filter(func.lower(Game.bot_difficulty) == bot_id.lower())

    rows = (
        q.group_by(func.lower(Game.bot_difficulty))
        .order_by(func.lower(Game.bot_difficulty).asc())
        .all()
    )

    target = max(1, target_samples)
    return {
        "target_samples": target,
        "rows": [
            {
                "bot_id": r.bot_id,
                "finished_games": int(r.finished_games or 0),
                "remaining_to_target": max(0, target - int(r.finished_games or 0)),
                "ready": int(r.finished_games or 0) >= target,
            }
            for r in rows
        ],
    }


@router.get("/profiles", response_model=List[BotProfileResponse])
def list_profiles(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(BotProfile).order_by(BotProfile.bot_id.asc()).all()


@router.post("/profiles", response_model=BotProfileResponse)
def create_profile(
    payload: BotProfileCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(BotProfile).filter(BotProfile.bot_id == payload.bot_id.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bot profile already exists")
    row = BotProfile(
        bot_id=payload.bot_id.lower(),
        display_name=payload.display_name,
        target_rating=payload.target_rating,
        is_active=True,
        updated_at=datetime.utcnow(),
    )
    db.add(row)
    db.flush()
    initial = BotProfileVersion(
        profile_id=row.id,
        version_number=1,
        config_json=json.dumps({"policy_name": "humanized_v1"}),
        status="draft",
        created_by=admin.id,
    )
    db.add(initial)
    db.commit()
    db.refresh(row)
    return row


@router.get("/profiles/{bot_id}/versions", response_model=List[BotProfileVersionResponse])
def list_profile_versions(
    bot_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    profile = db.query(BotProfile).filter(BotProfile.bot_id == bot_id.lower()).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Bot profile not found")
    return (
        db.query(BotProfileVersion)
        .filter(BotProfileVersion.profile_id == profile.id)
        .order_by(BotProfileVersion.version_number.desc())
        .all()
    )


@router.post("/profiles/{bot_id}/versions", response_model=BotProfileVersionResponse)
def create_profile_version(
    bot_id: str,
    payload: BotProfileVersionCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    profile = db.query(BotProfile).filter(BotProfile.bot_id == bot_id.lower()).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Bot profile not found")
    latest = (
        db.query(BotProfileVersion)
        .filter(BotProfileVersion.profile_id == profile.id)
        .order_by(BotProfileVersion.version_number.desc())
        .first()
    )
    next_version = (latest.version_number if latest else 0) + 1
    row = BotProfileVersion(
        profile_id=profile.id,
        version_number=next_version,
        config_json=payload.config_json,
        status=payload.status,
        created_by=admin.id,
    )
    db.add(row)
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


@router.post("/rollouts", response_model=BotProfileRolloutResponse)
def create_rollout(
    payload: BotProfileRolloutCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    version = db.query(BotProfileVersion).filter(BotProfileVersion.id == payload.profile_version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Profile version not found")
    row = BotProfileRollout(
        profile_version_id=payload.profile_version_id,
        traffic_percent=payload.traffic_percent,
        is_enabled=payload.is_enabled,
        note=payload.note,
        started_at=datetime.utcnow() if payload.is_enabled else None,
        created_by=admin.id,
    )
    if payload.is_enabled:
        db.query(BotProfileRollout).filter(
            BotProfileRollout.profile_version_id == payload.profile_version_id,
            BotProfileRollout.is_enabled == True,
        ).update({"is_enabled": False, "ended_at": datetime.utcnow()}, synchronize_session=False)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/calibration-runs", response_model=BotCalibrationRunResponse)
def create_calibration_run(
    payload: BotCalibrationRunCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if payload.profile_version_id is not None:
        version = db.query(BotProfileVersion).filter(BotProfileVersion.id == payload.profile_version_id).first()
        if not version:
            raise HTTPException(status_code=404, detail="Profile version not found")
    row = BotCalibrationRun(
        profile_version_id=payload.profile_version_id,
        status="queued",
        run_type=payload.run_type,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/calibration-runs/{run_id}/execute", response_model=BotCalibrationRunResponse)
def execute_calibration_run(
    run_id: int,
    target_rating: int = 1200,
    tolerance: int = 75,
    min_samples: int = 80,
    sample_source: str = "auto",
    games_scope: str = "persona",
    games_limit: int = 5000,
    telemetry_limit: int = 2000,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.query(BotCalibrationRun).filter(BotCalibrationRun.id == run_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Calibration run not found")

    if sample_source not in ("auto", "games", "telemetry"):
        raise HTTPException(status_code=400, detail="sample_source must be auto, games, or telemetry")
    if games_scope not in ("persona", "profile_version"):
        raise HTTPException(status_code=400, detail="games_scope must be persona or profile_version")

    target_for_gate = target_rating
    resolved_bot_id = None
    if row.profile_version_id is not None:
        version = db.query(BotProfileVersion).filter(BotProfileVersion.id == row.profile_version_id).first()
        if version:
            profile = db.query(BotProfile).filter(BotProfile.id == version.profile_id).first()
            if profile:
                target_for_gate = profile.target_rating
                resolved_bot_id = profile.bot_id

    row.status = "running"
    row.started_at = datetime.utcnow()
    db.commit()

    samples, source_meta = build_calibration_samples(
        db,
        profile_version_id=row.profile_version_id,
        target_rating=target_for_gate,
        sample_source=sample_source,
        games_scope=games_scope,
        games_limit=max(1, min(50_000, games_limit)),
        telemetry_limit=max(1, min(5000, telemetry_limit)),
    )

    report = run_acceptance_gate(
        samples=samples,
        target_rating=target_for_gate,
        tolerance=tolerance,
        min_samples=min_samples,
    )

    row.estimated_rating = report.estimated_rating
    row.confidence_low = report.confidence_low
    row.confidence_high = report.confidence_high
    row.acceptance_passed = report.acceptance_passed
    row.summary_json = json.dumps(
        {
            "calibration_samples": report.samples,
            "target_rating": target_for_gate,
            "target_rating_query_param": target_rating,
            "tolerance": tolerance,
            "min_samples": min_samples,
            "source_meta": source_meta,
            "bot_id": resolved_bot_id,
        }
    )
    row.status = "completed"
    row.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


@router.get("/calibration-runs/recent")
def list_recent_calibration_runs(
    bot_id: Optional[str] = None,
    limit: int = 50,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(BotCalibrationRun).order_by(BotCalibrationRun.created_at.desc())
    if bot_id:
        profile = db.query(BotProfile).filter(BotProfile.bot_id == bot_id.lower()).first()
        if not profile:
            return {"runs": []}
        version_ids = [v.id for v in db.query(BotProfileVersion).filter(BotProfileVersion.profile_id == profile.id).all()]
        if not version_ids:
            return {"runs": []}
        q = q.filter(BotCalibrationRun.profile_version_id.in_(version_ids))

    rows = q.limit(max(1, min(500, limit))).all()
    return {
        "runs": [
            {
                "id": r.id,
                "profile_version_id": r.profile_version_id,
                "status": r.status,
                "run_type": r.run_type,
                "estimated_rating": r.estimated_rating,
                "confidence_low": r.confidence_low,
                "confidence_high": r.confidence_high,
                "acceptance_passed": r.acceptance_passed,
                "summary_json": r.summary_json,
                "started_at": r.started_at,
                "completed_at": r.completed_at,
                "created_at": r.created_at,
            }
            for r in rows
        ]
    }


@router.post("/profiles/{bot_id}/versions/{version_id}/promote")
def promote_profile_version(
    bot_id: str,
    version_id: int,
    traffic_percent: int = 5,
    note: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    profile = db.query(BotProfile).filter(BotProfile.bot_id == bot_id.lower()).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Bot profile not found")
    version = (
        db.query(BotProfileVersion)
        .filter(BotProfileVersion.id == version_id, BotProfileVersion.profile_id == profile.id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Profile version not found")

    db.query(BotProfileRollout).join(
        BotProfileVersion, BotProfileRollout.profile_version_id == BotProfileVersion.id
    ).filter(
        BotProfileVersion.profile_id == profile.id,
        BotProfileRollout.is_enabled == True,
    ).update({"is_enabled": False, "ended_at": datetime.utcnow()}, synchronize_session=False)

    rollout = BotProfileRollout(
        profile_version_id=version.id,
        traffic_percent=max(0, min(100, traffic_percent)),
        is_enabled=True,
        note=note or f"Promoted by admin {admin.id}",
        started_at=datetime.utcnow(),
        created_by=admin.id,
    )
    version.status = "active"
    profile.updated_at = datetime.utcnow()
    db.add(rollout)
    db.commit()
    return {"detail": "Promoted", "bot_id": profile.bot_id, "version_id": version.id, "traffic_percent": rollout.traffic_percent}


@router.post("/profiles/{bot_id}/rollback")
def rollback_profile(
    bot_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    profile = db.query(BotProfile).filter(BotProfile.bot_id == bot_id.lower()).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Bot profile not found")
    current = (
        db.query(BotProfileRollout)
        .join(BotProfileVersion, BotProfileRollout.profile_version_id == BotProfileVersion.id)
        .filter(BotProfileVersion.profile_id == profile.id, BotProfileRollout.is_enabled == True)
        .order_by(BotProfileRollout.created_at.desc())
        .first()
    )
    if current:
        current.is_enabled = False
        current.ended_at = datetime.utcnow()

    previous = (
        db.query(BotProfileRollout)
        .join(BotProfileVersion, BotProfileRollout.profile_version_id == BotProfileVersion.id)
        .filter(BotProfileVersion.profile_id == profile.id, BotProfileRollout.is_enabled == False)
        .order_by(BotProfileRollout.created_at.desc())
        .first()
    )
    if not previous:
        db.commit()
        return {"detail": "No previous rollout found", "bot_id": profile.bot_id}

    restored = BotProfileRollout(
        profile_version_id=previous.profile_version_id,
        traffic_percent=previous.traffic_percent,
        is_enabled=True,
        note=f"Rollback by admin {admin.id}",
        started_at=datetime.utcnow(),
        created_by=admin.id,
    )
    db.add(restored)
    profile.updated_at = datetime.utcnow()
    db.commit()
    return {"detail": "Rolled back", "bot_id": profile.bot_id, "version_id": previous.profile_version_id}


@router.get("/telemetry/recent", response_model=List[BotMoveTelemetryResponse])
def list_recent_telemetry(
    limit: int = 100,
    bot_id: Optional[str] = None,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(BotMoveTelemetry)
    if bot_id:
        q = q.filter(BotMoveTelemetry.bot_id == bot_id.lower())
    return q.order_by(BotMoveTelemetry.created_at.desc()).limit(max(1, min(1000, limit))).all()


@router.get("/telemetry/summary")
def telemetry_summary(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            BotMoveTelemetry.bot_id.label("bot_id"),
            func.count(BotMoveTelemetry.id).label("moves"),
            func.avg(BotMoveTelemetry.eval_loss_cp).label("avg_eval_loss_cp"),
            func.avg(BotMoveTelemetry.selected_rank).label("avg_selected_rank"),
        )
        .group_by(BotMoveTelemetry.bot_id)
        .order_by(BotMoveTelemetry.bot_id.asc())
        .all()
    )
    return {
        "summary": [
            {
                "bot_id": r.bot_id,
                "moves": int(r.moves or 0),
                "avg_eval_loss_cp": float(r.avg_eval_loss_cp or 0.0),
                "avg_selected_rank": float(r.avg_selected_rank or 0.0),
            }
            for r in rows
        ]
    }


@router.get("/jobs")
def list_jobs(
    status: Optional[str] = None,
    limit: int = 100,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(BotMoveJob)
    if status:
        q = q.filter(BotMoveJob.status == status)
    rows = q.order_by(BotMoveJob.created_at.desc()).limit(max(1, min(1000, limit))).all()
    return {
        "jobs": [
            {
                "id": j.id,
                "game_id": j.game_id,
                "status": j.status,
                "priority": j.priority,
                "attempts": j.attempts,
                "error_message": j.error_message,
                "created_at": j.created_at,
                "started_at": j.started_at,
                "completed_at": j.completed_at,
            }
            for j in rows
        ]
    }
