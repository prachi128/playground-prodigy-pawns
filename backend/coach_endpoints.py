# coach_endpoints.py - Coach Dashboard API Endpoints
# Add these to your main.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional
from pydantic import BaseModel, field_serializer
from models import Puzzle, User, DifficultyLevel, UserRole
from schemas import UserResponse
from auth import get_current_user
from database import get_db
from stockfish_service import get_stockfish_service
from datetime import datetime

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
    difficulty: str
    rating: int
    theme: Optional[str]
    xp_reward: int
    attempts_count: Optional[int] = 0
    success_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    is_active: bool

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
        moves=best_move,  # Stockfish-generated solution
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
    limit: int = 50,
    include_inactive: bool = True,
    user: User = Depends(require_coach),
    db: Session = Depends(get_db)
):
    """
    Get all puzzles for coach dashboard (including inactive)
    """
    query = db.query(Puzzle)
    
    if not include_inactive:
        query = query.filter(Puzzle.is_active == True)
    
    puzzles = query.offset(skip).limit(limit).all()
    return puzzles

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
        
        # Validate the puzzle
        validation = sf.validate_puzzle(puzzle.fen, solution_moves)
        
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
