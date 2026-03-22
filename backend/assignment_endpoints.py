# assignment_endpoints.py  —  Coach Assignment Engine
# Register in main.py:  app.include_router(assignment_router)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Set
from datetime import datetime

from models import (
    Assignment, AssignmentPuzzle, AssignmentCompletion,
    Batch, StudentBatch, Puzzle, User, UserRole,
)
from auth import get_current_user
from database import get_db
from schemas import (
    AssignmentCreate, AssignmentUpdate,
    AssignmentResponse, AssignmentProgressResponse,
    AssignmentPuzzleInfo, StudentProgress,
    StudentAssignmentResponse,
    StudentAssignmentDetailResponse,
    StudentAssignmentPuzzleRow,
)

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


# ── Auth helpers ─────────────────────────────────────────────

def require_coach(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRole.coach, UserRole.admin, "coach", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Coach privileges required")
    return user


def require_student(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ── Internal helpers ─────────────────────────────────────────

def _build_assignment_response(a: Assignment, db: Session) -> AssignmentResponse:
    """Resolve names and puzzle info into the response shape."""
    batch_name   = a.batch.name   if a.batch   else None
    student_name = a.student.full_name if a.student else None

    puzzles_info = [
        AssignmentPuzzleInfo(
            puzzle_id  = ap.puzzle_id,
            position   = ap.position,
            title      = ap.puzzle.title,
            difficulty = ap.puzzle.difficulty.value if hasattr(ap.puzzle.difficulty, "value") else str(ap.puzzle.difficulty),
            xp_reward  = ap.puzzle.xp_reward,
        )
        for ap in a.puzzles
        if ap.puzzle is not None
    ]

    return AssignmentResponse(
        id           = a.id,
        title        = a.title,
        description  = a.description,
        coach_id     = a.coach_id,
        batch_id     = a.batch_id,
        batch_name   = batch_name,
        student_id   = a.student_id,
        student_name = student_name,
        due_date     = a.due_date,
        is_active    = a.is_active,
        created_at   = a.created_at,
        puzzle_count = len(puzzles_info),
        puzzles      = puzzles_info,
    )


def _get_batch_students(batch_id: int, db: Session) -> List[User]:
    sbs = (
        db.query(StudentBatch)
        .filter(StudentBatch.batch_id == batch_id, StudentBatch.is_active == True)
        .all()
    )
    return [
        db.query(User).filter(User.id == sb.student_id).first()
        for sb in sbs
        if db.query(User).filter(User.id == sb.student_id).first()
    ]


# ═══════════════════════════════════════════════════════════
# COACH ENDPOINTS
# ═══════════════════════════════════════════════════════════

@router.post("", response_model=AssignmentResponse)
def create_assignment(
    data: AssignmentCreate,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """
    Create a new assignment.
    Provide either batch_id (for the whole batch) or student_id (individual).
    puzzle_ids is an ordered list — order is preserved as position.
    """
    # Validate batch ownership
    if data.batch_id:
        batch = db.query(Batch).filter(
            Batch.id == data.batch_id,
            Batch.coach_id == coach.id,
        ).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found or not yours")

    # Validate individual student exists
    if data.student_id:
        student = db.query(User).filter(User.id == data.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

    # Validate all puzzles exist and are active
    for pid in data.puzzle_ids:
        puzzle = db.query(Puzzle).filter(Puzzle.id == pid, Puzzle.is_active == True).first()
        if not puzzle:
            raise HTTPException(
                status_code=400,
                detail=f"Puzzle {pid} not found or inactive",
            )

    # Create assignment
    assignment = Assignment(
        coach_id    = coach.id,
        title       = data.title,
        description = data.description,
        batch_id    = data.batch_id,
        student_id  = data.student_id,
        due_date    = data.due_date,
    )
    db.add(assignment)
    db.flush()  # get assignment.id before adding children

    # Add puzzles with ordered positions
    for position, puzzle_id in enumerate(data.puzzle_ids):
        ap = AssignmentPuzzle(
            assignment_id = assignment.id,
            puzzle_id     = puzzle_id,
            position      = position,
        )
        db.add(ap)

    db.commit()
    db.refresh(assignment)
    return _build_assignment_response(assignment, db)


@router.get("", response_model=List[AssignmentResponse])
def list_assignments(
    batch_id:   Optional[int]  = None,
    is_active:  Optional[bool] = None,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """
    List all assignments created by this coach.
    Optional filters: batch_id, is_active.
    """
    q = db.query(Assignment).filter(Assignment.coach_id == coach.id)
    if batch_id  is not None: q = q.filter(Assignment.batch_id == batch_id)
    if is_active is not None: q = q.filter(Assignment.is_active == is_active)
    assignments = q.order_by(Assignment.created_at.desc()).all()
    return [_build_assignment_response(a, db) for a in assignments]


def _assignment_accessible_by_student(
    db: Session, student: User, assignment_id: int
) -> Optional[Assignment]:
    """Return the assignment if active and assigned to this student (direct or via batch)."""
    batch_ids = [
        sb.batch_id
        for sb in db.query(StudentBatch).filter(
            StudentBatch.student_id == student.id,
            StudentBatch.is_active == True,
        ).all()
    ]
    a = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.is_active == True,
    ).first()
    if not a:
        return None
    if a.student_id == student.id:
        return a
    if a.batch_id is not None and a.batch_id in batch_ids:
        return a
    return None


@router.get("/student/my-assignments", response_model=List[StudentAssignmentResponse])
def get_my_assignments(
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    """
    All active assignments for the logged-in student.
    Includes both batch assignments (via StudentBatch) and individual assignments.
    """
    now = datetime.utcnow()

    # Get batches this student belongs to
    batch_ids = [
        sb.batch_id
        for sb in db.query(StudentBatch).filter(
            StudentBatch.student_id == student.id,
            StudentBatch.is_active == True,
        ).all()
    ]

    # Fetch matching assignments
    from sqlalchemy import or_
    assignments = (
        db.query(Assignment)
        .filter(
            Assignment.is_active == True,
            or_(
                Assignment.student_id == student.id,
                Assignment.batch_id.in_(batch_ids) if batch_ids else False,
            ),
        )
        .order_by(Assignment.due_date.asc().nulls_last(), Assignment.created_at.desc())
        .all()
    )

    result = []
    for a in assignments:
        total_puzzles = len(a.puzzles)
        completed = (
            db.query(AssignmentCompletion)
            .filter(
                AssignmentCompletion.assignment_id == a.id,
                AssignmentCompletion.student_id == student.id,
            )
            .count()
        )
        pct = round(completed / total_puzzles * 100, 1) if total_puzzles > 0 else 0.0
        is_overdue = bool(a.due_date and a.due_date < now and completed < total_puzzles)

        result.append(StudentAssignmentResponse(
            id=a.id,
            title=a.title,
            description=a.description,
            due_date=a.due_date,
            puzzle_count=total_puzzles,
            puzzles_completed=completed,
            completion_pct=pct,
            is_complete=completed >= total_puzzles,
            is_overdue=is_overdue,
        ))

    return result


@router.get("/student/assignment/{assignment_id}", response_model=StudentAssignmentDetailResponse)
def get_student_assignment_detail(
    assignment_id: int,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    """Puzzle list with per-puzzle completion for the logged-in student."""
    a = _assignment_accessible_by_student(db, student, assignment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")

    completed_ids: Set[int] = {
        row[0]
        for row in db.query(AssignmentCompletion.puzzle_id)
        .filter(
            AssignmentCompletion.assignment_id == assignment_id,
            AssignmentCompletion.student_id == student.id,
        )
        .all()
    }

    puzzles: List[StudentAssignmentPuzzleRow] = []
    for ap in sorted(a.puzzles, key=lambda x: x.position):
        p = ap.puzzle
        if not p:
            continue
        puzzles.append(
            StudentAssignmentPuzzleRow(
                puzzle_id=ap.puzzle_id,
                position=ap.position,
                title=p.title,
                difficulty=p.difficulty.value if hasattr(p.difficulty, "value") else str(p.difficulty),
                xp_reward=p.xp_reward,
                completed=ap.puzzle_id in completed_ids,
            )
        )

    return StudentAssignmentDetailResponse(
        id=a.id,
        title=a.title,
        description=a.description,
        due_date=a.due_date,
        puzzles=puzzles,
    )


@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(
    assignment_id: int,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Get a single assignment with full puzzle list."""
    a = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.coach_id == coach.id,
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return _build_assignment_response(a, db)


@router.put("/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(
    assignment_id: int,
    data: AssignmentUpdate,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Update title, description, due_date, or is_active."""
    a = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.coach_id == coach.id,
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(a, field, value)

    db.commit()
    db.refresh(a)
    return _build_assignment_response(a, db)


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Soft-delete (deactivate) an assignment."""
    a = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.coach_id == coach.id,
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    a.is_active = False
    db.commit()
    return {"detail": "Assignment deactivated", "assignment_id": assignment_id}


@router.get("/{assignment_id}/progress", response_model=AssignmentProgressResponse)
def get_assignment_progress(
    assignment_id: int,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """
    Per-student completion breakdown for an assignment.
    Works for both batch assignments and individual assignments.
    """
    a = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.coach_id == coach.id,
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")

    total_puzzles = len(a.puzzles)

    # Determine the student list
    if a.batch_id:
        students = _get_batch_students(a.batch_id, db)
    elif a.student_id:
        student = db.query(User).filter(User.id == a.student_id).first()
        students = [student] if student else []
    else:
        students = []

    student_rows: List[StudentProgress] = []
    total_completed_sum = 0

    for student in students:
        # Count distinct puzzles completed by this student for this assignment
        completed_puzzle_ids = (
            db.query(AssignmentCompletion.puzzle_id)
            .filter(
                AssignmentCompletion.assignment_id == assignment_id,
                AssignmentCompletion.student_id    == student.id,
            )
            .all()
        )
        completed_count = len(completed_puzzle_ids)
        total_completed_sum += completed_count

        # Last completion timestamp
        last_row = (
            db.query(AssignmentCompletion)
            .filter(
                AssignmentCompletion.assignment_id == assignment_id,
                AssignmentCompletion.student_id    == student.id,
            )
            .order_by(AssignmentCompletion.completed_at.desc())
            .first()
        )

        pct = round((completed_count / total_puzzles * 100), 1) if total_puzzles > 0 else 0.0

        student_rows.append(StudentProgress(
            student_id        = student.id,
            username          = student.username,
            full_name         = student.full_name,
            puzzles_completed = completed_count,
            total_puzzles     = total_puzzles,
            completion_pct    = pct,
            is_complete       = completed_count >= total_puzzles,
            last_completed_at = last_row.completed_at if last_row else None,
        ))

    # Sort: incomplete first (so coach sees who needs attention), then by % desc
    student_rows.sort(key=lambda r: (r.is_complete, -r.completion_pct))

    overall_pct = (
        round(total_completed_sum / (total_puzzles * len(students)) * 100, 1)
        if total_puzzles > 0 and len(students) > 0
        else 0.0
    )

    return AssignmentProgressResponse(
        assignment_id         = assignment_id,
        title                 = a.title,
        total_puzzles         = total_puzzles,
        total_students        = len(students),
        overall_completion_pct= overall_pct,
        students              = student_rows,
    )


# ═══════════════════════════════════════════════════════════
# STUDENT ENDPOINT — called when a student solves a puzzle
# ═══════════════════════════════════════════════════════════

@router.post("/{assignment_id}/complete/{puzzle_id}")
def mark_puzzle_complete(
    assignment_id: int,
    puzzle_id: int,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    """
    Called after a student successfully solves a puzzle that belongs to an assignment.
    Call this from your existing puzzle-solve flow in addition to recording the PuzzleAttempt.
    Idempotent — safe to call multiple times.
    """
    # Verify assignment exists and is active
    a = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.is_active == True,
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Verify puzzle is part of this assignment
    ap = db.query(AssignmentPuzzle).filter(
        AssignmentPuzzle.assignment_id == assignment_id,
        AssignmentPuzzle.puzzle_id     == puzzle_id,
    ).first()
    if not ap:
        raise HTTPException(status_code=400, detail="Puzzle not part of this assignment")

    # Idempotent insert
    existing = db.query(AssignmentCompletion).filter(
        AssignmentCompletion.assignment_id == assignment_id,
        AssignmentCompletion.student_id    == student.id,
        AssignmentCompletion.puzzle_id     == puzzle_id,
    ).first()

    if not existing:
        completion = AssignmentCompletion(
            assignment_id = assignment_id,
            student_id    = student.id,
            puzzle_id     = puzzle_id,
        )
        db.add(completion)
        db.commit()

    return {"detail": "Marked complete", "assignment_id": assignment_id, "puzzle_id": puzzle_id}
