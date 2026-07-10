# batch_endpoints.py - Coach Batch Management API Endpoints

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
import logging
import os
import secrets
import json

from email_service import send_coach_invite_email
from parent_payment_utils import compute_billing_status

from models import (
    Batch,
    StudentBatch,
    ClassSession,
    SessionStudent,
    Announcement,
    Payment,
    PaymentBillingAdjustment,
    Notification,
    User,
    UserRole,
    CoachSignupInvite,
    AdminAuditLog,
    Attendance,
)
from batch_schedule_service import (
    apply_schedule_fields_to_batch,
    batch_to_response,
    active_batch_student_ids,
    seed_session_roster,
    session_to_response,
    find_session_near_datetime,
    is_admin_user,
)
from schedule_utils import combine_date_and_schedule_time
from auth import get_current_user, get_password_hash
from database import get_db
from account_utils import create_student_user
from audit_service import log_admin_action
from schemas import (
    BatchCreate, BatchUpdate, BatchResponse,
    ClassSessionCreate, ClassSessionResponse, OpenRecurringSlotRequest,
    AnnouncementCreate, AnnouncementResponse,
    StudentBatchAdd, StudentBatchResponse,
    PaymentResponse,
    BulkStudentCreateRequest, BulkStudentCreateResponse, BulkStudentCreatedRow,
)

router = APIRouter(prefix="/api/batches", tags=["batches"])


def require_coach(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRole.coach, UserRole.admin, "coach", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only coaches and admins can access this endpoint"
        )
    return user


