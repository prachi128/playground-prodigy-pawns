# batch_endpoints.py - Coach Batch Management API Endpoints

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
import os
import secrets
import json

from models import Batch, StudentBatch, ClassSession, Announcement, Payment, User, UserRole, CoachSignupInvite, AdminAuditLog
from auth import get_current_user
from database import get_db
from audit_service import log_admin_action
from schemas import (
    BatchCreate, BatchUpdate, BatchResponse,
    ClassSessionCreate, ClassSessionResponse,
    AnnouncementCreate, AnnouncementResponse,
    StudentBatchAdd, StudentBatchResponse,
    PaymentResponse,
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


# ==================== BATCH CRUD ====================

@router.post("", response_model=BatchResponse)
def create_batch(data: BatchCreate, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = Batch(
        name=data.name,
        description=data.description,
        schedule=data.schedule,
        coach_id=coach.id,
        monthly_fee=data.monthly_fee,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return BatchResponse(
        id=batch.id, name=batch.name, description=batch.description,
        schedule=batch.schedule, coach_id=batch.coach_id,
        monthly_fee=batch.monthly_fee, is_active=batch.is_active,
        created_at=batch.created_at, student_count=0,
    )


@router.get("", response_model=List[BatchResponse])
def list_batches(coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batches = db.query(Batch).filter(Batch.coach_id == coach.id).all()
    result = []
    for b in batches:
        count = db.query(StudentBatch).filter(
            StudentBatch.batch_id == b.id, StudentBatch.is_active == True
        ).count()
        result.append(BatchResponse(
            id=b.id, name=b.name, description=b.description,
            schedule=b.schedule, coach_id=b.coach_id,
            monthly_fee=b.monthly_fee, is_active=b.is_active,
            created_at=b.created_at, student_count=count,
        ))
    return result


@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: int, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.coach_id == coach.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    count = db.query(StudentBatch).filter(
        StudentBatch.batch_id == batch.id, StudentBatch.is_active == True
    ).count()
    return BatchResponse(
        id=batch.id, name=batch.name, description=batch.description,
        schedule=batch.schedule, coach_id=batch.coach_id,
        monthly_fee=batch.monthly_fee, is_active=batch.is_active,
        created_at=batch.created_at, student_count=count,
    )


@router.put("/{batch_id}", response_model=BatchResponse)
def update_batch(batch_id: int, data: BatchUpdate, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.coach_id == coach.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(batch, field, value)
    db.commit()
    db.refresh(batch)
    count = db.query(StudentBatch).filter(
        StudentBatch.batch_id == batch.id, StudentBatch.is_active == True
    ).count()
    return BatchResponse(
        id=batch.id, name=batch.name, description=batch.description,
        schedule=batch.schedule, coach_id=batch.coach_id,
        monthly_fee=batch.monthly_fee, is_active=batch.is_active,
        created_at=batch.created_at, student_count=count,
    )


# ==================== STUDENT MANAGEMENT ====================

@router.post("/{batch_id}/students", response_model=StudentBatchResponse)
def add_student_to_batch(batch_id: int, data: StudentBatchAdd, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.coach_id == coach.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
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


@router.get("/{batch_id}/students", response_model=List[StudentBatchResponse])
def list_batch_students(batch_id: int, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.coach_id == coach.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
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
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.coach_id == coach.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
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
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.coach_id == coach.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    session = ClassSession(
        batch_id=batch_id,
        date=data.date,
        duration_minutes=data.duration_minutes,
        topic=data.topic,
        meeting_link=data.meeting_link,
        notes=data.notes,
        created_by=coach.id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return ClassSessionResponse(
        id=session.id, batch_id=session.batch_id, date=session.date,
        duration_minutes=session.duration_minutes, topic=session.topic,
        meeting_link=session.meeting_link, notes=session.notes,
        created_at=session.created_at, batch_name=batch.name,
    )


@router.get("/{batch_id}/classes", response_model=List[ClassSessionResponse])
def list_class_sessions(batch_id: int, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.coach_id == coach.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    sessions = db.query(ClassSession).filter(
        ClassSession.batch_id == batch_id
    ).order_by(ClassSession.date.desc()).all()
    return [
        ClassSessionResponse(
            id=s.id, batch_id=s.batch_id, date=s.date,
            duration_minutes=s.duration_minutes, topic=s.topic,
            meeting_link=s.meeting_link, notes=s.notes,
            created_at=s.created_at, batch_name=batch.name,
        )
        for s in sessions
    ]


# ==================== ANNOUNCEMENTS ====================

@router.post("/{batch_id}/announcements", response_model=AnnouncementResponse)
def create_announcement(batch_id: int, data: AnnouncementCreate, coach: User = Depends(require_coach), db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.coach_id == coach.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    ann = Announcement(
        batch_id=batch_id,
        title=data.title,
        message=data.message,
        created_by=coach.id,
    )
    db.add(ann)
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
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.coach_id == coach.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
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
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.coach_id == coach.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

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


class MarkPaidRequest(BaseModel):
    student_id: int
    batch_id: int
    billing_month: str  # "YYYY-MM"
    notes: Optional[str] = None  # e.g. "Paid via UPI"


class CoachInviteCreateRequest(BaseModel):
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

    batches = db.query(Batch).filter(Batch.coach_id == admin.id).all()
    batch_ids = [b.id for b in batches]
    if batch_id is not None:
        if batch_id not in batch_ids:
            return {
                "summary": {
                    "total_students": 0,
                    "paid_count": 0,
                    "pending_count": 0,
                    "overdue_count": 0,
                    "total_collected": 0,
                    "billing_month": month,
                },
                "payments": [],
            }
        batch_ids = [batch_id]

    if not batch_ids:
        return {
            "summary": {
                "total_students": 0,
                "paid_count": 0,
                "pending_count": 0,
                "overdue_count": 0,
                "total_collected": 0,
                "billing_month": month,
            },
            "payments": [],
        }

    sbs = (
        db.query(StudentBatch)
        .filter(
            StudentBatch.batch_id.in_(batch_ids),
            StudentBatch.is_active == True,
        )
        .all()
    )

    batch_by_id = {b.id: b for b in batches}
    past_deadline = _is_past_tenth_of_billing_month(month, now)
    payments_out = []

    for sb in sbs:
        batch = batch_by_id.get(sb.batch_id)
        if not batch:
            batch = db.query(Batch).filter(Batch.id == sb.batch_id).first()
        if not batch:
            continue

        completed = (
            db.query(Payment)
            .filter(
                Payment.student_id == sb.student_id,
                Payment.batch_id == sb.batch_id,
                Payment.billing_month == month,
                Payment.status == "completed",
            )
            .first()
        )

        if completed:
            row_status = "paid"
            paid_at = completed.paid_at
            payment_id = completed.id
        elif past_deadline:
            row_status = "overdue"
            paid_at = None
            payment_id = None
        else:
            row_status = "pending"
            paid_at = None
            payment_id = None

        student = db.query(User).filter(User.id == sb.student_id).first()
        payments_out.append({
            "student_id": sb.student_id,
            "student_name": student.full_name if student else "Unknown",
            "student_username": student.username if student else "unknown",
            "batch_id": sb.batch_id,
            "batch_name": batch.name,
            "monthly_fee": batch.monthly_fee,
            "billing_month": month,
            "status": row_status,
            "paid_at": paid_at,
            "payment_id": payment_id,
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
        p["monthly_fee"] for p in payments_out if p["status"] == "paid"
    )

    return {
        "summary": {
            "total_students": len(payments_out),
            "paid_count": paid_count,
            "pending_count": pending_count,
            "overdue_count": overdue_count,
            "total_collected": total_collected,
            "billing_month": month,
        },
        "payments": payments_out,
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
    if not batch or batch.coach_id != admin.id:
        raise HTTPException(status_code=404, detail="Batch not found")

    sb = db.query(StudentBatch).filter(
        StudentBatch.student_id == data.student_id,
        StudentBatch.batch_id == data.batch_id,
        StudentBatch.is_active == True,
    ).first()
    if not sb:
        raise HTTPException(status_code=404, detail="Student not in this batch")

    existing = db.query(Payment).filter(
        Payment.student_id == data.student_id,
        Payment.batch_id == data.batch_id,
        Payment.billing_month == data.billing_month,
        Payment.status == "completed",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already marked as paid")

    payment = Payment(
        parent_id=admin.id,
        student_id=data.student_id,
        batch_id=data.batch_id,
        amount=batch.monthly_fee,
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
            "amount": float(batch.monthly_fee or 0),
        },
    )
    sb.payment_status = "paid"
    db.commit()
    db.refresh(payment)

    student = db.query(User).filter(User.id == data.student_id).first()
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
    if not batch or batch.coach_id != admin.id:
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
    email = data.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)
    invite = CoachSignupInvite(
        token=token,
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
        details={"email": email, "expires_in_days": data.expires_in_days},
    )
    db.commit()
    db.refresh(invite)

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    invite_url = f"{frontend_url}/coach-signup/{invite.token}"
    return {
        "id": invite.id,
        "token": invite.token,
        "invite_url": invite_url,
        "email": invite.email,
        "expires_at": invite.expires_at,
        "used_at": invite.used_at,
        "is_active": invite.is_active,
        "created_at": invite.created_at,
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
        User.role == UserRole.coach,
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
