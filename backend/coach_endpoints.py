# coach_endpoints.py - Coach Dashboard API Endpoints
# Add these to your main.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, or_
from typing import List, Optional
from pydantic import BaseModel, field_serializer
from models import Puzzle, User, DifficultyLevel, PuzzleFormat, UserRole, Assignment, PuzzleAttempt, Game, Batch, ClassSession
from schemas import UserResponse
from auth import get_current_user
from database import get_db
from stockfish_service import get_stockfish_service
from puzzle_utils import resolve_puzzle_format
from datetime import date as date_type, datetime, timedelta

from student_management_backend import _coach_roster_student_ids, _is_admin

router = APIRouter(prefix="/api/coach", tags=["coach"])

# Request/Response Models
class CoachPuzzleCreate(BaseModel):
    title: str
    description: Optional[str]
    fen: str
    difficulty: Optional[str] = None  # If not provided, Stockfish suggests
    theme: Optional[str] = None  # If not provided, Stockfish detects
    xp_reward: Optional[int] = None  # Auto-calculated based on difficulty
    
class CoachPuzzleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    fen: Optional[str] = None
    moves: Optional[str] = None
    difficulty: Optional[str] = None
    theme: Optional[str] = None
    xp_reward: Optional[int] = None
    is_active: Optional[bool] = None

class PuzzleWithAnalysis(BaseModel):
    id: int
    title: str
    description: Optional[str]
    fen: str
    moves: str
    puzzle_format: Optional[str] = None
    lichess_id: Optional[str] = None
    difficulty: str
    rating: int
    theme: Optional[str]
    xp_reward: int
    attempts_count: Optional[int] = 0
    success_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    is_active: bool

    @field_serializer("puzzle_format")
    def serialize_puzzle_format(self, v, info):
        if v is not None:
            if hasattr(v, "value"):
                return v.value
            return str(v).strip().lower()
        if info.data.get("lichess_id"):
            return "lichess"
        return "direct"

    @field_serializer("attempts_count", "success_count")
    def serialize_count(self, v):
        return v if v is not None else 0

    @field_serializer("created_at")
    def serialize_created_at(self, v):
        return v if v is not None else datetime.min

    class Config:
        from_attributes = True