def require_admin(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in ["admin", UserRole.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return user


def _get_accessible_batch(db: Session, batch_id: int, user: User) -> Batch:
    """Coaches may only access their batches; admins may access any batch."""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if not is_admin_user(user) and batch.coach_id != user.id:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


def _parse_billing_month(s: str) -> tuple[int, int]:
    parts = s.split("-")
    if len(parts) != 2:
        raise ValueError("invalid billing month")
    y, m = int(parts[0]), int(parts[1])
    if m < 1 or m > 12:
        raise ValueError("invalid billing month")
    return y, m


def _is_past_tenth_of_billing_month(billing_month: str, now: datetime) -> bool:
    y, m = _parse_billing_month(billing_month)
    return now.date() > date(y, m, 10)


def _month_key(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def _next_billing_month(billing_month: str) -> str:
    year, month = _parse_billing_month(billing_month)
    month += 1
    if month > 12:
        year += 1
        month = 1
    return _month_key(year, month)


def _billing_months_between(start_month: str, end_month: str) -> list[str]:
    months: list[str] = []
    current = start_month
    while current <= end_month:
        months.append(current)
        if current == end_month:
            break
        current = _next_billing_month(current)
    return months


def _billing_month_start(billing_month: str) -> datetime:
    year, month = _parse_billing_month(billing_month)
    return datetime(year, month, 1)


def _billing_month_range(billing_month: str) -> tuple[datetime, datetime]:
    start = _billing_month_start(billing_month)
    end = _next_billing_month(billing_month)
    end_dt = _billing_month_start(end)
    return start, end_dt


def _empty_payments_payload(month: str) -> dict:
    return {
        "summary": {
            "total_students": 0,
            "paid_count": 0,
            "pending_count": 0,
            "overdue_count": 0,
            "total_collected": 0,
            "total_pending_amount": 0,
            "students_with_pending_balance": 0,
            "billing_month": month,
        },
        "payments": [],
    }


def _fee_for_classes(monthly_fee: float, billable_classes: int, planned_classes: int) -> float:
    fee = float(monthly_fee or 0)
    classes = max(int(billable_classes or 0), 0)
    denom = max(int(planned_classes or 0), 1)
    return round(fee * classes / denom, 2)


DEFAULT_EXPECTED_CLASSES_PER_MONTH = 8
FEE_FOR_EIGHT_CLASSES = 2500.0
FEE_FOR_FOUR_TO_FIVE_CLASSES = 1500.0


def _fee_for_expected_class_count(expected: int) -> float:
    """Tiered monthly fee from expected class count (Fees admin page)."""
    n = max(int(expected or 0), 0)
    if n >= DEFAULT_EXPECTED_CLASSES_PER_MONTH:
        return FEE_FOR_EIGHT_CLASSES
    if 4 <= n <= 5:
        return FEE_FOR_FOUR_TO_FIVE_CLASSES
    return round(FEE_FOR_EIGHT_CLASSES * n / DEFAULT_EXPECTED_CLASSES_PER_MONTH, 2)


def _resolve_payment_expected_classes(adj) -> int:
    """Expected class denominator for payments (default 8 per month)."""
    if adj and adj.expected_class_count is not None:
        return int(adj.expected_class_count)
    return DEFAULT_EXPECTED_CLASSES_PER_MONTH


def _count_regular_batch_sessions(db: Session, batch_id: int, month_start, month_end) -> int:
    return (
        db.query(ClassSession)
        .filter(
            ClassSession.batch_id == batch_id,
            ClassSession.date >= month_start,
            ClassSession.date < month_end,
            ClassSession.session_kind == "regular",
        )
        .count()
    )


def _resolve_student_primary_batch(
    student_id: int,
    student_enrollments: list,
    batch_by_id: dict,
    fallback_batch_by_coach: dict,
    coach_id: Optional[int],
) -> Optional[int]:
    active = [e for e in student_enrollments if e.is_active]
    pool = active or student_enrollments
    if pool:
        pool = sorted(pool, key=lambda e: (e.joined_at or datetime.min, e.id), reverse=True)
        return int(pool[0].batch_id)
    if coach_id is not None:
        fallback = fallback_batch_by_coach.get(int(coach_id))
        if fallback:
            return int(fallback.id)
    return None


def _notify_batch_students(
    db: Session,
    batch_id: int,
    *,
    title: str,
    message: str,
    link_url: Optional[str] = "/dashboard",
    student_ids: Optional[List[int]] = None,
) -> int:
    query = (
        db.query(StudentBatch.student_id)
        .join(User, User.id == StudentBatch.student_id)
        .filter(
            StudentBatch.batch_id == batch_id,
            StudentBatch.is_active == True,
            User.role == UserRole.student,
            User.is_active == True,
        )
    )
    if student_ids is not None:
        query = query.filter(StudentBatch.student_id.in_(student_ids))
    student_ids = [sid for (sid,) in query.distinct().all()]
    for student_id in student_ids:
        db.add(
            Notification(
                user_id=student_id,
                category="system",
                title=title,
                message=message,
                link_url=link_url,
            )
        )
    return len(student_ids)


# ==================== BATCH CRUD ====================

@router.post("", response_model=BatchResponse)
def create_batch(data: BatchCreate, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    fee = data.monthly_fee if is_admin_user(coach) else 0
    batch = Batch(
        name=data.name,
        description=data.description,
        schedule=data.schedule,
        coach_id=coach.id,
        monthly_fee=fee,
        default_duration_minutes=data.default_duration_minutes or 60,
        default_meeting_link=data.default_meeting_link,
        schedule_timezone=data.schedule_timezone or "Asia/Kolkata",
    )
    apply_schedule_fields_to_batch(
        batch,
        schedule_weekdays=data.schedule_weekdays,
        schedule_time=data.schedule_time,
        schedule_timezone=data.schedule_timezone,
        default_duration_minutes=data.default_duration_minutes,
        default_meeting_link=data.default_meeting_link,
        schedule_text=data.schedule,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch_to_response(batch, 0, coach)


@router.get("", response_model=List[BatchResponse])
def list_batches(coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batches = db.query(Batch).filter(Batch.coach_id == coach.id).all()
    result = []
    for b in batches:
        count = db.query(StudentBatch).filter(
            StudentBatch.batch_id == b.id, StudentBatch.is_active == True
        ).count()
        result.append(batch_to_response(b, count, coach))
    return result


@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: int, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = _get_accessible_batch(db, batch_id, coach)
    count = db.query(StudentBatch).filter(
        StudentBatch.batch_id == batch.id, StudentBatch.is_active == True
    ).count()
    return batch_to_response(batch, count, coach)


@router.put("/{batch_id}", response_model=BatchResponse)
def update_batch(batch_id: int, data: BatchUpdate, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = _get_accessible_batch(db, batch_id, coach)
    payload = data.model_dump(exclude_unset=True)
    schedule_weekdays = payload.pop("schedule_weekdays", None)
    schedule_time = payload.pop("schedule_time", None)
    schedule_timezone = payload.pop("schedule_timezone", None)
    default_duration_minutes = payload.pop("default_duration_minutes", None)
    default_meeting_link = payload.pop("default_meeting_link", None)
    schedule_text = payload.pop("schedule", None)
    if not is_admin_user(coach):
        payload.pop("monthly_fee", None)
    for field, value in payload.items():
        setattr(batch, field, value)
    apply_schedule_fields_to_batch(
        batch,
        schedule_weekdays=schedule_weekdays,
        schedule_time=schedule_time,
        schedule_timezone=schedule_timezone,
        default_duration_minutes=default_duration_minutes,
        default_meeting_link=default_meeting_link,
        schedule_text=schedule_text,
    )
    db.commit()
    db.refresh(batch)
    count = db.query(StudentBatch).filter(
        StudentBatch.batch_id == batch.id, StudentBatch.is_active == True
    ).count()
    return batch_to_response(batch, count, coach)


# ==================== STUDENT MANAGEMENT ====================

@router.post("/{batch_id}/students", response_model=StudentBatchResponse)
def add_student_to_batch(batch_id: int, data: StudentBatchAdd, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = _get_accessible_batch(db, batch_id, coach)
    student = db.query(User).filter(User.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.role not in [UserRole.student, "student"]:
        raise HTTPException(status_code=400, detail="Only student accounts can be added to batches")
    if student.primary_coach_id is None:
        raise HTTPException(
            status_code=400,
            detail="Student has no assigned coach. Assign coach from Admin > Student accounts first.",
        )
    if int(student.primary_coach_id) != int(batch.coach_id):
        raise HTTPException(
            status_code=400,
            detail="Student is assigned to a different coach. Update coach assignment before adding to this batch.",
        )
    existing = db.query(StudentBatch).filter(
        StudentBatch.student_id == data.student_id,
        StudentBatch.batch_id == batch_id,
        StudentBatch.is_active == True,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student already in this batch")
    sb = StudentBatch(student_id=data.student_id, batch_id=batch_id)
    db.add(sb)
    db.commit()
    db.refresh(sb)
    return StudentBatchResponse(
        student_id=sb.student_id, student_name=student.full_name,
        student_username=student.username, batch_id=sb.batch_id,
        payment_status=sb.payment_status, joined_at=sb.joined_at,
        is_active=sb.is_active,
    )


@router.post("/{batch_id}/students/bulk-create", response_model=BulkStudentCreateResponse)
def bulk_create_batch_students(
    batch_id: int,
    data: BulkStudentCreateRequest,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Create multiple student accounts and enroll them in a batch."""
    batch = _get_accessible_batch(db, batch_id, coach)

    created_rows: List[BulkStudentCreatedRow] = []
    warnings: List[str] = []

    for row in data.students:
        password = row.password or data.default_password
        if not password:
            raise HTTPException(
                status_code=400,
                detail=f"Password required for student '{row.username}' (set per-row or default_password)",
            )
        full_name = f"{row.first_name.strip()} {row.last_name.strip()}".strip()
        try:
            student = create_student_user(
                db,
                username=row.username,
                full_name=full_name,
                password_hash=get_password_hash(password),
                guardian_email=str(row.guardian_email) if row.guardian_email else None,
                age=row.age,
                gender=row.gender,
                primary_coach_id=coach.id,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Could not create '{row.username}': {exc}",
            )

        existing_sb = db.query(StudentBatch).filter(
            StudentBatch.student_id == student.id,
            StudentBatch.batch_id == batch_id,
            StudentBatch.is_active == True,
        ).first()
        if not existing_sb:
            db.add(StudentBatch(student_id=student.id, batch_id=batch_id))

        if not row.guardian_email:
            warnings.append(
                f"{row.username}: no guardian email — parent account won't auto-link"
            )

        created_rows.append(
            BulkStudentCreatedRow(
                student_id=student.id,
                full_name=student.full_name,
                username=student.username,
                guardian_email=student.guardian_email,
                password=password,
            )
        )

    db.commit()
    return BulkStudentCreateResponse(created=created_rows, warnings=warnings)


@router.get("/{batch_id}/students", response_model=List[StudentBatchResponse])
def list_batch_students(batch_id: int, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = _get_accessible_batch(db, batch_id, coach)
    sbs = db.query(StudentBatch).filter(StudentBatch.batch_id == batch_id, StudentBatch.is_active == True).all()
    result = []
    for sb in sbs:
        student = db.query(User).filter(User.id == sb.student_id).first()
        result.append(StudentBatchResponse(
            student_id=sb.student_id, student_name=student.full_name if student else "Unknown",
            student_username=student.username if student else "unknown",
            batch_id=sb.batch_id, payment_status=sb.payment_status,
            joined_at=sb.joined_at, is_active=sb.is_active,
        ))
    return result


@router.delete("/{batch_id}/students/{student_id}")
def remove_student_from_batch(batch_id: int, student_id: int, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = _get_accessible_batch(db, batch_id, coach)
    sb = db.query(StudentBatch).filter(
        StudentBatch.student_id == student_id,
        StudentBatch.batch_id == batch_id,
        StudentBatch.is_active == True,
    ).first()
    if not sb:
        raise HTTPException(status_code=404, detail="Student not in this batch")
    sb.is_active = False
    db.commit()
    return {"detail": "Student removed from batch"}


# ==================== CLASS SESSIONS ====================

@router.post("/{batch_id}/classes", response_model=ClassSessionResponse)
def create_class_session(batch_id: int, data: ClassSessionCreate, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = _get_accessible_batch(db, batch_id, coach)

    kind = (data.session_kind or "regular").strip().lower()
    if kind not in ("regular", "makeup"):
        raise HTTPException(status_code=400, detail="session_kind must be 'regular' or 'makeup'")

    roster_ids = list(data.student_ids or [])
    if kind == "makeup":
        if not roster_ids:
            raise HTTPException(status_code=400, detail="Make-up sessions require at least one student")
        batch_ids_set = set(active_batch_student_ids(db, batch_id))
        invalid = [sid for sid in roster_ids if sid not in batch_ids_set]
        if invalid:
            raise HTTPException(status_code=400, detail="All students must belong to this class")

    duration = data.duration_minutes or batch.default_duration_minutes or 60
    meeting_link = data.meeting_link or batch.default_meeting_link
    topic = data.topic or ("Make-up session" if kind == "makeup" else "Class session")

    session = ClassSession(
        batch_id=batch_id,
        date=data.date,
        duration_minutes=duration,
        topic=topic,
        meeting_link=meeting_link,
        notes=data.notes,
        session_kind=kind,
        created_by=coach.id,
    )
    db.add(session)
    db.flush()

    if kind == "makeup":
        seed_session_roster(db, session, batch_id, roster_ids, default_expected=True)
        notify_ids = roster_ids
    else:
        seed_session_roster(db, session, batch_id, roster_ids or None, default_expected=True)
        notify_ids = None

    coach_name = coach.full_name or coach.username or "Your coach"
    class_topic = (topic or "New class session").strip()
    _notify_batch_students(
        db,
        batch_id,
        title="Make-up class scheduled" if kind == "makeup" else "New class scheduled",
        message=f"{coach_name} scheduled: {class_topic}.",
        link_url="/dashboard",
        student_ids=notify_ids,
    )
    db.commit()
    db.refresh(session)
    return session_to_response(session, batch.name, db)


@router.post("/{batch_id}/classes/open-slot", response_model=ClassSessionResponse)
def open_recurring_slot(
    batch_id: int,
    data: OpenRecurringSlotRequest,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    """Create (or return) a regular session for a recurring calendar slot."""
    batch = _get_accessible_batch(db, batch_id, coach)

    slot_date = combine_date_and_schedule_time(data.date, batch.schedule_time)
    existing = find_session_near_datetime(db, batch_id, slot_date)
    if existing:
        return session_to_response(existing, batch.name, db)

    session = ClassSession(
        batch_id=batch_id,
        date=slot_date,
        duration_minutes=batch.default_duration_minutes or 60,
        topic="Class session",
        meeting_link=batch.default_meeting_link,
        session_kind="regular",
        created_by=coach.id,
    )
    db.add(session)
    db.flush()
    seed_session_roster(db, session, batch_id, default_expected=True)
    db.commit()
    db.refresh(session)
    return session_to_response(session, batch.name, db)


@router.get("/{batch_id}/classes", response_model=List[ClassSessionResponse])
def list_class_sessions(batch_id: int, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = _get_accessible_batch(db, batch_id, coach)
    sessions = db.query(ClassSession).filter(
        ClassSession.batch_id == batch_id
    ).order_by(ClassSession.date.desc()).all()
    return [session_to_response(s, batch.name, db) for s in sessions]


# ==================== ANNOUNCEMENTS ====================

@router.post("/{batch_id}/announcements", response_model=AnnouncementResponse)
def create_announcement(batch_id: int, data: AnnouncementCreate, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = _get_accessible_batch(db, batch_id, coach)
    ann = Announcement(
        batch_id=batch_id,
        title=data.title,
        message=data.message,
        created_by=coach.id,
    )
    db.add(ann)
    coach_name = coach.full_name or coach.username or "Your coach"
    _notify_batch_students(
        db,
        batch_id,
        title=f"Batch announcement: {data.title}",
        message=f"{coach_name}: {data.message}",
        link_url="/dashboard",
    )
    db.commit()
    db.refresh(ann)
    return AnnouncementResponse(
        id=ann.id, batch_id=ann.batch_id, title=ann.title,
        message=ann.message, created_by=ann.created_by,
        created_at=ann.created_at, batch_name=batch.name,
        coach_name=coach.full_name,
    )


@router.get("/{batch_id}/announcements", response_model=List[AnnouncementResponse])
def list_announcements(batch_id: int, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = _get_accessible_batch(db, batch_id, coach)
    anns = db.query(Announcement).filter(
        Announcement.batch_id == batch_id
    ).order_by(Announcement.created_at.desc()).all()
    return [
        AnnouncementResponse(
            id=a.id, batch_id=a.batch_id, title=a.title,
            message=a.message, created_by=a.created_by,
            created_at=a.created_at, batch_name=batch.name,
            coach_name=coach.full_name,
        )
        for a in anns
    ]


# ==================== PAYMENT STATUS ====================

@router.get("/{batch_id}/payment-status")
def get_payment_status(batch_id: int, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = _get_accessible_batch(db, batch_id, coach)

    now = datetime.utcnow()
    current_month = now.strftime("%Y-%m")
    is_past_deadline = _is_past_tenth_of_billing_month(current_month, now)

    sbs = db.query(StudentBatch).filter(
        StudentBatch.batch_id == batch_id, StudentBatch.is_active == True
    ).all()

    result = []
    for sb in sbs:
        student = db.query(User).filter(User.id == sb.student_id).first()
        payment = db.query(Payment).filter(
            Payment.student_id == sb.student_id,
            Payment.batch_id == batch_id,
            Payment.billing_month == current_month,
            Payment.status == "completed",
        ).first()

        payment_status = "paid" if payment else ("overdue" if is_past_deadline else "pending")

        # Update the StudentBatch payment_status
        if sb.payment_status != payment_status:
            sb.payment_status = payment_status
            db.commit()

        result.append({
            "student_id": sb.student_id,
            "student_name": student.full_name if student else "Unknown",
            "student_username": student.username if student else "unknown",
            "payment_status": payment_status,
            "billing_month": current_month,
            "is_overdue": payment_status == "overdue",
        })

    return {
        "batch_id": batch_id,
        "batch_name": batch.name,
        "billing_month": current_month,
        "is_past_deadline": is_past_deadline,
        "students": result,
        "total_students": len(result),
        "paid_count": sum(1 for r in result if r["payment_status"] == "paid"),
        "overdue_count": sum(1 for r in result if r["payment_status"] == "overdue"),
    }


# ==================== ADMIN PAYMENTS ====================

admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


class AdminBatchResponse(BatchResponse):
    coach_username: Optional[str] = None
    coach_full_name: Optional[str] = None


@admin_router.get("/batches", response_model=List[AdminBatchResponse])
def list_admin_batches(
    coach_id: Optional[int] = None,
    include_inactive: bool = True,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """All academy classes with coach attribution (admin only)."""
    q = db.query(Batch)
    if coach_id is not None:
        q = q.filter(Batch.coach_id == coach_id)
    if not include_inactive:
        q = q.filter(Batch.is_active == True)
    batches = q.order_by(Batch.is_active.desc(), Batch.name.asc()).all()
    if not batches:
        return []

    coach_ids = {int(b.coach_id) for b in batches if b.coach_id is not None}
    coaches_by_id = {}
    if coach_ids:
        coaches_by_id = {
            u.id: u
            for u in db.query(User).filter(User.id.in_(coach_ids)).all()
        }

    result: List[AdminBatchResponse] = []
    for batch in batches:
        count = (
            db.query(StudentBatch)
            .filter(StudentBatch.batch_id == batch.id, StudentBatch.is_active == True)
            .count()
        )
        base = batch_to_response(batch, count, admin)
        coach = coaches_by_id.get(batch.coach_id)
        result.append(
            AdminBatchResponse(
                **base.model_dump(),
                coach_username=coach.username if coach else None,
                coach_full_name=(coach.full_name or coach.username) if coach else None,
            )
        )
    return result


class MarkPaidRequest(BaseModel):
    student_id: int
    batch_id: int
    billing_month: str  # "YYYY-MM"
    amount: Optional[float] = None
    notes: Optional[str] = None  # e.g. "Paid via UPI"


class BillingAdjustmentRequest(BaseModel):
    student_id: int
    batch_id: int
    billing_month: str  # "YYYY-MM"
    expected_class_count: Optional[int] = None
    billable_class_count: Optional[int] = None
    amount_override: Optional[float] = None
    clear_amount_override: bool = False
    notes: Optional[str] = None


class FeesAdjustmentRequest(BaseModel):
    student_id: int
    batch_id: int
    billing_month: str  # "YYYY-MM"
    expected_class_count: Optional[int] = None
    fee_override: Optional[float] = None
    clear_fee_override: bool = False


class CoachInviteCreateRequest(BaseModel):
    full_name: str
    email: str
    expires_in_days: int = 7


@admin_router.get("/payments")
def get_all_payments(
    batch_id: Optional[int] = None,
    billing_month: Optional[str] = None,
    status: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    month = billing_month or now.strftime("%Y-%m")
    try:
        _parse_billing_month(month)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid billing_month; use YYYY-MM")

    batches = db.query(Batch).all()
    batch_by_id = {b.id: b for b in batches}
    selected_batch_ids = [b.id for b in batches]
    filter_batch_id = batch_id
    if filter_batch_id is not None:
        if filter_batch_id not in batch_by_id:
            return _empty_payments_payload(month)
        selected_batch_ids = [filter_batch_id]

    if not selected_batch_ids and not db.query(User).filter(User.role == UserRole.student).first():
        return _empty_payments_payload(month)

    month_start, month_end = _billing_month_range(month)

    students = (
        db.query(User)
        .filter(User.role == UserRole.student)
        .order_by(User.full_name.asc(), User.username.asc())
        .all()
    )
    student_by_id = {s.id: s for s in students}
    if not students:
        return _empty_payments_payload(month)

    enrollments = (
        db.query(StudentBatch)
        .filter(StudentBatch.student_id.in_([s.id for s in students]))
        .order_by(StudentBatch.joined_at.desc(), StudentBatch.id.desc())
        .all()
    )
    enrollments_by_student: dict[int, list[StudentBatch]] = {}
    for sb in enrollments:
        enrollments_by_student.setdefault(int(sb.student_id), []).append(sb)

    coaches = {
        u.id: u
        for u in db.query(User)
        .filter(User.role.in_([UserRole.coach, UserRole.admin, "coach", "admin"]))
        .all()
    }

    fallback_batch_by_coach: dict[int, Batch] = {}
    for batch in sorted(
        batches,
        key=lambda b: (
            0 if getattr(b, "is_active", False) else 1,
            b.created_at or datetime.min,
            b.id,
        ),
        reverse=True,
    ):
        coach_id = getattr(batch, "coach_id", None)
        if coach_id is not None and int(coach_id) not in fallback_batch_by_coach:
            fallback_batch_by_coach[int(coach_id)] = batch

    payments = (
        db.query(Payment)
        .filter(Payment.student_id.in_([s.id for s in students]))
        .order_by(Payment.billing_month.desc(), Payment.created_at.desc())
        .all()
    )
    completed_by_key: dict[tuple[int, int, str], Payment] = {}
    history_by_pair: dict[tuple[int, int], list[dict]] = {}
    for payment in payments:
        pair = (int(payment.student_id), int(payment.batch_id))
        history_by_pair.setdefault(pair, []).append({
            "id": payment.id,
            "billing_month": payment.billing_month,
            "amount": float(payment.amount or 0),
            "currency": payment.currency or "inr",
            "status": payment.status,
            "paid_at": payment.paid_at,
            "created_at": payment.created_at,
            "recorded_by": (
                "parent_stripe"
                if payment.stripe_checkout_session_id
                else "admin_manual"
            ),
        })
        if payment.status == "completed":
            key = (int(payment.student_id), int(payment.batch_id), str(payment.billing_month))
            if key not in completed_by_key:
                completed_by_key[key] = payment

    adjustments = (
        db.query(PaymentBillingAdjustment)
        .filter(PaymentBillingAdjustment.billing_month == month)
        .all()
    )
    adjustment_by_key = {
        (int(a.student_id), int(a.batch_id), str(a.billing_month)): a
        for a in adjustments
    }

    month_sessions = (
        db.query(ClassSession)
        .filter(
            ClassSession.date >= month_start,
            ClassSession.date < month_end,
        )
        .all()
    )
    sessions_by_batch: dict[int, list[ClassSession]] = {}
    session_ids = [s.id for s in month_sessions]
    for session in month_sessions:
        sessions_by_batch.setdefault(int(session.batch_id), []).append(session)

    expected_rows = []
    if session_ids:
        expected_rows = (
            db.query(SessionStudent)
            .filter(
                SessionStudent.class_session_id.in_(session_ids),
                SessionStudent.expected_to_join == True,
            )
            .all()
        )
    expected_by_pair: dict[tuple[int, int], set[int]] = {}
    for row in expected_rows:
        session = next((s for s in month_sessions if s.id == row.class_session_id), None)
        if not session:
            continue
        key = (int(row.student_id), int(session.batch_id))
        expected_by_pair.setdefault(key, set()).add(int(row.class_session_id))

    # Legacy sessions without roster: treat active enrollments as expected for all batch sessions.
    for batch_id_key, sessions in sessions_by_batch.items():
        roster_exists = any(
            s.id in {r.class_session_id for r in expected_rows}
            for s in sessions
        )
        if roster_exists:
            continue
        for sb in enrollments:
            if int(sb.batch_id) != int(batch_id_key) or not sb.is_active:
                continue
            key = (int(sb.student_id), int(batch_id_key))
            expected_by_pair.setdefault(key, set()).update(int(s.id) for s in sessions)

    attended_by_pair: dict[tuple[int, int], int] = {}
    if session_ids:
        present_rows = (
            db.query(Attendance.class_session_id, Attendance.student_id)
            .filter(
                Attendance.class_session_id.in_(session_ids),
                Attendance.status == "present",
            )
            .all()
        )
        session_batch = {s.id: int(s.batch_id) for s in month_sessions}
        for class_session_id, student_id in present_rows:
            b_id = session_batch.get(int(class_session_id))
            if b_id is None:
                continue
            key = (int(student_id), b_id)
            # Only count attendance against expected sessions when we know them.
            expected_set = expected_by_pair.get(key)
            if expected_set is not None and int(class_session_id) not in expected_set:
                continue
            attended_by_pair[key] = attended_by_pair.get(key, 0) + 1

    payments_out = []

    for student in students:
        student_id = int(student.id)
        student_enrollments = enrollments_by_student.get(student_id, [])

        candidate_batch_ids: list[int] = []
        seen_batches: set[int] = set()

        def _add_batch(bid: Optional[int]) -> None:
            if bid is None:
                return
            bid_i = int(bid)
            if bid_i in seen_batches:
                return
            if filter_batch_id is not None and bid_i != int(filter_batch_id):
                return
            if bid_i not in batch_by_id:
                return
            seen_batches.add(bid_i)
            candidate_batch_ids.append(bid_i)

        for sb in student_enrollments:
            _add_batch(sb.batch_id)

        for payment in payments:
            if int(payment.student_id) == student_id:
                _add_batch(payment.batch_id)

        for adj in adjustments:
            if int(adj.student_id) == student_id:
                _add_batch(adj.batch_id)

        if not candidate_batch_ids:
            coach_id = getattr(student, "primary_coach_id", None)
            if coach_id is not None:
                if filter_batch_id is not None:
                    selected = batch_by_id.get(int(filter_batch_id))
                    if selected and int(selected.coach_id) == int(coach_id):
                        _add_batch(selected.id)
                else:
                    fallback = fallback_batch_by_coach.get(int(coach_id))
                    if fallback:
                        _add_batch(fallback.id)

        # Always include students even with no batch (unassigned row).
        if not candidate_batch_ids:
            if filter_batch_id is not None:
                continue
            candidate_batch_ids = [None]  # type: ignore[list-item]

        for resolved_batch_id in candidate_batch_ids:
            sb = None
            batch = None
            monthly_fee = 0.0
            batch_name = "Unassigned"
            coach_id = getattr(student, "primary_coach_id", None)
            coach_name = None
            is_enrollment_active = False
            joined_at = student.created_at or now

            if resolved_batch_id is not None:
                sb = next(
                    (e for e in student_enrollments if int(e.batch_id) == int(resolved_batch_id)),
                    None,
                )
                batch = batch_by_id.get(int(resolved_batch_id))
                if not batch:
                    continue
                monthly_fee = float(batch.monthly_fee or 0)
                batch_name = batch.name
                coach_id = batch.coach_id
                is_enrollment_active = bool(sb.is_active) if sb else False
                if sb and sb.joined_at:
                    joined_at = sb.joined_at

            if coach_id is not None and int(coach_id) in coaches:
                coach = coaches[int(coach_id)]
                coach_name = coach.full_name or coach.username

            pair_key = (
                student_id,
                int(resolved_batch_id) if resolved_batch_id is not None else -1,
            )
            expected_session_ids = expected_by_pair.get(
                (student_id, int(resolved_batch_id)) if resolved_batch_id is not None else (-1, -1),
                set(),
            )
            scheduled_classes = len(expected_session_ids)
            if resolved_batch_id is not None and scheduled_classes == 0:
                # Fall back to number of regular sessions created for the batch that month.
                batch_sessions = sessions_by_batch.get(int(resolved_batch_id), [])
                scheduled_classes = len(
                    [s for s in batch_sessions if (s.session_kind or "regular") == "regular"]
                )
            attended_classes = attended_by_pair.get(
                (student_id, int(resolved_batch_id)) if resolved_batch_id is not None else (-1, -1),
                0,
            )

            adj = None
            if resolved_batch_id is not None:
                adj = adjustment_by_key.get((student_id, int(resolved_batch_id), month))

            expected_classes = _resolve_payment_expected_classes(adj)

            if adj and adj.billable_class_count is not None:
                billable_class_count = int(adj.billable_class_count)
                billable_source = "admin_override"
            else:
                billable_class_count = scheduled_classes
                billable_source = "auto"

            planned_classes = expected_classes
            fee_per_class = round(monthly_fee / max(planned_classes, 1), 2) if monthly_fee else 0.0
            calculated_amount = _fee_for_classes(monthly_fee, billable_class_count, planned_classes)
            amount_override = float(adj.amount_override) if adj and adj.amount_override is not None else None
            final_amount = amount_override if amount_override is not None else calculated_amount

            completed = None
            if resolved_batch_id is not None:
                completed = completed_by_key.get((student_id, int(resolved_batch_id), month))

            if completed:
                row_status = "paid"
                paid_at = completed.paid_at
                payment_id = completed.id
                payment_amount = float(completed.amount or 0)
            else:
                payment_id = None
                paid_at = None
                payment_amount = None
                # Unassigned / zero fee stay as informative pending rows.
                if _is_past_tenth_of_billing_month(month, now) and monthly_fee > 0:
                    row_status = "overdue"
                else:
                    row_status = "pending"

            pending_months: list[str] = []
            overdue_months = 0
            if resolved_batch_id is not None:
                due_months = _billing_months_between(joined_at.strftime("%Y-%m"), month)
                for due_month in due_months:
                    due_completed = completed_by_key.get((student_id, int(resolved_batch_id), due_month))
                    computed_status, _, _ = compute_billing_status(
                        has_completed_payment=bool(due_completed),
                        billing_month=due_month,
                        joined_at=joined_at,
                        now=now,
                    )
                    if computed_status != "paid":
                        pending_months.append(due_month)
                        if computed_status == "overdue":
                            overdue_months += 1

            pending_months_count = len(pending_months)
            # Approximate arrears using current final_amount for unpaid months.
            pending_amount_total = round(final_amount * pending_months_count, 2) if pending_months_count else 0.0
            current_due_amount = 0.0 if row_status == "paid" else final_amount

            history = history_by_pair.get(
                (student_id, int(resolved_batch_id)) if resolved_batch_id is not None else (-1, -1),
                [],
            )

            payments_out.append({
                "student_id": student_id,
                "student_name": student.full_name or "Unknown",
                "student_username": student.username or "unknown",
                "batch_id": resolved_batch_id,
                "batch_name": batch_name,
                "coach_id": int(coach_id) if coach_id is not None else None,
                "coach_name": coach_name,
                "is_enrollment_active": is_enrollment_active,
                "joined_at": joined_at,
                "monthly_fee": monthly_fee,
                "fee_per_class": fee_per_class,
                "expected_classes": expected_classes,
                "attended_classes": attended_classes,
                "billable_class_count": billable_class_count,
                "billable_class_count_source": billable_source,
                "calculated_amount": calculated_amount,
                "amount_override": amount_override,
                "final_amount": final_amount,
                "billing_month": month,
                "status": row_status,
                "paid_at": paid_at,
                "payment_id": payment_id,
                "payment_amount": payment_amount,
                "current_due_amount": current_due_amount,
                "pending_amount_total": pending_amount_total,
                "pending_months_count": pending_months_count,
                "overdue_months_count": overdue_months,
                "oldest_pending_month": pending_months[0] if pending_months else None,
                "pending_months": pending_months,
                "payment_history": history,
                "notes": adj.notes if adj else None,
            })

    if status:
        norm = status.lower()
        if norm in ("completed", "paid"):
            norm = "paid"
        payments_out = [p for p in payments_out if p["status"] == norm]

    paid_count = sum(1 for p in payments_out if p["status"] == "paid")
    pending_count = sum(1 for p in payments_out if p["status"] == "pending")
    overdue_count = sum(1 for p in payments_out if p["status"] == "overdue")
    total_collected = sum(
        float(p["payment_amount"] or p["final_amount"] or 0)
        for p in payments_out
        if p["status"] == "paid"
    )
    total_pending_amount = sum(float(p["pending_amount_total"] or 0) for p in payments_out)
    students_with_pending_balance = sum(1 for p in payments_out if p["pending_months_count"] > 0)

    return {
        "summary": {
            "total_students": len(payments_out),
            "paid_count": paid_count,
            "pending_count": pending_count,
            "overdue_count": overdue_count,
            "total_collected": total_collected,
            "total_pending_amount": total_pending_amount,
            "students_with_pending_balance": students_with_pending_balance,
            "billing_month": month,
        },
        "payments": payments_out,
    }


@admin_router.get("/fees")
def get_all_fees(
    billing_month: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    month = billing_month or now.strftime("%Y-%m")
    try:
        _parse_billing_month(month)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid billing_month; use YYYY-MM")

    students = (
        db.query(User)
        .filter(User.role == UserRole.student)
        .order_by(User.full_name.asc(), User.username.asc())
        .all()
    )
    if not students:
        return {"billing_month": month, "fees": []}

    batches = db.query(Batch).all()
    batch_by_id = {b.id: b for b in batches}
    fallback_batch_by_coach: dict[int, Batch] = {}
    for batch in sorted(
        batches,
        key=lambda b: (
            0 if getattr(b, "is_active", False) else 1,
            b.created_at or datetime.min,
            b.id,
        ),
        reverse=True,
    ):
        coach_id = getattr(batch, "coach_id", None)
        if coach_id is not None and int(coach_id) not in fallback_batch_by_coach:
            fallback_batch_by_coach[int(coach_id)] = batch

    enrollments = (
        db.query(StudentBatch)
        .filter(StudentBatch.student_id.in_([s.id for s in students]))
        .order_by(StudentBatch.joined_at.desc(), StudentBatch.id.desc())
        .all()
    )
    enrollments_by_student: dict[int, list[StudentBatch]] = {}
    for sb in enrollments:
        enrollments_by_student.setdefault(int(sb.student_id), []).append(sb)

    adjustments = (
        db.query(PaymentBillingAdjustment)
        .filter(PaymentBillingAdjustment.billing_month == month)
        .all()
    )
    adjustment_by_key = {
        (int(a.student_id), int(a.batch_id), str(a.billing_month)): a
        for a in adjustments
    }

    month_start, month_end = _billing_month_range(month)
    month_sessions = (
        db.query(ClassSession)
        .filter(
            ClassSession.date >= month_start,
            ClassSession.date < month_end,
        )
        .all()
    )
    session_ids = [s.id for s in month_sessions]
    session_batch = {s.id: int(s.batch_id) for s in month_sessions}

    attended_by_pair: dict[tuple[int, int], int] = {}
    if session_ids:
        present_rows = (
            db.query(Attendance.class_session_id, Attendance.student_id)
            .filter(
                Attendance.class_session_id.in_(session_ids),
                Attendance.status == "present",
            )
            .all()
        )
        for class_session_id, student_id in present_rows:
            b_id = session_batch.get(int(class_session_id))
            if b_id is None:
                continue
            key = (int(student_id), b_id)
            attended_by_pair[key] = attended_by_pair.get(key, 0) + 1

    fees_out = []
    for student in students:
        student_id = int(student.id)
        student_enrollments = enrollments_by_student.get(student_id, [])
        coach_id = getattr(student, "primary_coach_id", None)
        resolved_batch_id = _resolve_student_primary_batch(
            student_id,
            student_enrollments,
            batch_by_id,
            fallback_batch_by_coach,
            coach_id,
        )

        batch_name = "Unassigned"
        if resolved_batch_id is not None:
            batch = batch_by_id.get(resolved_batch_id)
            batch_name = batch.name if batch else "Unknown batch"

        adj = None
        if resolved_batch_id is not None:
            adj = adjustment_by_key.get((student_id, resolved_batch_id, month))

        if adj and adj.expected_class_count is not None:
            expected_classes = int(adj.expected_class_count)
            expected_source = "admin_override"
        else:
            expected_classes = DEFAULT_EXPECTED_CLASSES_PER_MONTH
            expected_source = "default"

        attended_classes = (
            attended_by_pair.get((student_id, resolved_batch_id), 0)
            if resolved_batch_id is not None
            else 0
        )

        calculated_fee = _fee_for_expected_class_count(expected_classes)
        fee_override = float(adj.amount_override) if adj and adj.amount_override is not None else None
        final_fee = fee_override if fee_override is not None else calculated_fee

        fees_out.append({
            "student_id": student_id,
            "student_name": student.full_name or "Unknown",
            "student_username": student.username or "unknown",
            "batch_id": resolved_batch_id,
            "batch_name": batch_name,
            "expected_classes": expected_classes,
            "expected_classes_source": expected_source,
            "attended_classes": attended_classes,
            "calculated_fee": calculated_fee,
            "fee_override": fee_override,
            "final_fee": final_fee,
            "billing_month": month,
        })

    return {"billing_month": month, "fees": fees_out}


@admin_router.patch("/fees/adjustment")
def upsert_fees_adjustment(
    data: FeesAdjustmentRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        _parse_billing_month(data.billing_month)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid billing_month; use YYYY-MM")

    student = db.query(User).filter(User.id == data.student_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    batch = db.query(Batch).filter(Batch.id == data.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if data.expected_class_count is not None and data.expected_class_count < 0:
        raise HTTPException(status_code=400, detail="expected_class_count must be >= 0")
    if data.fee_override is not None and data.fee_override < 0:
        raise HTTPException(status_code=400, detail="fee_override must be >= 0")

    adj = (
        db.query(PaymentBillingAdjustment)
        .filter(
            PaymentBillingAdjustment.student_id == data.student_id,
            PaymentBillingAdjustment.batch_id == data.batch_id,
            PaymentBillingAdjustment.billing_month == data.billing_month,
        )
        .first()
    )
    if not adj:
        adj = PaymentBillingAdjustment(
            student_id=data.student_id,
            batch_id=data.batch_id,
            billing_month=data.billing_month,
            updated_by=admin.id,
        )
        db.add(adj)

    if data.expected_class_count is not None:
        adj.expected_class_count = data.expected_class_count
    if data.clear_fee_override:
        adj.amount_override = None
    elif data.fee_override is not None:
        adj.amount_override = data.fee_override
    adj.updated_by = admin.id
    adj.updated_at = datetime.utcnow()

    log_admin_action(
        db,
        admin_id=admin.id,
        action="fees_adjustment",
        target_type="payment_billing_adjustment",
        target_id=adj.id,
        details={
            "student_id": data.student_id,
            "batch_id": data.batch_id,
            "billing_month": data.billing_month,
            "expected_class_count": adj.expected_class_count,
            "fee_override": float(adj.amount_override) if adj.amount_override is not None else None,
        },
    )
    db.commit()
    db.refresh(adj)

    expected = (
        int(adj.expected_class_count)
        if adj.expected_class_count is not None
        else DEFAULT_EXPECTED_CLASSES_PER_MONTH
    )
    calculated_fee = _fee_for_expected_class_count(expected)
    fee_override = float(adj.amount_override) if adj.amount_override is not None else None
    return {
        "student_id": adj.student_id,
        "batch_id": adj.batch_id,
        "billing_month": adj.billing_month,
        "expected_classes": expected,
        "expected_classes_source": (
            "admin_override" if adj.expected_class_count is not None else "default"
        ),
        "calculated_fee": calculated_fee,
        "fee_override": fee_override,
        "final_fee": fee_override if fee_override is not None else calculated_fee,
    }


@admin_router.patch("/payments/billing-adjustment")
def upsert_billing_adjustment(
    data: BillingAdjustmentRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        _parse_billing_month(data.billing_month)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid billing_month; use YYYY-MM")

    student = db.query(User).filter(User.id == data.student_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    batch = db.query(Batch).filter(Batch.id == data.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if data.billable_class_count is not None and data.billable_class_count < 0:
        raise HTTPException(status_code=400, detail="billable_class_count must be >= 0")
    if data.expected_class_count is not None and data.expected_class_count < 0:
        raise HTTPException(status_code=400, detail="expected_class_count must be >= 0")
    if data.amount_override is not None and data.amount_override < 0:
        raise HTTPException(status_code=400, detail="amount_override must be >= 0")

    adj = (
        db.query(PaymentBillingAdjustment)
        .filter(
            PaymentBillingAdjustment.student_id == data.student_id,
            PaymentBillingAdjustment.batch_id == data.batch_id,
            PaymentBillingAdjustment.billing_month == data.billing_month,
        )
        .first()
    )
    if not adj:
        adj = PaymentBillingAdjustment(
            student_id=data.student_id,
            batch_id=data.batch_id,
            billing_month=data.billing_month,
            updated_by=admin.id,
        )
        db.add(adj)

    if data.billable_class_count is not None:
        adj.billable_class_count = data.billable_class_count
    if data.expected_class_count is not None:
        adj.expected_class_count = data.expected_class_count
    if data.clear_amount_override:
        adj.amount_override = None
    elif data.amount_override is not None:
        adj.amount_override = data.amount_override
    if data.notes is not None:
        adj.notes = data.notes
    adj.updated_by = admin.id
    adj.updated_at = datetime.utcnow()

    log_admin_action(
        db,
        admin_id=admin.id,
        action="payment_billing_adjustment",
        target_type="payment_billing_adjustment",
        target_id=adj.id,
        details={
            "student_id": data.student_id,
            "batch_id": data.batch_id,
            "billing_month": data.billing_month,
            "billable_class_count": adj.billable_class_count,
            "amount_override": float(adj.amount_override) if adj.amount_override is not None else None,
            "notes": adj.notes,
        },
    )
    db.commit()
    db.refresh(adj)

    monthly_fee = float(batch.monthly_fee or 0)
    month_start, month_end = _billing_month_range(data.billing_month)
    planned = _resolve_payment_expected_classes(adj)
    scheduled = _count_regular_batch_sessions(db, data.batch_id, month_start, month_end)
    billable = (
        int(adj.billable_class_count)
        if adj.billable_class_count is not None
        else scheduled
    )
    calculated = _fee_for_classes(monthly_fee, billable, planned)
    amount_override = float(adj.amount_override) if adj.amount_override is not None else None
    return {
        "student_id": adj.student_id,
        "batch_id": adj.batch_id,
        "billing_month": adj.billing_month,
        "billable_class_count": adj.billable_class_count,
        "amount_override": amount_override,
        "calculated_amount": calculated,
        "final_amount": amount_override if amount_override is not None else calculated,
        "notes": adj.notes,
    }


@admin_router.post("/payments/mark-paid", response_model=PaymentResponse)
def mark_payment_paid(
    data: MarkPaidRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        _parse_billing_month(data.billing_month)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid billing_month; use YYYY-MM")

    batch = db.query(Batch).filter(Batch.id == data.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    student = db.query(User).filter(User.id == data.student_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    sb = db.query(StudentBatch).filter(
        StudentBatch.student_id == data.student_id,
        StudentBatch.batch_id == data.batch_id,
        StudentBatch.is_active == True,
    ).first()
    # Allow marking paid even without active enrollment (historical arrears),
    # but prefer creating/updating enrollment payment_status when present.

    existing = db.query(Payment).filter(
        Payment.student_id == data.student_id,
        Payment.batch_id == data.batch_id,
        Payment.billing_month == data.billing_month,
        Payment.status == "completed",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already marked as paid")

    adj = (
        db.query(PaymentBillingAdjustment)
        .filter(
            PaymentBillingAdjustment.student_id == data.student_id,
            PaymentBillingAdjustment.batch_id == data.batch_id,
            PaymentBillingAdjustment.billing_month == data.billing_month,
        )
        .first()
    )
    month_start, month_end = _billing_month_range(data.billing_month)
    planned = _resolve_payment_expected_classes(adj)
    scheduled = _count_regular_batch_sessions(db, data.batch_id, month_start, month_end)
    monthly_fee = float(batch.monthly_fee or 0)
    if data.amount is not None:
        amount = float(data.amount)
    elif adj and adj.amount_override is not None:
        amount = float(adj.amount_override)
    else:
        billable = (
            int(adj.billable_class_count)
            if adj and adj.billable_class_count is not None
            else scheduled
        )
        amount = _fee_for_classes(monthly_fee, billable, planned)

    payment = Payment(
        parent_id=admin.id,
        student_id=data.student_id,
        batch_id=data.batch_id,
        amount=amount,
        currency="inr",
        billing_month=data.billing_month,
        status="completed",
        paid_at=datetime.utcnow(),
    )
    db.add(payment)
    log_admin_action(
        db,
        admin_id=admin.id,
        action="payment_mark_paid",
        target_type="payment",
        target_id=None,
        details={
            "student_id": data.student_id,
            "batch_id": data.batch_id,
            "billing_month": data.billing_month,
            "notes": data.notes,
            "amount": amount,
        },
    )
    if sb:
        sb.payment_status = "paid"
    db.commit()
    db.refresh(payment)

    return PaymentResponse(
        id=payment.id,
        parent_id=payment.parent_id,
        student_id=payment.student_id,
        batch_id=payment.batch_id,
        amount=payment.amount,
        currency=payment.currency,
        billing_month=payment.billing_month,
        status=payment.status,
        paid_at=payment.paid_at,
        created_at=payment.created_at,
        student_name=student.full_name if student else None,
        batch_name=batch.name,
    )


@admin_router.delete("/payments/{payment_id}/unmark")
def unmark_payment_paid(
    payment_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    batch = db.query(Batch).filter(Batch.id == payment.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.status != "completed":
        raise HTTPException(status_code=400, detail="Payment is not marked as completed")

    payment.status = "pending"
    payment.paid_at = None
    log_admin_action(
        db,
        admin_id=admin.id,
        action="payment_unmark_paid",
        target_type="payment",
        target_id=payment.id,
        details={
            "student_id": payment.student_id,
            "batch_id": payment.batch_id,
            "billing_month": payment.billing_month,
        },
    )

    sb = db.query(StudentBatch).filter(
        StudentBatch.student_id == payment.student_id,
        StudentBatch.batch_id == payment.batch_id,
        StudentBatch.is_active == True,
    ).first()
    if sb:
        sb.payment_status = "pending"

    db.commit()
    db.refresh(payment)

    student = db.query(User).filter(User.id == payment.student_id).first()
    return PaymentResponse(
        id=payment.id,
        parent_id=payment.parent_id,
        student_id=payment.student_id,
        batch_id=payment.batch_id,
        amount=payment.amount,
        currency=payment.currency,
        billing_month=payment.billing_month,
        status=payment.status,
        paid_at=payment.paid_at,
        created_at=payment.created_at,
        student_name=student.full_name if student else None,
        batch_name=batch.name,
    )


@admin_router.post("/coach-invites")
def create_coach_invite(
    data: CoachInviteCreateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if data.expires_in_days < 1 or data.expires_in_days > 60:
        raise HTTPException(status_code=400, detail="expires_in_days must be between 1 and 60")
    full_name = data.full_name.strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")
    email = data.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)
    invite = CoachSignupInvite(
        token=token,
        full_name=full_name,
        email=email,
        created_by=admin.id,
        expires_at=expires_at,
    )
    db.add(invite)
    log_admin_action(
        db,
        admin_id=admin.id,
        action="coach_invite_create",
        target_type="coach_invite",
        target_id=None,
        details={"full_name": full_name, "email": email, "expires_in_days": data.expires_in_days},
    )
    db.commit()
    db.refresh(invite)

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    invite_url = f"{frontend_url}/coach-signup/{invite.token}"

    email_sent = False
    email_error: Optional[str] = None
    try:
        send_coach_invite_email(
            to_email=email,
            full_name=full_name,
            invite_url=invite_url,
            expires_in_days=data.expires_in_days,
        )
        email_sent = True
    except Exception as exc:
        email_error = str(exc).strip() or "Email could not be sent"
        logging.getLogger(__name__).exception(
            "Failed to send coach invite email to %s: %s", email, email_error
        )

    return {
        "id": invite.id,
        "token": invite.token,
        "invite_url": invite_url,
        "full_name": invite.full_name,
        "email": invite.email,
        "expires_at": invite.expires_at,
        "used_at": invite.used_at,
        "is_active": invite.is_active,
        "created_at": invite.created_at,
        "email_sent": email_sent,
        "email_error": email_error,
    }


@admin_router.get("/coach-invites")
def list_coach_invites(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    invites = db.query(CoachSignupInvite).filter(
        CoachSignupInvite.created_by == admin.id
    ).order_by(CoachSignupInvite.created_at.desc()).all()
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    
    def _status(invite: CoachSignupInvite) -> str:
        if invite.used_at:
            return "used"
        if not invite.is_active:
            return "revoked"
        if invite.expires_at < now:
            return "expired"
        return "active"

    return [
        {
            "id": i.id,
            "token": i.token,
            "invite_url": f"{frontend_url}/coach-signup/{i.token}",
            "full_name": i.full_name,
            "email": i.email,
            "expires_at": i.expires_at,
            "used_at": i.used_at,
            "is_active": i.is_active,
            "status": _status(i),
            "is_expired": i.expires_at < now,
            "expires_in_hours": max(0.0, (i.expires_at - now).total_seconds() / 3600.0),
            "created_at": i.created_at,
            "used_by": i.used_by,
        }
        for i in invites
    ]


@admin_router.post("/coach-invites/{invite_id}/revoke")
def revoke_coach_invite(
    invite_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    invite = db.query(CoachSignupInvite).filter(
        CoachSignupInvite.id == invite_id,
        CoachSignupInvite.created_by == admin.id,
    ).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.used_at:
        raise HTTPException(status_code=400, detail="Invite already used")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invite already expired")
    invite.is_active = False
    log_admin_action(
        db,
        admin_id=admin.id,
        action="coach_invite_revoke",
        target_type="coach_invite",
        target_id=invite.id,
        details={"email": invite.email},
    )
    db.commit()
    return {"detail": "Invite revoked"}


@admin_router.post("/coach-invites/revoke-expired")
def revoke_expired_coach_invites(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    invites = db.query(CoachSignupInvite).filter(
        CoachSignupInvite.created_by == admin.id,
        CoachSignupInvite.is_active == True,
        CoachSignupInvite.used_at.is_(None),
        CoachSignupInvite.expires_at < now,
    ).all()
    if not invites:
        return {"revoked_count": 0}

    for invite in invites:
        invite.is_active = False
        log_admin_action(
            db,
            admin_id=admin.id,
            action="coach_invite_revoke",
            target_type="coach_invite",
            target_id=invite.id,
            details={"email": invite.email, "reason": "bulk_expired_cleanup"},
        )
    db.commit()
    return {"revoked_count": len(invites)}


@admin_router.get("/audit-logs")
def list_admin_audit_logs(
    action: Optional[str] = None,
    limit: int = 50,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows_q = db.query(AdminAuditLog).order_by(AdminAuditLog.created_at.desc())
    if action:
        rows_q = rows_q.filter(AdminAuditLog.action == action)
    rows = rows_q.limit(max(1, min(limit, 200))).all()
    admin_ids = list({r.admin_id for r in rows})
    admin_map = {}
    if admin_ids:
        admin_users = db.query(User).filter(User.id.in_(admin_ids)).all()
        admin_map = {u.id: (u.full_name or u.username) for u in admin_users}
    return [
        {
            "id": r.id,
            "admin_id": r.admin_id,
            "admin_name": admin_map.get(r.admin_id),
            "action": r.action,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "details": json.loads(r.details_json) if r.details_json else {},
            "created_at": r.created_at,
        }
        for r in rows
    ]


@admin_router.get("/operational-metrics")
def get_admin_operational_metrics(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    next_48h = now + timedelta(hours=48)
    last_24h = now - timedelta(hours=24)

    active_coaches = db.query(User).filter(
        User.role.in_([UserRole.coach, UserRole.admin]),
        User.is_active == True,
    ).count()
    unassigned_students = db.query(User).filter(
        User.role == UserRole.student,
        User.is_active == True,
        User.primary_coach_id.is_(None),
    ).count()

    invites = db.query(CoachSignupInvite).filter(
        CoachSignupInvite.created_by == admin.id
    ).all()
    invite_counts = {
        "active": 0,
        "used": 0,
        "revoked": 0,
        "expired": 0,
        "expiring_soon": 0,
    }
    for invite in invites:
        if invite.used_at:
            invite_counts["used"] += 1
            continue
        if not invite.is_active:
            invite_counts["revoked"] += 1
            continue
        if invite.expires_at < now:
            invite_counts["expired"] += 1
            continue
        invite_counts["active"] += 1
        if invite.expires_at <= next_48h:
            invite_counts["expiring_soon"] += 1

    critical_actions = [
        "coach_deactivate",
        "student_deactivate",
        "student_assign_coach",
        "coach_invite_create",
        "coach_invite_revoke",
        "payment_mark_paid",
        "payment_unmark_paid",
    ]
    recent_q = db.query(AdminAuditLog).filter(
        AdminAuditLog.created_at >= last_24h,
        AdminAuditLog.action.in_(critical_actions),
    )
    recent_count = recent_q.count()
    recent_rows = recent_q.order_by(AdminAuditLog.created_at.desc()).limit(8).all()

    return {
        "active_coaches": active_coaches,
        "unassigned_students": unassigned_students,
        "invite_counts": invite_counts,
        "recent_critical_actions_24h": recent_count,
        "recent_critical_actions": [
            {
                "id": row.id,
                "action": row.action,
                "target_type": row.target_type,
                "target_id": row.target_id,
                "created_at": row.created_at,
            }
            for row in recent_rows
        ],
    }
