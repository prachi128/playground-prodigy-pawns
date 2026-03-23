# student_management_backend.py - Coach student management API

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Set
from pydantic import BaseModel
from models import User, UserRole, Puzzle, PuzzleAttempt, Batch, StudentBatch
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
    last_active: Optional[datetime] = None
    days_since_active: int
    is_active: bool = True

    total_puzzles_attempted: int
    total_puzzles_solved: int
    success_rate: float

    class Config:
        from_attributes = True


class DeactivatedNoticeStudent(BaseModel):
    id: int
    username: str
    email: str


class StudentDetailedStats(BaseModel):
    id: int
    username: str
    email: str
    xp: int
    created_at: datetime
    last_active: Optional[datetime] = None

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
    is_active: bool = True

    class Config:
        from_attributes = True


def require_coach(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRole.coach, UserRole.admin, "coach", "admin"]:
        raise HTTPException(status_code=403, detail="Coach access required")
    return user


def require_admin(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRole.admin, "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def _is_admin(user: User) -> bool:
    return user.role in (UserRole.admin, "admin")


def _coach_roster_student_ids(coach: User, db: Session) -> Optional[Set[int]]:
    """
    Distinct student ids with an active enrollment in any batch owned by this coach.
    None = no roster filter (admin only).
    """
    if _is_admin(coach):
        return None
    rows = (
        db.query(StudentBatch.student_id)
        .join(Batch, StudentBatch.batch_id == Batch.id)
        .filter(
            Batch.coach_id == coach.id,
            StudentBatch.is_active == True,
        )
        .distinct()
        .all()
    )
    return {int(r[0]) for r in rows}


def _coach_can_access_student(coach: User, db: Session, student_id: int) -> bool:
    if _is_admin(coach):
        return True
    roster = _coach_roster_student_ids(coach, db)
    return student_id in roster if roster is not None else False


# Stats overview must be before /{student_id} so "stats" is not captured as id
@router.get("/stats/overview")
def get_class_overview(
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Get overview stats for students in this coach's batches (all students if admin)."""
    q = db.query(User).filter(User.role == UserRole.student)
    roster = _coach_roster_student_ids(coach, db)
    if roster is not None:
        if not roster:
            return {
                "total_students": 0,
                "average_xp": 0,
                "most_active": [],
                "needs_attention": [],
            }
        q = q.filter(User.id.in_(roster))
    students = q.all()

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


@router.get("/deactivated-notice")
def get_deactivated_notice(
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """
    Coaches only: students who are deactivated but still enrolled in one of your batches.
    Admins get an empty payload (they use the full student list including inactive).
    """
    if _is_admin(coach):
        return {"count": 0, "students": []}
    rows = (
        db.query(User)
        .join(StudentBatch, StudentBatch.student_id == User.id)
        .join(Batch, Batch.id == StudentBatch.batch_id)
        .filter(
            Batch.coach_id == coach.id,
            User.role == UserRole.student,
            User.is_active == False,
            StudentBatch.is_active == True,
        )
        .distinct()
        .all()
    )
    return {
        "count": len(rows),
        "students": [
            DeactivatedNoticeStudent(id=u.id, username=u.username, email=u.email).model_dump()
            for u in rows
        ],
    }


@router.get("/", response_model=List[StudentStats])
def get_all_students(
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """
    Students in this coach's batches with basic stats.
    Coaches only see active accounts; admins see all students (including inactive).
    """
    q = db.query(User).filter(User.role == UserRole.student)
    if not _is_admin(coach):
        q = q.filter(User.is_active == True)
    roster = _coach_roster_student_ids(coach, db)
    if roster is not None:
        if not roster:
            return []
        q = q.filter(User.id.in_(roster))
    students = q.all()
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
        if last_active is None:
            days_since_active = 999
        else:
            days_since_active = (datetime.utcnow() - last_active).days

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
                days_since_active=days_since_active,
                is_active=bool(student.is_active),
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
    """Get detailed stats for a specific student (must be on coach roster unless admin)."""
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not _coach_can_access_student(coach, db, student_id):
        raise HTTPException(status_code=404, detail="Student not found")
    if not _is_admin(coach) and student.is_active is False:
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
    if last_active is None:
        days_since_active = 999
    else:
        days_since_active = (datetime.utcnow() - last_active).days

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
        is_active=bool(student.is_active),
    )


@router.post("/{student_id}/award-xp")
def award_bonus_xp(
    student_id: int,
    xp_amount: int = Query(..., ge=1, le=100, description="XP to award (1-100)"),
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Award bonus XP to a student on this coach's roster (any student if admin)."""
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not _coach_can_access_student(coach, db, student_id):
        raise HTTPException(status_code=404, detail="Student not found")
    if student.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot award XP to a deactivated student",
        )

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
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Deactivate a student account (admin only). Does not remove database rows."""
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.is_active is False:
        return {
            "success": True,
            "message": f"Student {student.username} is already deactivated",
        }

    student.is_active = False
    db.commit()
    return {"success": True, "message": f"Student {student.username} deactivated"}


@router.put("/{student_id}/reactivate")
def reactivate_student(
    student_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Restore a deactivated student account (admin only)."""
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.is_active is True:
        return {
            "success": True,
            "message": f"Student {student.username} is already active",
        }

    student.is_active = True
    db.commit()
    return {"success": True, "message": f"Student {student.username} reactivated"}