# Helper function to check if user is coach/admin
def require_coach(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in ["coach", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches and admins can access this endpoint"
        )
    return user

# Endpoints
@router.post("/puzzles", response_model=PuzzleWithAnalysis)
def create_puzzle(
    puzzle_data: CoachPuzzleCreate,
    user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """
    Create a new puzzle with Stockfish validation
    Automatically generates solution, difficulty, and theme if not provided
    """
    sf = get_stockfish_service()
    
    # Analyze the position with Stockfish
    analysis = sf.analyze_position(puzzle_data.fen, depth=20)
    
    if not analysis["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid FEN position: {analysis.get('error')}"
        )
    
    # Auto-generate solution (best move)
    best_move = analysis["best_move"]
    
    # Auto-detect difficulty if not provided
    difficulty = puzzle_data.difficulty
    if not difficulty:
        difficulty = sf.suggest_difficulty(puzzle_data.fen)
    
    # Auto-detect theme if not provided
    theme = puzzle_data.theme
    if not theme:
        theme = sf.detect_tactic_theme(puzzle_data.fen, [best_move])
    
    # Calculate XP reward based on difficulty
    xp_reward = puzzle_data.xp_reward
    if not xp_reward:
        xp_map = {
            "BEGINNER": 10,
            "INTERMEDIATE": 25,
            "ADVANCED": 40,
            "EXPERT": 50
        }
        xp_reward = xp_map.get(difficulty.upper(), 25)
    
    # Calculate rating based on difficulty
    rating_map = {
        "BEGINNER": 400,
        "INTERMEDIATE": 700,
        "ADVANCED": 1000,
        "EXPERT": 1200
    }
    rating = rating_map.get(difficulty.upper(), 700)
    
    # Create the puzzle
    new_puzzle = Puzzle(
        title=puzzle_data.title,
        description=puzzle_data.description or f"Tactical puzzle - {theme}",
        fen=puzzle_data.fen,
        moves=best_move,  # Stockfish-generated solution from fen (direct format)
        puzzle_format=PuzzleFormat.DIRECT.value,
        difficulty=DifficultyLevel[difficulty.upper()],
        rating=rating,
        theme=theme,
        xp_reward=xp_reward,
        is_active=True
    )
    
    db.add(new_puzzle)
    db.commit()
    db.refresh(new_puzzle)
    
    return new_puzzle

@router.get("/puzzles", response_model=List[PuzzleWithAnalysis])
def get_all_puzzles_coach(
    skip: int = 0,
    limit: int = 500,
    include_inactive: bool = True,
    is_active_filter: Optional[bool] = None,
    search: Optional[str] = None,
    difficulty: Optional[str] = None,
    user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """
    Get all puzzles for coach dashboard (including inactive)
    """
    query = db.query(Puzzle)
    
    if not include_inactive:
        query = query.filter(Puzzle.is_active == True)

    if is_active_filter is not None:
        query = query.filter(Puzzle.is_active == is_active_filter)

    if search and search.strip():
        term = search.strip()
        query = query.filter(
            or_(
                Puzzle.title.ilike(f"%{term}%"),
                Puzzle.theme.ilike(f"%{term}%"),
                Puzzle.description.ilike(f"%{term}%"),
            )
        )
    if difficulty and difficulty.strip():
        query = query.filter(Puzzle.difficulty == DifficultyLevel[difficulty.upper()])

    total = query.count()
    puzzles = query.offset(skip).limit(limit).all()
    data = [PuzzleWithAnalysis.model_validate(p).model_dump(mode="json") for p in puzzles]
    return JSONResponse(
        content=data,
        headers={
            "X-Total-Count": str(total),
            "Access-Control-Expose-Headers": "X-Total-Count",
        },
    )

@router.get("/puzzles/{puzzle_id}", response_model=PuzzleWithAnalysis)
def get_puzzle_coach(
    puzzle_id: int,
    user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """Get a specific puzzle with full details"""
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id).first()
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    return puzzle

@router.put("/puzzles/{puzzle_id}", response_model=PuzzleWithAnalysis)
def update_puzzle(
    puzzle_id: int,
    puzzle_update: CoachPuzzleUpdate,
    user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """
    Update an existing puzzle
    If FEN is changed, re-validates with Stockfish
    """
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id).first()
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    
    # If FEN is being updated, re-validate
    if puzzle_update.fen and puzzle_update.fen != puzzle.fen:
        sf = get_stockfish_service()
        analysis = sf.analyze_position(puzzle_update.fen, depth=20)
        
        if not analysis["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid FEN position: {analysis.get('error')}"
            )
        
        # Update with new analysis
        puzzle.fen = puzzle_update.fen
        puzzle.moves = analysis["best_move"]
        
        # Re-calculate difficulty if not provided
        if not puzzle_update.difficulty:
            puzzle.difficulty = DifficultyLevel[sf.suggest_difficulty(puzzle_update.fen).upper()]
    
    # Update other fields
    if puzzle_update.title:
        puzzle.title = puzzle_update.title
    if puzzle_update.description:
        puzzle.description = puzzle_update.description
    if puzzle_update.moves:
        puzzle.moves = puzzle_update.moves
    if puzzle_update.difficulty:
        puzzle.difficulty = DifficultyLevel[puzzle_update.difficulty.upper()]
    if puzzle_update.theme:
        puzzle.theme = puzzle_update.theme
    if puzzle_update.xp_reward:
        puzzle.xp_reward = puzzle_update.xp_reward
    if puzzle_update.is_active is not None:
        puzzle.is_active = puzzle_update.is_active
    
    db.commit()
    db.refresh(puzzle)
    return puzzle

@router.delete("/puzzles/{puzzle_id}")
def delete_puzzle(
    puzzle_id: int,
    user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """
    Delete a puzzle (or mark as inactive)
    """
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id).first()
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    
    # Soft delete - just mark as inactive
    puzzle.is_active = False
    db.commit()
    
    return {"message": "Puzzle deactivated successfully", "puzzle_id": puzzle_id}

@router.post("/puzzles/{puzzle_id}/revalidate")
def revalidate_puzzle(
    puzzle_id: int,
    user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """
    Re-validate a puzzle with Stockfish
    Useful for checking if existing puzzles are still correct
    """
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id).first()
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    
    sf = get_stockfish_service()
    
    try:
        # Parse moves - handle both single move and space-separated moves
        moves_str = puzzle.moves.strip()
        if ' ' in moves_str:
            solution_moves = moves_str.split(' ')
        else:
            # Single move
            solution_moves = [moves_str]
        
        # Validate the puzzle (format-aware: Lichess setup vs direct solve)
        validation = sf.validate_puzzle(
            puzzle.fen,
            solution_moves,
            puzzle_format=resolve_puzzle_format(puzzle),
        )
        
        if not validation["success"]:
            return {
                "puzzle_id": puzzle_id,
                "error": validation.get("error", "Validation failed"),
                "is_valid": False
            }
        
        # Get updated analysis
        difficulty = sf.suggest_difficulty(puzzle.fen)
        theme = sf.detect_tactic_theme(puzzle.fen, solution_moves)
        
        return {
            "puzzle_id": puzzle_id,
            "current_solution": puzzle.moves,
            "is_valid": validation["is_valid"],
            "best_move": validation["best_move"],
            "suggested_difficulty": difficulty,
            "detected_theme": theme,
            "message": validation["message"],
            "recommendation": "Solution is correct!" if validation["is_valid"] else f"Consider updating solution to: {validation['best_move']}"
        }
    except Exception as e:
        return {
            "puzzle_id": puzzle_id,
            "error": str(e),
            "is_valid": False,
            "message": f"Revalidation error: {str(e)}"
        }


def _compute_coach_stats(db: Session) -> dict:
    """Aggregated puzzle stats (two SQL queries)."""
    totals = db.query(
        func.count(Puzzle.id),
        func.coalesce(
            func.sum(case((Puzzle.is_active == True, 1), else_=0)),
            0,
        ),
        func.coalesce(func.sum(Puzzle.attempts_count), 0),
        func.coalesce(func.sum(Puzzle.success_count), 0),
    ).one()

    total_puzzles = int(totals[0] or 0)
    active_puzzles = int(totals[1] or 0)
    total_attempts = int(totals[2] or 0)
    total_success = int(totals[3] or 0)

    diff_rows = (
        db.query(Puzzle.difficulty, func.count(Puzzle.id))
        .filter(Puzzle.is_active == True)
        .group_by(Puzzle.difficulty)
        .all()
    )
    diff_map = {diff.value: int(cnt) for diff, cnt in diff_rows}
    difficulty_counts = {diff.value: diff_map.get(diff.value, 0) for diff in DifficultyLevel}

    success_rate = (total_success / total_attempts * 100) if total_attempts > 0 else 0

    return {
        "total_puzzles": total_puzzles,
        "active_puzzles": active_puzzles,
        "inactive_puzzles": total_puzzles - active_puzzles,
        "difficulty_distribution": difficulty_counts,
        "total_attempts": total_attempts,
        "total_success": total_success,
        "overall_success_rate": round(success_rate, 2),
    }


@router.get("/bootstrap")
def coach_bootstrap(
    user: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """
    Single request: session user (same fields as GET /api/auth/me) + dashboard stats.
    Avoids sequential /api/auth/me + /api/coach/stats and duplicate User lookups.
    """
    from main import get_level_category, sync_user_level_from_rating

    sync_user_level_from_rating(user)
    db.commit()
    db.refresh(user)
    user_payload = UserResponse.model_validate(user).model_dump(mode="json")
    user_payload["level_category"] = get_level_category(user.level)
    stats = _compute_coach_stats(db)
    return {"user": user_payload, "stats": stats}


@router.get("/stats")
def get_coach_stats(
    user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """Get statistics for coach dashboard (aggregated in two queries)."""
    return _compute_coach_stats(db)


@router.get("/priorities")
def get_coach_priorities(
    user: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Assignments overdue or due within three days (coach dashboard)."""
    now = datetime.utcnow()
    soon = now + timedelta(days=3)

    aq = (
        db.query(Assignment)
        .options(joinedload(Assignment.batch), joinedload(Assignment.student))
        .filter(Assignment.is_active == True, Assignment.due_date.isnot(None))
    )
    if not _is_admin(user):
        aq = aq.filter(Assignment.coach_id == user.id)
    assignments = aq.all()

    overdue: List[dict] = []
    due_soon: List[dict] = []
    for a in assignments:
        due = a.due_date
        if due is None:
            continue
        target = "—"
        if a.batch_id and a.batch:
            target = f"Batch: {a.batch.name}"
        elif a.student_id and a.student:
            target = a.student.username
        row = {
            "id": a.id,
            "title": a.title,
            "due_date": due.isoformat(),
            "target_label": target,
        }
        if due < now:
            overdue.append(row)
        elif due <= soon:
            due_soon.append(row)

    overdue.sort(key=lambda x: x["due_date"])
    due_soon.sort(key=lambda x: x["due_date"])

    return {
        "assignments_overdue": overdue[:25],
        "assignments_due_soon": due_soon[:25],
        "counts": {
            "assignments_overdue": len(overdue),
            "assignments_due_soon": len(due_soon),
        },
    }


@router.get("/upcoming-classes")
def get_coach_upcoming_classes(
    user: User = Depends(require_coach),
    db: Session = Depends(get_db),
    limit: int = 10,
):
    """Upcoming class sessions across the coach's active batches (for dashboard)."""
    cap = max(1, min(limit, 25))
    now = datetime.utcnow()
    batch_rows = (
        db.query(Batch)
        .filter(Batch.coach_id == user.id, Batch.is_active == True)
        .all()
    )
    batch_ids = [b.id for b in batch_rows]
    batch_name_by_id = {b.id: b.name for b in batch_rows}
    if not batch_ids:
        return []

    sessions = (
        db.query(ClassSession)
        .filter(ClassSession.batch_id.in_(batch_ids), ClassSession.date >= now)
        .order_by(ClassSession.date.asc())
        .limit(cap)
        .all()
    )
    return [
        {
            "id": s.id,
            "batch_id": s.batch_id,
            "batch_name": batch_name_by_id.get(s.batch_id),
            "date": s.date.isoformat(),
            "duration_minutes": s.duration_minutes,
            "topic": s.topic,
            "meeting_link": s.meeting_link,
            "notes": s.notes,
        }
        for s in sessions
    ]


def _coach_can_view_student(user: User, student_id: int, db: Session) -> bool:
    if _is_admin(user):
        return True
    roster = _coach_roster_student_ids(user, db)
    return roster is not None and student_id in roster


_ACTIVITY_PRESET_DAYS = (7, 30, 90, 180, 365)
_ACTIVITY_MAX_SPAN_DAYS = 366


@router.get("/students/{student_ref}/activity")
def get_student_activity(
    student_ref: str,
    days: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Daily game and puzzle counts for a preset window or custom date range."""
    from student_ref_utils import resolve_student_user

    student = resolve_student_user(student_ref, db)
    student_id = student.id
    if not _coach_can_view_student(user, student_id, db):
        raise HTTPException(status_code=404, detail="Student not found")

    now = datetime.utcnow()
    today = now.date()

    if start_date is not None or end_date is not None:
        if not start_date or not end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both start_date and end_date are required for a custom range",
            )
        try:
            range_start = date_type.fromisoformat(start_date)
            range_end = date_type.fromisoformat(end_date)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dates must be YYYY-MM-DD",
            ) from exc
        if range_end < range_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_date must be on or after start_date",
            )
        span_days = (range_end - range_start).days + 1
        if span_days > _ACTIVITY_MAX_SPAN_DAYS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Date range cannot exceed {_ACTIVITY_MAX_SPAN_DAYS} days",
            )
    else:
        if days not in _ACTIVITY_PRESET_DAYS:
            days = 7
        range_end = today
        range_start = range_end - timedelta(days=days - 1)
        span_days = days

    period_start = datetime.combine(range_start, datetime.min.time())
    period_end = datetime.combine(range_end, datetime.max.time())

    buckets: List[dict] = []
    by_date: dict[str, dict] = {}
    cursor = range_start
    while cursor <= range_end:
        key = cursor.isoformat()
        row = {
            "date": key,
            "games": 0,
            "puzzle_attempts": 0,
            "puzzles_solved": 0,
        }
        buckets.append(row)
        by_date[key] = row
        cursor += timedelta(days=1)

    games = (
        db.query(Game)
        .filter(
            or_(Game.white_player_id == student_id, Game.black_player_id == student_id),
            Game.started_at >= period_start,
            Game.started_at <= period_end,
        )
        .all()
    )
    for g in games:
        if g.started_at:
            key = g.started_at.date().isoformat()
            if key in by_date:
                by_date[key]["games"] += 1

    attempts = (
        db.query(PuzzleAttempt)
        .filter(
            PuzzleAttempt.user_id == student_id,
            PuzzleAttempt.attempted_at >= period_start,
            PuzzleAttempt.attempted_at <= period_end,
        )
        .all()
    )
    for a in attempts:
        if a.attempted_at:
            key = a.attempted_at.date().isoformat()
            if key in by_date:
                by_date[key]["puzzle_attempts"] += 1
                if a.is_solved:
                    by_date[key]["puzzles_solved"] += 1

    totals = {
        "games": sum(b["games"] for b in buckets),
        "puzzle_attempts": sum(b["puzzle_attempts"] for b in buckets),
        "puzzles_solved": sum(b["puzzles_solved"] for b in buckets),
    }
    return {
        "days": span_days,
        "start_date": range_start.isoformat(),
        "end_date": range_end.isoformat(),
        "buckets": buckets,
        "totals": totals,
    }


@router.get("/students/{student_ref}/games")
def coach_list_student_games(
    student_ref: str,
    user: User = Depends(require_coach),
    db: Session = Depends(get_db),
    limit: int = 40,
):
    """Recent games for a student on the coach roster (for Analysis load)."""
    from student_ref_utils import resolve_student_user

    cap = max(1, min(limit, 50))
    student = resolve_student_user(student_ref, db)
    student_id = student.id
    if not _coach_can_view_student(user, student_id, db):
        raise HTTPException(status_code=404, detail="Student not found")

    games = (
        db.query(Game)
        .filter(
            or_(Game.white_player_id == student_id, Game.black_player_id == student_id),
        )
        .order_by(Game.started_at.desc())
        .limit(cap)
        .all()
    )
    return [
        {
            "id": g.id,
            "started_at": g.started_at.isoformat() if g.started_at else None,
            "ended_at": g.ended_at.isoformat() if g.ended_at else None,
            "result": g.result,
            "total_moves": g.total_moves,
            "white_player_id": g.white_player_id,
            "black_player_id": g.black_player_id,
            "has_pgn": bool(g.pgn and g.pgn.strip()),
        }
        for g in games
    ]


@router.get("/games/{game_id}")
def coach_get_game_for_analysis(
    game_id: int,
    user: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Fetch a game PGN for coach analysis (roster-scoped)."""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    player_ids = {game.white_player_id, game.black_player_id}
    if not _is_admin(user):
        roster = _coach_roster_student_ids(user, db) or set()
        if not player_ids & roster:
            raise HTTPException(status_code=403, detail="Access denied")
    return {
        "id": game.id,
        "started_at": game.started_at.isoformat() if game.started_at else None,
        "result": game.result,
        "total_moves": game.total_moves,
        "white_player_id": game.white_player_id,
        "black_player_id": game.black_player_id,
        "pgn": game.pgn,
        "starting_fen": game.starting_fen,
        "final_fen": game.final_fen,
    }
