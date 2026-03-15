# student_management_backend.py - Coach student management API

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from pydantic import BaseModel
from models import User, UserRole, Puzzle, PuzzleAttempt
from auth import get_current_user
from database import get_db
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/coach/students", tags=["students"])


# Response Models
class StudentStats(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    xp: int
    total_xp: int  # alias for frontend compatibility
    level: int
    rating: int
    created_at: datetime
    last_active: datetime

    total_puzzles_attempted: int
    total_puzzles_solved: int
    success_rate: float

    class Config:
        from_attributes = True


class StudentDetailedStats(BaseModel):
    id: int
    username: str
    email: str
    xp: int
    created_at: datetime
    last_active: datetime

    total_puzzles_attempted: int
    total_puzzles_solved: int
    success_rate: float

    beginner_solved: int
    intermediate_solved: int
    advanced_solved: int
    expert_solved: int

    puzzles_this_week: int
    xp_this_week: int
    days_since_active: int

    class Config:
        from_attributes = True


def require_coach(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRole.coach, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Coach access required")
    return user


# Stats overview must be before /{student_id} so "stats" is not captured as id
@router.get("/stats/overview")
def get_class_overview(
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Get overview stats for all students"""
    students = db.query(User).filter(User.role == UserRole.student).all()

    if not students:
        return {
            "total_students": 0,
            "average_xp": 0,
            "most_active": [],
            "needs_attention": [],
        }

    total_xp = sum(s.total_xp for s in students)
    average_xp = total_xp / len(students)
    sorted_by_xp = sorted(students, key=lambda s: s.total_xp, reverse=True)
    most_active = [{"id": s.id, "username": s.username, "xp": s.total_xp} for s in sorted_by_xp[:5]]
    needs_attention = [{"id": s.id, "username": s.username, "xp": s.total_xp} for s in students if s.total_xp < 50]

    return {
        "total_students": len(students),
        "average_xp": round(average_xp, 1),
        "most_active": most_active,
        "needs_attention": needs_attention,
    }


@router.get("/", response_model=List[StudentStats])
def get_all_students(
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """
    Get all students with their basic stats.
    Uses PuzzleAttempt for per-student attempted/solved counts when available.
    """
    students = db.query(User).filter(User.role == UserRole.student).all()
    student_stats = []
    for student in students:
        # Per-student stats from PuzzleAttempt
        attempted = db.query(func.count(PuzzleAttempt.id)).filter(PuzzleAttempt.user_id == student.id).scalar() or 0
        solved = (
            db.query(func.count(PuzzleAttempt.id)).filter(
                PuzzleAttempt.user_id == student.id, PuzzleAttempt.is_solved == True
            ).scalar()
            or 0
        )
        success_rate = (solved / attempted * 100) if attempted > 0 else 0.0
        last_attempt = (
            db.query(func.max(PuzzleAttempt.attempted_at)).filter(PuzzleAttempt.user_id == student.id).scalar()
        )
        last_active = last_attempt or student.last_login or student.created_at

        xp_val = student.total_xp or 0
        student_stats.append(
            StudentStats(
                id=student.id,
                username=student.username,
                full_name=student.full_name or student.username,
                email=student.email,
                xp=xp_val,
                total_xp=xp_val,
                level=student.level or 1,
                rating=student.rating or 0,
                created_at=student.created_at,
                last_active=last_active,
                total_puzzles_attempted=attempted,
                total_puzzles_solved=solved,
                success_rate=round(success_rate, 1),
            )
        )
    return student_stats


@router.get("/{student_id}", response_model=StudentDetailedStats)
def get_student_details(
    student_id: int,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Get detailed stats for a specific student"""
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # From PuzzleAttempt
    attempted = db.query(func.count(PuzzleAttempt.id)).filter(PuzzleAttempt.user_id == student.id).scalar() or 0
    solved = (
        db.query(func.count(PuzzleAttempt.id)).filter(
            PuzzleAttempt.user_id == student.id, PuzzleAttempt.is_solved == True
        ).scalar()
        or 0
    )
    success_rate = (solved / attempted * 100) if attempted > 0 else 0.0
    last_attempt = (
        db.query(func.max(PuzzleAttempt.attempted_at)).filter(PuzzleAttempt.user_id == student.id).scalar()
    )
    last_active = last_attempt or student.last_login or student.created_at
    days_since_active = (datetime.utcnow() - last_active).days if last_active else 0

    # Solved by difficulty (from PuzzleAttempt joined with Puzzle)
    from models import DifficultyLevel

    beginner_solved = (
        db.query(func.count(PuzzleAttempt.id))
        .join(Puzzle, PuzzleAttempt.puzzle_id == Puzzle.id)
        .filter(
            PuzzleAttempt.user_id == student.id,
            PuzzleAttempt.is_solved == True,
            Puzzle.difficulty == DifficultyLevel.BEGINNER,
        )
        .scalar()
        or 0
    )
    intermediate_solved = (
        db.query(func.count(PuzzleAttempt.id))
        .join(Puzzle, PuzzleAttempt.puzzle_id == Puzzle.id)
        .filter(
            PuzzleAttempt.user_id == student.id,
            PuzzleAttempt.is_solved == True,
            Puzzle.difficulty == DifficultyLevel.INTERMEDIATE,
        )
        .scalar()
        or 0
    )
    advanced_solved = (
        db.query(func.count(PuzzleAttempt.id))
        .join(Puzzle, PuzzleAttempt.puzzle_id == Puzzle.id)
        .filter(
            PuzzleAttempt.user_id == student.id,
            PuzzleAttempt.is_solved == True,
            Puzzle.difficulty == DifficultyLevel.ADVANCED,
        )
        .scalar()
        or 0
    )
    expert_solved = (
        db.query(func.count(PuzzleAttempt.id))
        .join(Puzzle, PuzzleAttempt.puzzle_id == Puzzle.id)
        .filter(
            PuzzleAttempt.user_id == student.id,
            PuzzleAttempt.is_solved == True,
            Puzzle.difficulty == DifficultyLevel.EXPERT,
        )
        .scalar()
        or 0
    )

    week_ago = datetime.utcnow() - timedelta(days=7)
    puzzles_this_week = (
        db.query(func.count(PuzzleAttempt.id))
        .filter(PuzzleAttempt.user_id == student.id, PuzzleAttempt.attempted_at >= week_ago)
        .scalar()
        or 0
    )
    xp_this_week = (
        db.query(func.coalesce(func.sum(PuzzleAttempt.xp_earned), 0))
        .filter(PuzzleAttempt.user_id == student.id, PuzzleAttempt.attempted_at >= week_ago)
        .scalar()
        or 0
    )

    return StudentDetailedStats(
        id=student.id,
        username=student.username,
        email=student.email,
        xp=student.total_xp,
        created_at=student.created_at,
        last_active=last_active,
        total_puzzles_attempted=attempted,
        total_puzzles_solved=solved,
        success_rate=round(success_rate, 1),
        beginner_solved=beginner_solved,
        intermediate_solved=intermediate_solved,
        advanced_solved=advanced_solved,
        expert_solved=expert_solved,
        puzzles_this_week=puzzles_this_week,
        xp_this_week=xp_this_week,
        days_since_active=days_since_active,
    )


@router.post("/{student_id}/award-xp")
def award_bonus_xp(
    student_id: int,
    xp_amount: int = Query(..., ge=1, le=100, description="XP to award (1-100)"),
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Award bonus XP to a student"""
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.total_xp = (student.total_xp or 0) + xp_amount
    db.commit()
    db.refresh(student)
    return {
        "success": True,
        "message": f"Awarded {xp_amount} XP to {student.username}",
        "new_xp": student.total_xp,
    }


@router.put("/{student_id}/deactivate")
def deactivate_student(
    student_id: int,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Deactivate a student account"""
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.is_active = False
    db.commit()
    return {"success": True, "message": f"Student {student.username} deactivated"}
