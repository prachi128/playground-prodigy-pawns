# batch_endpoints.py - Coach Batch Management API Endpoints

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

from models import Batch, StudentBatch, ClassSession, Announcement, Payment, User, UserRole
from auth import get_current_user
from database import get_db
from schemas import (
    BatchCreate, BatchUpdate, BatchResponse,
    ClassSessionCreate, ClassSessionResponse,
    AnnouncementCreate, AnnouncementResponse,
    StudentBatchAdd, StudentBatchResponse,
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
    is_past_deadline = now.day > 10

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
