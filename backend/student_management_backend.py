# student_management_backend.py - Coach student management API

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import case, exists, func, or_
from typing import List, Optional, Set, Tuple
from pydantic import BaseModel, Field
from models import (
    User,
    UserRole,
    Puzzle,
    PuzzleAttempt,
    Game,
    Batch,
    StudentBatch,
    PuzzleTheme,
    Notification,
    Attendance,
    ClassSession,
    Assignment,
    Announcement,
)
from auth import get_current_user
from database import get_db
from datetime import datetime, timedelta
from audit_service import log_admin_action
from student_ref_utils import resolve_student_user
from account_utils import (
    is_student_placeholder_email,
    link_student_to_guardian_parent,
    resolve_student_email,
    student_placeholder_email,
)

router = APIRouter(prefix="/api/coach/students", tags=["students"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin-students"])


# Response Models
class StudentStats(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    age: Optional[int] = None
    xp: int
    total_xp: int  # alias for frontend compatibility
    level: int
    rating: int
    internal_rating: int = 0
    online_rating: Optional[int] = None
    fide_rating: Optional[int] = None
    batch_names: List[str] = Field(default_factory=list)
    skill_level: str = "—"
    attendance_pct: Optional[float] = None
    last_class_attended: Optional[datetime] = None
    created_at: datetime
    last_active: Optional[datetime] = None
    days_since_active: int
    is_active: bool = True
    coach_id: Optional[int] = None
    coach_username: Optional[str] = None
    coach_full_name: Optional[str] = None
    is_unassigned: bool = False

    total_puzzles_attempted: int
    total_puzzles_solved: int
    success_rate: float
    priority_tags: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class DeactivatedNoticeStudent(BaseModel):
    id: int
    username: str
    email: str


class CoachStudentUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    age: Optional[int] = Field(None, ge=4, le=99)
    guardian_email: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=30)
    whatsapp: Optional[str] = Field(None, max_length=30)
    student_email: Optional[str] = None


class StudentDetailedStats(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    guardian_email: Optional[str] = None
    student_email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    age: Optional[int] = None
    rating: int = 0
    skill_level: str = "—"
    batch_names: List[str] = Field(default_factory=list)
    attendance_pct: Optional[float] = None
    last_class_attended: Optional[datetime] = None
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
    games_played: int
    games_won: int
    game_win_rate: float
    games_this_week: int
    days_since_active: int
    is_active: bool = True
    theme_performance: List["ThemePerformanceRow"] = Field(default_factory=list)
    weekly_buckets: List["WeeklyBucket"] = Field(default_factory=list)
    weekly_trend: str = "insufficient_data"

    class Config:
        from_attributes = True


class ThemePerformanceRow(BaseModel):
    theme_key: str
    attempts: int
    solved: int
    accuracy_pct: float


class WeeklyBucket(BaseModel):
    period_label: str
    start_date: str
    attempts: int
    solved: int
    accuracy_pct: float


class StudentNudgeRequest(BaseModel):
    message: Optional[str] = Field(None, max_length=500)


class CoachAccountRow(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class CoachRosterStudentRow(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    is_active: bool
    payment_status: str
    is_enrollment_active: bool


class CoachRosterBatchRow(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    schedule: Optional[str] = None
    monthly_fee: float
    is_active: bool
    student_count: int
    students: List[CoachRosterStudentRow]


class CoachRosterRow(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    is_active: bool
    total_batches: int
    total_students: int
    active_students: int
    inactive_students: int
    batches: List[CoachRosterBatchRow]


class CoachActivityRow(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    days_since_login: Optional[int] = None
    total_batches: int = 0
    active_batches: int = 0
    total_students: int = 0
    active_students: int = 0
    primary_students: int = 0
    total_assignments: int = 0
    active_assignments: int = 0
    assignments_this_week: int = 0
    sessions_total: int = 0
    sessions_this_week: int = 0
    attendance_marked_total: int = 0
    attendance_marked_this_week: int = 0
    announcements_total: int = 0
    batch_names: List[str] = Field(default_factory=list)


class CoachActivityBatchRow(BaseModel):
    id: int
    name: str
    is_active: bool
    student_count: int
    schedule: Optional[str] = None


class CoachRecentActivityRow(BaseModel):
    activity_type: str
    label: str
    occurred_at: datetime


class CoachDetailedActivity(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    days_since_login: Optional[int] = None
    total_batches: int = 0
    active_batches: int = 0
    total_students: int = 0
    active_students: int = 0
    primary_students: int = 0
    total_assignments: int = 0
    active_assignments: int = 0
    assignments_this_week: int = 0
    sessions_total: int = 0
    sessions_this_week: int = 0
    attendance_marked_total: int = 0
    attendance_marked_this_week: int = 0
    announcements_total: int = 0
    batches: List[CoachActivityBatchRow] = Field(default_factory=list)
    recent_activity: List[CoachRecentActivityRow] = Field(default_factory=list)


class StudentCoachAssignRequest(BaseModel):
    coach_id: Optional[int] = None


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


def _student_personal_email(student: User) -> Optional[str]:
    if student.email and not is_student_placeholder_email(student.email):
        return student.email.strip()
    return None


def _normalize_optional_contact(value: Optional[str], *, max_len: int = 30) -> Optional[str]:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    return trimmed[:max_len]


def _coach_roster_student_ids(coach: User, db: Session) -> Optional[Set[int]]:
    """
    Student ids visible to this coach: primary assignment and/or active batch enrollment.
    None = no roster filter (admin only).
    """
    if _is_admin(coach):
        return None

    assigned_ids = {
        int(r[0])
        for r in (
            db.query(User.id)
            .filter(
                User.role == UserRole.student,
                User.primary_coach_id == coach.id,
            )
            .all()
        )
    }
    enrolled_ids = {
        int(r[0])
        for r in (
            db.query(StudentBatch.student_id)
            .join(Batch, Batch.id == StudentBatch.batch_id)
            .filter(
                Batch.coach_id == coach.id,
                StudentBatch.is_active == True,
                Batch.is_active == True,
            )
            .distinct()
            .all()
        )
    }
    return assigned_ids | enrolled_ids


def _skill_level_label(internal_rating: int) -> str:
    """Coach-facing band from the student's in-app rating (not puzzle rating)."""
    ref = internal_rating or 0
    if ref <= 0:
        return "Unrated"
    if ref < 600:
        return "Beginner"
    if ref < 1000:
        return "Intermediate"
    if ref < 1400:
        return "Advanced"
    return "Expert"


def _attendance_status_bucket(value: Optional[str]) -> str:
    v = (value or "").strip().lower()
    if v in ("present", "absent"):
        return v
    return "not_marked"


def _bulk_student_batch_names(
    db: Session,
    student_ids: List[int],
    coach: User,
) -> dict[int, List[str]]:
    if not student_ids:
        return {}
    q = (
        db.query(StudentBatch.student_id, Batch.name)
        .join(Batch, Batch.id == StudentBatch.batch_id)
        .filter(
            StudentBatch.student_id.in_(student_ids),
            StudentBatch.is_active == True,
            Batch.is_active == True,
        )
    )
    if not _is_admin(coach):
        q = q.filter(Batch.coach_id == coach.id)
    rows = q.order_by(Batch.name.asc()).all()
    out: dict[int, List[str]] = defaultdict(list)
    for student_id, batch_name in rows:
        if batch_name and batch_name not in out[student_id]:
            out[student_id].append(batch_name)
    return out


def _bulk_student_attendance(
    db: Session,
    student_ids: List[int],
    coach: User,
) -> dict[int, dict]:
    """
    Per-student attendance % and last present class date across coach-visible batches.
    Denominator = class sessions for enrolled batches (coach scope).
    """
    if not student_ids:
        return {}

    enroll_q = (
        db.query(StudentBatch.student_id, StudentBatch.batch_id)
        .join(Batch, Batch.id == StudentBatch.batch_id)
        .filter(
            StudentBatch.student_id.in_(student_ids),
            StudentBatch.is_active == True,
            Batch.is_active == True,
        )
    )
    if not _is_admin(coach):
        enroll_q = enroll_q.filter(Batch.coach_id == coach.id)
    enrollments = enroll_q.all()
    if not enrollments:
        return {sid: {"attendance_pct": None, "last_class_attended": None} for sid in student_ids}

    batch_ids = list({batch_id for _, batch_id in enrollments})
    batches_by_student: dict[int, Set[int]] = defaultdict(set)
    for student_id, batch_id in enrollments:
        batches_by_student[student_id].add(batch_id)

    sessions = (
        db.query(ClassSession.id, ClassSession.batch_id, ClassSession.date)
        .filter(ClassSession.batch_id.in_(batch_ids))
        .all()
    )
    sessions_by_batch: dict[int, list] = defaultdict(list)
    for session_id, batch_id, session_date in sessions:
        sessions_by_batch[batch_id].append((session_id, session_date))

    session_ids = [s[0] for s in sessions]
    attendance_rows = (
        db.query(
            Attendance.student_id,
            Attendance.class_session_id,
            Attendance.status,
            Attendance.marked_at,
        )
        .filter(
            Attendance.student_id.in_(student_ids),
            Attendance.class_session_id.in_(session_ids) if session_ids else False,
        )
        .all()
        if session_ids
        else []
    )
    attendance_by_student_session: dict[tuple[int, int], tuple[str, Optional[datetime]]] = {}
    for student_id, session_id, status, marked_at in attendance_rows:
        attendance_by_student_session[(student_id, session_id)] = (status, marked_at)

    out: dict[int, dict] = {}
    for student_id in student_ids:
        student_batch_ids = batches_by_student.get(student_id, set())
        relevant_sessions: List[Tuple[int, datetime]] = []
        for batch_id in student_batch_ids:
            relevant_sessions.extend(sessions_by_batch.get(batch_id, []))
        total_sessions = len(relevant_sessions)
        if total_sessions == 0:
            out[student_id] = {"attendance_pct": None, "last_class_attended": None}
            continue

        present_count = 0
        last_present_date: Optional[datetime] = None
        for session_id, session_date in relevant_sessions:
            row = attendance_by_student_session.get((student_id, session_id))
            if not row:
                continue
            status, marked_at = row
            if _attendance_status_bucket(status) == "present":
                present_count += 1
                candidate = session_date or marked_at
                if candidate and (last_present_date is None or candidate > last_present_date):
                    last_present_date = candidate

        pct = round(present_count / total_sessions * 100.0, 1) if total_sessions > 0 else None
        out[student_id] = {
            "attendance_pct": pct,
            "last_class_attended": last_present_date,
        }
    return out


def _coach_can_access_student(coach: User, db: Session, student_id: int) -> bool:
    if _is_admin(coach):
        return True
    roster = _coach_roster_student_ids(coach, db)
    return roster is not None and student_id in roster


def _student_theme_performance_rows(db: Session, student_id: int) -> List[ThemePerformanceRow]:
    agg: dict[str, dict] = defaultdict(lambda: {"attempts": 0, "solved": 0})

    themed = (
        db.query(
            PuzzleTheme.theme_key,
            func.count(PuzzleAttempt.id),
            func.sum(case((PuzzleAttempt.is_solved == True, 1), else_=0)),
        )
        .select_from(PuzzleAttempt)
        .join(Puzzle, Puzzle.id == PuzzleAttempt.puzzle_id)
        .join(PuzzleTheme, PuzzleTheme.puzzle_id == Puzzle.id)
        .filter(PuzzleAttempt.user_id == student_id)
        .group_by(PuzzleTheme.theme_key)
        .all()
    )
    for tk, c, sol in themed:
        agg[tk]["attempts"] += int(c or 0)
        agg[tk]["solved"] += int(sol or 0)

    has_rows = exists().where(PuzzleTheme.puzzle_id == Puzzle.id)
    legacy = (
        db.query(Puzzle.theme, PuzzleAttempt.is_solved)
        .select_from(PuzzleAttempt)
        .join(Puzzle, Puzzle.id == PuzzleAttempt.puzzle_id)
        .filter(
            PuzzleAttempt.user_id == student_id,
            ~has_rows,
            Puzzle.theme.isnot(None),
            Puzzle.theme != "",
        )
        .all()
    )
    for theme_str, is_solved in legacy:
        parts = [p.strip() for p in theme_str.replace(",", " ").split() if p.strip()]
        for token in parts:
            agg[token]["attempts"] += 1
            if is_solved:
                agg[token]["solved"] += 1

    rows: List[ThemePerformanceRow] = []
    for key, v in agg.items():
        att, sol = v["attempts"], v["solved"]
        pct = round((sol / att * 100), 1) if att else 0.0
        rows.append(ThemePerformanceRow(theme_key=key, attempts=att, solved=sol, accuracy_pct=pct))
    rows.sort(key=lambda r: r.attempts, reverse=True)
    return rows[:20]


def _weekly_buckets_and_trend(db: Session, student_id: int, now: datetime) -> Tuple[List[WeeklyBucket], str]:
    buckets: List[WeeklyBucket] = []
    for w in range(3, -1, -1):
        week_end = now - timedelta(days=w * 7)
        week_start = week_end - timedelta(days=7)
        att = (
            db.query(func.count(PuzzleAttempt.id))
            .filter(
                PuzzleAttempt.user_id == student_id,
                PuzzleAttempt.attempted_at >= week_start,
                PuzzleAttempt.attempted_at < week_end,
            )
            .scalar()
            or 0
        )
        sol = (
            db.query(func.count(PuzzleAttempt.id))
            .filter(
                PuzzleAttempt.user_id == student_id,
                PuzzleAttempt.attempted_at >= week_start,
                PuzzleAttempt.attempted_at < week_end,
                PuzzleAttempt.is_solved == True,
            )
            .scalar()
            or 0
        )
        pct = round((sol / att * 100), 1) if att else 0.0
        label = f"{week_start.strftime('%b %d')} – {(week_end - timedelta(seconds=1)).strftime('%b %d')}"
        buckets.append(
            WeeklyBucket(
                period_label=label,
                start_date=week_start.date().isoformat(),
                attempts=int(att),
                solved=int(sol),
                accuracy_pct=pct,
            )
        )

    last, prev = buckets[-1], buckets[-2]
    min_att = 3

    def acc(b: WeeklyBucket) -> Optional[float]:
        if not b.attempts:
            return None
        return b.solved / b.attempts * 100

    if last.attempts < min_att and prev.attempts < min_att:
        trend = "insufficient_data"
    else:
        a1, a2 = acc(last), acc(prev)
        if a1 is None and a2 is None:
            trend = "insufficient_data"
        elif a1 is None:
            trend = "stable"
        elif a2 is None:
            trend = "improving" if a1 >= 50 else "stable"
        else:
            if a1 > a2 + 5:
                trend = "improving"
            elif a1 < a2 - 5:
                trend = "declining"
            else:
                trend = "stable"

    return buckets, trend


@router.get("/coaches", response_model=List[CoachAccountRow])
def get_all_coaches(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all coach accounts (admin only)."""
    coaches = db.query(User).filter(User.role == UserRole.coach).order_by(User.created_at.desc()).all()
    return [
        CoachAccountRow(
            id=c.id,
            username=c.username,
            full_name=c.full_name or c.username,
            email=c.email,
            is_active=bool(c.is_active),
            created_at=c.created_at,
            last_login=c.last_login,
        )
        for c in coaches
    ]


@router.put("/coaches/{coach_id}/deactivate")
def deactivate_coach(
    coach_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Deactivate a coach account (admin only)."""
    coach = db.query(User).filter(User.id == coach_id, User.role == UserRole.coach).first()
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")
    if coach.is_active is False:
        return {"success": True, "message": f"Coach {coach.username} is already deactivated"}
    coach.is_active = False
    log_admin_action(
        db,
        admin_id=admin.id,
        action="coach_deactivate",
        target_type="coach",
        target_id=coach.id,
        details={"username": coach.username},
    )
    db.commit()
    return {"success": True, "message": f"Coach {coach.username} deactivated"}


@router.put("/coaches/{coach_id}/reactivate")
def reactivate_coach(
    coach_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Restore a deactivated coach account (admin only)."""
    coach = db.query(User).filter(User.id == coach_id, User.role == UserRole.coach).first()
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")
    if coach.is_active is True:
        return {"success": True, "message": f"Coach {coach.username} is already active"}
    coach.is_active = True
    log_admin_action(
        db,
        admin_id=admin.id,
        action="coach_reactivate",
        target_type="coach",
        target_id=coach.id,
        details={"username": coach.username},
    )
    db.commit()
    return {"success": True, "message": f"Coach {coach.username} reactivated"}


@router.get("/coaches/roster", response_model=List[CoachRosterRow])
def get_coach_roster(
    coach_id: Optional[int] = Query(None, description="Filter for one coach"),
    include_inactive: bool = Query(True, description="Include inactive enrollments"),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin-only nested view: coaches -> batches -> students."""
    coaches_q = db.query(User).filter(User.role == UserRole.coach)
    if coach_id is not None:
        coaches_q = coaches_q.filter(User.id == coach_id)
    coaches = coaches_q.order_by(User.created_at.desc()).all()
    if not coaches:
        return []

    coach_ids = [c.id for c in coaches]
    batches = (
        db.query(Batch)
        .filter(Batch.coach_id.in_(coach_ids))
        .order_by(Batch.name.asc(), Batch.id.asc())
        .all()
    )
    batch_ids = [b.id for b in batches]

    enrollments_q = db.query(StudentBatch).filter(StudentBatch.batch_id.in_(batch_ids))
    if not include_inactive:
        enrollments_q = enrollments_q.filter(StudentBatch.is_active == True)
    enrollments = enrollments_q.order_by(StudentBatch.joined_at.desc()).all() if batch_ids else []

    student_ids = list({e.student_id for e in enrollments})
    students = (
        db.query(User)
        .filter(User.id.in_(student_ids), User.role == UserRole.student)
        .all()
        if student_ids
        else []
    )

    student_by_id = {s.id: s for s in students}
    enrollments_by_batch = {}
    for e in enrollments:
        enrollments_by_batch.setdefault(e.batch_id, []).append(e)

    batches_by_coach = {}
    for b in batches:
        batches_by_coach.setdefault(b.coach_id, []).append(b)

    output: List[CoachRosterRow] = []
    for c in coaches:
        coach_batches = batches_by_coach.get(c.id, [])
        batch_rows: List[CoachRosterBatchRow] = []
        coach_student_ids = set()
        coach_active_students = set()
        coach_inactive_students = set()

        for b in coach_batches:
            batch_students: List[CoachRosterStudentRow] = []
            for enrollment in enrollments_by_batch.get(b.id, []):
                student = student_by_id.get(enrollment.student_id)
                if not student:
                    continue
                coach_student_ids.add(student.id)
                if student.is_active:
                    coach_active_students.add(student.id)
                else:
                    coach_inactive_students.add(student.id)
                batch_students.append(
                    CoachRosterStudentRow(
                        id=student.id,
                        username=student.username,
                        full_name=student.full_name or student.username,
                        email=student.email,
                        is_active=bool(student.is_active),
                        payment_status=enrollment.payment_status or "pending",
                        is_enrollment_active=bool(enrollment.is_active),
                    )
                )

            batch_rows.append(
                CoachRosterBatchRow(
                    id=b.id,
                    name=b.name,
                    description=b.description,
                    schedule=b.schedule,
                    monthly_fee=float(b.monthly_fee or 0),
                    is_active=bool(b.is_active),
                    student_count=len(batch_students),
                    students=batch_students,
                )
            )

        output.append(
            CoachRosterRow(
                id=c.id,
                username=c.username,
                full_name=c.full_name or c.username,
                email=c.email,
                is_active=bool(c.is_active),
                total_batches=len(batch_rows),
                total_students=len(coach_student_ids),
                active_students=len(coach_active_students),
                inactive_students=len(coach_inactive_students),
                batches=batch_rows,
            )
        )

    return output


def resolve_coach_user(coach_ref: str, db: Session) -> User:
    if coach_ref.isdigit():
        coach = (
            db.query(User)
            .filter(User.id == int(coach_ref), User.role == UserRole.coach)
            .first()
        )
        if coach:
            return coach
    coach = (
        db.query(User)
        .filter(User.username == coach_ref, User.role == UserRole.coach)
        .first()
    )
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")
    return coach


def _week_start_utc(now: Optional[datetime] = None) -> datetime:
    now = now or datetime.utcnow()
    start = now - timedelta(days=now.weekday())
    return start.replace(hour=0, minute=0, second=0, microsecond=0)


def _days_since(dt: Optional[datetime], now: Optional[datetime] = None) -> Optional[int]:
    if dt is None:
        return None
    now = now or datetime.utcnow()
    return max(0, (now.date() - dt.date()).days)


def _coach_activity_metrics(
    db: Session, coach_ids: List[int]
) -> Tuple[dict, dict, dict, dict, dict, dict, dict, dict, dict]:
    """Batch-aggregate coach activity counters keyed by coach user id."""
    if not coach_ids:
        return {}, {}, {}, {}, {}, {}, {}, {}

    week_start = _week_start_utc()

    batch_map: dict = {}
    for coach_id, total, active in (
        db.query(
            Batch.coach_id,
            func.count(Batch.id),
            func.coalesce(func.sum(case((Batch.is_active == True, 1), else_=0)), 0),
        )
        .filter(Batch.coach_id.in_(coach_ids))
        .group_by(Batch.coach_id)
        .all()
    ):
        batch_map[int(coach_id)] = (int(total or 0), int(active or 0))

    batch_names_map: dict = defaultdict(list)
    for coach_id, name in (
        db.query(Batch.coach_id, Batch.name)
        .filter(Batch.coach_id.in_(coach_ids))
        .order_by(Batch.name.asc())
        .all()
    ):
        batch_names_map[int(coach_id)].append(name)

    students_map: dict = defaultdict(set)
    active_students_map: dict = defaultdict(set)
    for coach_id, student_id, is_active in (
        db.query(Batch.coach_id, User.id, User.is_active)
        .join(StudentBatch, StudentBatch.batch_id == Batch.id)
        .join(User, User.id == StudentBatch.student_id)
        .filter(
            Batch.coach_id.in_(coach_ids),
            StudentBatch.is_active == True,
            User.role == UserRole.student,
        )
        .all()
    ):
        cid = int(coach_id)
        sid = int(student_id)
        students_map[cid].add(sid)
        if is_active:
            active_students_map[cid].add(sid)

    primary_map = {
        int(coach_id): int(count or 0)
        for coach_id, count in (
            db.query(User.primary_coach_id, func.count(User.id))
            .filter(
                User.primary_coach_id.in_(coach_ids),
                User.role == UserRole.student,
            )
            .group_by(User.primary_coach_id)
            .all()
        )
    }

    assignment_map = {
        int(coach_id): (
            int(total or 0),
            int(active or 0),
            int(week or 0),
        )
        for coach_id, total, active, week in (
            db.query(
                Assignment.coach_id,
                func.count(Assignment.id),
                func.coalesce(func.sum(case((Assignment.is_active == True, 1), else_=0)), 0),
                func.coalesce(
                    func.sum(case((Assignment.created_at >= week_start, 1), else_=0)),
                    0,
                ),
            )
            .filter(Assignment.coach_id.in_(coach_ids))
            .group_by(Assignment.coach_id)
            .all()
        )
    }

    session_map = {
        int(created_by): (int(total or 0), int(week or 0))
        for created_by, total, week in (
            db.query(
                ClassSession.created_by,
                func.count(ClassSession.id),
                func.coalesce(
                    func.sum(case((ClassSession.created_at >= week_start, 1), else_=0)),
                    0,
                ),
            )
            .filter(ClassSession.created_by.in_(coach_ids))
            .group_by(ClassSession.created_by)
            .all()
        )
    }

    attendance_map = {
        int(marked_by): (int(total or 0), int(week or 0))
        for marked_by, total, week in (
            db.query(
                Attendance.marked_by,
                func.count(Attendance.id),
                func.coalesce(
                    func.sum(case((Attendance.marked_at >= week_start, 1), else_=0)),
                    0,
                ),
            )
            .filter(Attendance.marked_by.in_(coach_ids))
            .group_by(Attendance.marked_by)
            .all()
        )
    }

    announcement_map = {
        int(created_by): int(count or 0)
        for created_by, count in (
            db.query(Announcement.created_by, func.count(Announcement.id))
            .filter(Announcement.created_by.in_(coach_ids))
            .group_by(Announcement.created_by)
            .all()
        )
    }

    return (
        batch_map,
        batch_names_map,
        students_map,
        active_students_map,
        primary_map,
        assignment_map,
        session_map,
        attendance_map,
        announcement_map,
    )


def _activity_row_from_coach(
    coach: User,
    batch_map: dict,
    batch_names_map: dict,
    students_map: dict,
    active_students_map: dict,
    primary_map: dict,
    assignment_map: dict,
    session_map: dict,
    attendance_map: dict,
    announcement_map: dict,
) -> CoachActivityRow:
    cid = coach.id
    total_batches, active_batches = batch_map.get(cid, (0, 0))
    assign_total, assign_active, assign_week = assignment_map.get(cid, (0, 0, 0))
    sessions_total, sessions_week = session_map.get(cid, (0, 0))
    attendance_total, attendance_week = attendance_map.get(cid, (0, 0))
    return CoachActivityRow(
        id=cid,
        username=coach.username,
        full_name=coach.full_name or coach.username,
        email=coach.email,
        is_active=bool(coach.is_active),
        created_at=coach.created_at,
        last_login=coach.last_login,
        days_since_login=_days_since(coach.last_login),
        total_batches=total_batches,
        active_batches=active_batches,
        total_students=len(students_map.get(cid, set())),
        active_students=len(active_students_map.get(cid, set())),
        primary_students=primary_map.get(cid, 0),
        total_assignments=assign_total,
        active_assignments=assign_active,
        assignments_this_week=assign_week,
        sessions_total=sessions_total,
        sessions_this_week=sessions_week,
        attendance_marked_total=attendance_total,
        attendance_marked_this_week=attendance_week,
        announcements_total=announcement_map.get(cid, 0),
        batch_names=batch_names_map.get(cid, []),
    )


def _recent_coach_activity(db: Session, coach_id: int, limit: int = 12) -> List[CoachRecentActivityRow]:
    rows: List[CoachRecentActivityRow] = []

    for session in (
        db.query(ClassSession)
        .filter(ClassSession.created_by == coach_id)
        .order_by(ClassSession.created_at.desc())
        .limit(limit)
        .all()
    ):
        topic = session.topic or "Class session"
        rows.append(
            CoachRecentActivityRow(
                activity_type="session",
                label=topic,
                occurred_at=session.created_at,
            )
        )

    for assignment in (
        db.query(Assignment)
        .filter(Assignment.coach_id == coach_id)
        .order_by(Assignment.created_at.desc())
        .limit(limit)
        .all()
    ):
        rows.append(
            CoachRecentActivityRow(
                activity_type="assignment",
                label=assignment.title,
                occurred_at=assignment.created_at,
            )
        )

    for attendance in (
        db.query(Attendance)
        .filter(Attendance.marked_by == coach_id)
        .order_by(Attendance.marked_at.desc())
        .limit(limit)
        .all()
    ):
        rows.append(
            CoachRecentActivityRow(
                activity_type="attendance",
                label=f"Marked attendance ({attendance.status})",
                occurred_at=attendance.marked_at,
            )
        )

    for announcement in (
        db.query(Announcement)
        .filter(Announcement.created_by == coach_id)
        .order_by(Announcement.created_at.desc())
        .limit(limit)
        .all()
    ):
        rows.append(
            CoachRecentActivityRow(
                activity_type="announcement",
                label=announcement.title,
                occurred_at=announcement.created_at,
            )
        )

    rows.sort(key=lambda r: r.occurred_at, reverse=True)
    return rows[:limit]


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

    return {
        "total_students": len(students),
        "average_xp": round(average_xp, 1),
        "most_active": most_active,
        "needs_attention": [],
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
    coach_id: Optional[int] = Query(None, description="Admin: filter by assigned coach"),
    unassigned_only: bool = Query(False, description="Admin: only students with no assigned coach"),
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """
    Students in this coach's batches with basic stats (active and deactivated).
    Admins may filter by coach assignment; coaches see their roster including inactive accounts.
    """
    q = db.query(User).filter(User.role == UserRole.student)
    is_admin_user = _is_admin(coach)
    if is_admin_user:
        if unassigned_only:
            q = q.filter(User.primary_coach_id.is_(None))
        elif coach_id is not None:
            target = db.query(User).filter(User.id == coach_id, User.role == UserRole.coach).first()
            if not target:
                raise HTTPException(status_code=404, detail="Coach not found")
            q = q.filter(User.primary_coach_id == coach_id)

    coach_map = {}
    if is_admin_user:
        coach_rows = db.query(User).filter(User.role == UserRole.coach).all()
        coach_map = {c.id: c for c in coach_rows}

    roster = _coach_roster_student_ids(coach, db)
    if not is_admin_user and roster is not None:
        if not roster:
            return []
        q = q.filter(User.id.in_(roster))
    students = q.all()
    student_ids = [s.id for s in students]
    batch_names_by_student = _bulk_student_batch_names(db, student_ids, coach)
    attendance_by_student = _bulk_student_attendance(db, student_ids, coach)

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
        internal_rating = student.rating or 0
        online_rating = student.puzzle_rating
        attendance_info = attendance_by_student.get(
            student.id,
            {"attendance_pct": None, "last_class_attended": None},
        )
        student_stats.append(
            StudentStats(
                id=student.id,
                username=student.username,
                full_name=student.full_name or student.username,
                email=student.email,
                age=student.age,
                xp=xp_val,
                total_xp=xp_val,
                level=student.level or 1,
                rating=internal_rating,
                internal_rating=internal_rating,
                online_rating=online_rating,
                fide_rating=None,
                batch_names=batch_names_by_student.get(student.id, []),
                skill_level=_skill_level_label(internal_rating),
                attendance_pct=attendance_info.get("attendance_pct"),
                last_class_attended=attendance_info.get("last_class_attended"),
                created_at=student.created_at,
                last_active=last_active,
                days_since_active=days_since_active,
                is_active=bool(student.is_active),
                total_puzzles_attempted=attempted,
                total_puzzles_solved=solved,
                success_rate=round(success_rate, 1),
                coach_id=student.primary_coach_id,
                coach_username=(
                    coach_map.get(student.primary_coach_id).username
                    if student.primary_coach_id in coach_map
                    else None
                ),
                coach_full_name=(
                    coach_map.get(student.primary_coach_id).full_name
                    if student.primary_coach_id in coach_map
                    else None
                ),
                is_unassigned=student.primary_coach_id is None,
                priority_tags=[],
            )
        )
    return student_stats


@router.put("/{student_id}/assign-coach")
def assign_student_to_coach(
    student_id: int,
    payload: StudentCoachAssignRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    active_enrollment_coach_ids = {
        int(cid)
        for (cid,) in (
            db.query(Batch.coach_id)
            .join(StudentBatch, StudentBatch.batch_id == Batch.id)
            .filter(
                StudentBatch.student_id == student_id,
                StudentBatch.is_active == True,
                Batch.is_active == True,
            )
            .distinct()
            .all()
        )
        if cid is not None
    }

    coach_user: Optional[User] = None
    previous_coach_id = student.primary_coach_id
    removed_enrollment_batch_ids: List[int] = []
    if payload.coach_id is not None:
        coach_user = db.query(User).filter(User.id == payload.coach_id, User.role == UserRole.coach).first()
        if not coach_user:
            raise HTTPException(status_code=404, detail="Coach not found")
        if coach_user.is_active is False:
            raise HTTPException(status_code=400, detail="Cannot assign an inactive coach")
        if len(active_enrollment_coach_ids) > 1:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Student has active enrollments under multiple coaches. "
                    "Resolve those enrollments before reassigning."
                ),
            )
        conflicting = (
            db.query(StudentBatch)
            .join(Batch, Batch.id == StudentBatch.batch_id)
            .filter(
                StudentBatch.student_id == student_id,
                StudentBatch.is_active == True,
                Batch.coach_id != payload.coach_id,
            )
            .all()
        )
        for enrollment in conflicting:
            enrollment.is_active = False
            removed_enrollment_batch_ids.append(int(enrollment.batch_id))
    elif active_enrollment_coach_ids:
        raise HTTPException(
            status_code=400,
            detail="Cannot unassign coach while student has active batch enrollments",
        )

    student.primary_coach_id = payload.coach_id
    log_admin_action(
        db,
        admin_id=_admin.id,
        action="student_assign_coach",
        target_type="student",
        target_id=student.id,
        details={
            "previous_coach_id": previous_coach_id,
            "new_coach_id": payload.coach_id,
            "student_username": student.username,
            "removed_enrollment_batch_ids": removed_enrollment_batch_ids,
        },
    )
    db.commit()
    db.refresh(student)

    return {
        "success": True,
        "student_id": student.id,
        "coach_id": student.primary_coach_id,
        "coach_username": coach_user.username if coach_user else None,
        "coach_full_name": (coach_user.full_name or coach_user.username) if coach_user else None,
        "is_unassigned": student.primary_coach_id is None,
    }


def build_student_detailed_stats(db: Session, student: User, coach: User) -> StudentDetailedStats:
    """Aggregate puzzle/game analytics for a student (coach or parent reports)."""
    from models import DifficultyLevel

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
    games_played = (
        db.query(func.count(Game.id))
        .filter(
            or_(
                Game.white_player_id == student.id,
                Game.black_player_id == student.id,
            ),
            Game.ended_at.isnot(None),
        )
        .scalar()
        or 0
    )
    games_won = (
        db.query(func.count(Game.id))
        .filter(
            Game.winner_id == student.id,
            Game.ended_at.isnot(None),
        )
        .scalar()
        or 0
    )
    games_this_week = (
        db.query(func.count(Game.id))
        .filter(
            or_(
                Game.white_player_id == student.id,
                Game.black_player_id == student.id,
            ),
            Game.started_at >= week_ago,
        )
        .scalar()
        or 0
    )
    game_win_rate = (games_won / games_played * 100) if games_played > 0 else 0.0

    now = datetime.utcnow()
    theme_performance = _student_theme_performance_rows(db, student.id)
    weekly_buckets, weekly_trend = _weekly_buckets_and_trend(db, student.id, now)
    internal_rating = student.rating or 0
    batch_names = _bulk_student_batch_names(db, [student.id], coach).get(student.id, [])
    attendance_info = _bulk_student_attendance(db, [student.id], coach).get(
        student.id,
        {"attendance_pct": None, "last_class_attended": None},
    )

    return StudentDetailedStats(
        id=student.id,
        username=student.username,
        full_name=student.full_name or student.username,
        email=student.email,
        guardian_email=student.guardian_email,
        student_email=_student_personal_email(student),
        phone=student.phone,
        whatsapp=student.whatsapp,
        age=student.age,
        rating=internal_rating,
        skill_level=_skill_level_label(internal_rating),
        batch_names=batch_names,
        attendance_pct=attendance_info.get("attendance_pct"),
        last_class_attended=attendance_info.get("last_class_attended"),
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
        games_played=games_played,
        games_won=games_won,
        game_win_rate=round(game_win_rate, 1),
        games_this_week=games_this_week,
        days_since_active=days_since_active,
        is_active=bool(student.is_active),
        theme_performance=theme_performance,
        weekly_buckets=weekly_buckets,
        weekly_trend=weekly_trend,
    )


@router.get("/{student_ref}", response_model=StudentDetailedStats)
def get_student_details(
    student_ref: str,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Get detailed stats for a specific student (must be on coach roster unless admin)."""
    student = resolve_student_user(student_ref, db)
    if not _coach_can_access_student(coach, db, student.id):
        raise HTTPException(status_code=404, detail="Student not found")
    if not _is_admin(coach) and student.is_active is False:
        raise HTTPException(status_code=404, detail="Student not found")

    return build_student_detailed_stats(db, student, coach)


@router.patch("/{student_ref}", response_model=StudentDetailedStats)
def update_student_details(
    student_ref: str,
    payload: CoachStudentUpdate,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Update editable student profile and contact fields (coach roster or admin)."""
    student = resolve_student_user(student_ref, db)
    if not _coach_can_access_student(coach, db, student.id):
        raise HTTPException(status_code=404, detail="Student not found")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "full_name" in updates:
        student.full_name = updates["full_name"].strip()

    if "age" in updates:
        student.age = updates["age"]

    if "guardian_email" in updates:
        raw = updates["guardian_email"]
        student.guardian_email = raw.strip().lower() if raw and raw.strip() else None
        link_student_to_guardian_parent(student, db)

    if "phone" in updates:
        student.phone = _normalize_optional_contact(updates["phone"])

    if "whatsapp" in updates:
        student.whatsapp = _normalize_optional_contact(updates["whatsapp"])

    if "student_email" in updates:
        raw = updates["student_email"]
        if raw and raw.strip():
            resolved = resolve_student_email(raw, student.username)
            taken = (
                db.query(User)
                .filter(User.email == resolved, User.id != student.id)
                .first()
            )
            if taken:
                raise HTTPException(status_code=400, detail="Email already registered")
            student.email = resolved
        else:
            student.email = student_placeholder_email(student.username)

    db.commit()
    db.refresh(student)
    return get_student_details(student_ref, coach, db)


@router.post("/{student_ref}/award-xp")
def award_bonus_xp(
    student_ref: str,
    xp_amount: int = Query(..., ge=1, le=100, description="XP to award (1-100)"),
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Award bonus XP to a student on this coach's roster (any student if admin)."""
    student = resolve_student_user(student_ref, db)
    if not _coach_can_access_student(coach, db, student.id):
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


@router.post("/{student_ref}/nudge")
def nudge_student(
    student_ref: str,
    payload: StudentNudgeRequest,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Send an in-app reminder notification to a student on the coach roster."""
    student = resolve_student_user(student_ref, db)
    if not _coach_can_access_student(coach, db, student.id):
        raise HTTPException(status_code=404, detail="Student not found")
    if student.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot nudge a deactivated student",
        )

    coach_name = (coach.full_name or coach.username or "Your coach").strip()
    default_msg = (
        f"{coach_name} suggests you log in soon and practice puzzles or finish any open assignments."
    )
    message = (payload.message or default_msg).strip()
    if not message:
        message = default_msg

    note = Notification(
        user_id=student.id,
        category="coach",
        title="Message from your coach",
        message=message,
        link_url="/puzzles",
    )
    db.add(note)
    db.commit()

    return {"success": True, "message": "Reminder sent"}


@router.put("/{student_ref}/deactivate")
def deactivate_student(
    student_ref: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Deactivate a student account (admin only). Does not remove database rows."""
    student = resolve_student_user(student_ref, db)
    if student.is_active is False:
        return {
            "success": True,
            "message": f"Student {student.username} is already deactivated",
        }

    student.is_active = False
    log_admin_action(
        db,
        admin_id=admin.id,
        action="student_deactivate",
        target_type="student",
        target_id=student.id,
        details={"username": student.username},
    )
    db.commit()
    return {"success": True, "message": f"Student {student.username} deactivated"}


@router.put("/{student_ref}/reactivate")
def reactivate_student(
    student_ref: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Restore a deactivated student account (admin only)."""
    student = resolve_student_user(student_ref, db)
    if student.is_active is True:
        return {
            "success": True,
            "message": f"Student {student.username} is already active",
        }

    student.is_active = True
    log_admin_action(
        db,
        admin_id=admin.id,
        action="student_reactivate",
        target_type="student",
        target_id=student.id,
        details={"username": student.username},
    )
    db.commit()
    return {"success": True, "message": f"Student {student.username} reactivated"}


@admin_router.get("/coaches", response_model=List[CoachAccountRow])
def admin_get_all_coaches(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return get_all_coaches(admin=admin, db=db)


@admin_router.put("/coaches/{coach_id}/deactivate")
def admin_deactivate_coach(
    coach_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return deactivate_coach(coach_id=coach_id, admin=admin, db=db)


@admin_router.put("/coaches/{coach_id}/reactivate")
def admin_reactivate_coach(
    coach_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return reactivate_coach(coach_id=coach_id, admin=admin, db=db)


@admin_router.get("/coaches/roster", response_model=List[CoachRosterRow])
def admin_get_coach_roster(
    coach_id: Optional[int] = Query(None, description="Filter for one coach"),
    include_inactive: bool = Query(True, description="Include inactive enrollments"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return get_coach_roster(
        coach_id=coach_id,
        include_inactive=include_inactive,
        _admin=admin,
        db=db,
    )


@admin_router.get("/coaches/activity", response_model=List[CoachActivityRow])
def admin_list_coach_activity(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin overview of all coaches with activity metrics."""
    coaches = (
        db.query(User)
        .filter(User.role == UserRole.coach)
        .order_by(User.full_name.asc(), User.username.asc())
        .all()
    )
    coach_ids = [c.id for c in coaches]
    metrics = _coach_activity_metrics(db, coach_ids)
    return [
        _activity_row_from_coach(coach, *metrics)
        for coach in coaches
    ]


@admin_router.get("/coaches/{coach_ref}/activity", response_model=CoachDetailedActivity)
def admin_get_coach_activity_detail(
    coach_ref: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Detailed coach activity for admin tracking."""
    coach = resolve_coach_user(coach_ref, db)
    metrics = _coach_activity_metrics(db, [coach.id])
    summary = _activity_row_from_coach(coach, *metrics)

    batches = (
        db.query(Batch)
        .filter(Batch.coach_id == coach.id)
        .order_by(Batch.name.asc())
        .all()
    )
    batch_ids = [b.id for b in batches]
    enrollments_by_batch: dict = defaultdict(list)
    if batch_ids:
        for enrollment in (
            db.query(StudentBatch)
            .filter(StudentBatch.batch_id.in_(batch_ids), StudentBatch.is_active == True)
            .all()
        ):
            enrollments_by_batch[enrollment.batch_id].append(enrollment)

    batch_rows = [
        CoachActivityBatchRow(
            id=b.id,
            name=b.name,
            is_active=bool(b.is_active),
            student_count=len(enrollments_by_batch.get(b.id, [])),
            schedule=b.schedule,
        )
        for b in batches
    ]

    return CoachDetailedActivity(
        **summary.model_dump(),
        batches=batch_rows,
        recent_activity=_recent_coach_activity(db, coach.id),
    )


@admin_router.get("/students", response_model=List[StudentStats])
def admin_get_all_students(
    coach_id: Optional[int] = Query(None, description="Filter by assigned coach"),
    unassigned_only: bool = Query(False, description="Only students with no assigned coach"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return get_all_students(
        coach_id=coach_id,
        unassigned_only=unassigned_only,
        coach=admin,
        db=db,
    )


@admin_router.put("/students/{student_id}/assign-coach")
def admin_assign_student_to_coach(
    student_id: int,
    payload: StudentCoachAssignRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return assign_student_to_coach(
        student_id=student_id,
        payload=payload,
        _admin=admin,
        db=db,
    )


@admin_router.put("/students/{student_id}/deactivate")
def admin_deactivate_student(
    student_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return deactivate_student(student_id=student_id, admin=admin, db=db)


@admin_router.put("/students/{student_id}/reactivate")
def admin_reactivate_student(
    student_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return reactivate_student(student_id=student_id, admin=admin, db=db)
