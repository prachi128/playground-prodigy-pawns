# parent_endpoints.py - Parent Dashboard API Endpoints

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from models import (
    User, UserRole, ParentStudent, Batch, StudentBatch,
    ClassSession, Announcement, Payment, PuzzleAttempt, Game,
)
from auth import get_current_user
from database import get_db
from schemas import (
    ClassSessionResponse, AnnouncementResponse,
    PaymentCheckoutCreate, PaymentResponse, ChildResponse, ParentChildAssignmentResponse,
)
from stripe_service import create_checkout_session, verify_webhook

router = APIRouter(prefix="/api/parent", tags=["parent"])


def require_parent(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRole.parent, "parent"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only parents can access this endpoint"
        )
    return user


def _get_children_ids(parent_id: int, db: Session) -> List[int]:
    links = db.query(ParentStudent).filter(ParentStudent.parent_id == parent_id).all()
    return [link.student_id for link in links]


def _get_children_batch_ids(children_ids: List[int], db: Session) -> List[int]:
    sbs = db.query(StudentBatch).filter(
        StudentBatch.student_id.in_(children_ids),
        StudentBatch.is_active == True,
    ).all()
    return list(set(sb.batch_id for sb in sbs))


def _get_level_category(level: int) -> str:
    if level <= 2:
        return "Pawn"
    elif level <= 5:
        return "Knight"
    elif level <= 8:
        return "Bishop"
    elif level <= 11:
        return "Rook"
    elif level <= 14:
        return "Queen"
    return "King"


# ==================== DASHBOARD OVERVIEW ====================

@router.get("/dashboard")
def get_dashboard(parent: User = Depends(require_parent), db: Session = Depends(get_db)):
    children_ids = _get_children_ids(parent.id, db)
    batch_ids = _get_children_batch_ids(children_ids, db)

    now = datetime.utcnow()
    current_month = now.strftime("%Y-%m")

    # Children info
    children = []
    for cid in children_ids:
        student = db.query(User).filter(User.id == cid).first()
        if not student:
            continue
        sb = db.query(StudentBatch).filter(
            StudentBatch.student_id == cid, StudentBatch.is_active == True
        ).first()
        batch = db.query(Batch).filter(Batch.id == sb.batch_id).first() if sb else None
        payment = db.query(Payment).filter(
            Payment.student_id == cid,
            Payment.billing_month == current_month,
            Payment.status == "completed",
        ).first() if sb else None
        is_past_deadline = now.day > 10
        p_status = "paid" if payment else ("overdue" if is_past_deadline else "pending")
        children.append(ChildResponse(
            id=student.id, full_name=student.full_name, username=student.username,
            avatar_url=student.avatar_url, rating=student.rating, level=student.level,
            level_category=_get_level_category(student.level), total_xp=student.total_xp,
            batch_name=batch.name if batch else None,
            batch_id=batch.id if batch else None,
            payment_status=p_status,
        ))

    # Upcoming classes (next 5)
    upcoming_classes = []
    if batch_ids:
        sessions = db.query(ClassSession).filter(
            ClassSession.batch_id.in_(batch_ids),
            ClassSession.date >= now,
        ).order_by(ClassSession.date.asc()).limit(5).all()
        for s in sessions:
            batch = db.query(Batch).filter(Batch.id == s.batch_id).first()
            upcoming_classes.append(ClassSessionResponse(
                id=s.id, batch_id=s.batch_id, date=s.date,
                duration_minutes=s.duration_minutes, topic=s.topic,
                meeting_link=s.meeting_link, notes=s.notes,
                created_at=s.created_at, batch_name=batch.name if batch else None,
            ))

    # Recent announcements (last 5)
    announcements = []
    if batch_ids:
        anns = db.query(Announcement).filter(
            Announcement.batch_id.in_(batch_ids)
        ).order_by(Announcement.created_at.desc()).limit(5).all()
        for a in anns:
            batch = db.query(Batch).filter(Batch.id == a.batch_id).first()
            coach = db.query(User).filter(User.id == a.created_by).first()
            announcements.append(AnnouncementResponse(
                id=a.id, batch_id=a.batch_id, title=a.title,
                message=a.message, created_by=a.created_by,
                created_at=a.created_at,
                batch_name=batch.name if batch else None,
                coach_name=coach.full_name if coach else None,
            ))

    return {
        "parent_name": parent.full_name,
        "children": [c.model_dump() for c in children],
        "upcoming_classes": [c.model_dump() for c in upcoming_classes],
        "announcements": [a.model_dump() for a in announcements],
        "current_month": current_month,
        "payment_deadline_day": 10,
    }


# ==================== CHILDREN ====================

@router.get("/children", response_model=List[ChildResponse])
def get_children(parent: User = Depends(require_parent), db: Session = Depends(get_db)):
    children_ids = _get_children_ids(parent.id, db)
    now = datetime.utcnow()
    current_month = now.strftime("%Y-%m")
    is_past_deadline = now.day > 10

    result = []
    for cid in children_ids:
        student = db.query(User).filter(User.id == cid).first()
        if not student:
            continue
        sb = db.query(StudentBatch).filter(
            StudentBatch.student_id == cid, StudentBatch.is_active == True
        ).first()
        batch = db.query(Batch).filter(Batch.id == sb.batch_id).first() if sb else None
        payment = db.query(Payment).filter(
            Payment.student_id == cid,
            Payment.billing_month == current_month,
            Payment.status == "completed",
        ).first() if sb else None
        p_status = "paid" if payment else ("overdue" if is_past_deadline else "pending")
        result.append(ChildResponse(
            id=student.id, full_name=student.full_name, username=student.username,
            avatar_url=student.avatar_url, rating=student.rating, level=student.level,
            level_category=_get_level_category(student.level), total_xp=student.total_xp,
            batch_name=batch.name if batch else None,
            batch_id=batch.id if batch else None,
            payment_status=p_status,
        ))
    return result


# ==================== CLASSES ====================

@router.get("/children/{child_id}/assignments", response_model=List[ParentChildAssignmentResponse])
def get_child_assignments(
    child_id: int,
    parent: User = Depends(require_parent),
    db: Session = Depends(get_db),
):
    children_ids = _get_children_ids(parent.id, db)
    if child_id not in children_ids:
        raise HTTPException(status_code=403, detail="Not your child")

    batch_ids = [
        sb.batch_id
        for sb in db.query(StudentBatch).filter(
            StudentBatch.student_id == child_id,
            StudentBatch.is_active == True,
        ).all()
    ]

    from sqlalchemy import or_
    from models import Assignment, AssignmentPuzzle, AssignmentCompletion

    assignments = (
        db.query(Assignment)
        .filter(
            Assignment.is_active == True,
            or_(
                Assignment.student_id == child_id,
                Assignment.batch_id.in_(batch_ids) if batch_ids else False,
            ),
        )
        .order_by(Assignment.due_date.asc().nulls_last(), Assignment.created_at.desc())
        .all()
    )

    now = datetime.utcnow()
    result = []
    for assignment in assignments:
        total_puzzles = len(assignment.puzzles)
        completed = (
            db.query(AssignmentCompletion)
            .filter(
                AssignmentCompletion.assignment_id == assignment.id,
                AssignmentCompletion.student_id == child_id,
            )
            .count()
        )
        pct = round(completed / total_puzzles * 100, 1) if total_puzzles > 0 else 0.0
        due_date = assignment.due_date
        if due_date is not None and due_date.tzinfo is not None:
            due_date = due_date.replace(tzinfo=None)

        is_overdue = bool(
            due_date and due_date < now and completed < total_puzzles
        )

        result.append(
            {
                "id": assignment.id,
                "title": assignment.title,
                "description": assignment.description,
                "due_date": assignment.due_date,
                "puzzle_count": total_puzzles,
                "puzzles_completed": completed,
                "completion_pct": pct,
                "is_complete": completed >= total_puzzles,
                "is_overdue": is_overdue,
            }
        )

    return result


@router.get("/classes", response_model=List[ClassSessionResponse])
def get_classes(parent: User = Depends(require_parent), db: Session = Depends(get_db)):
    children_ids = _get_children_ids(parent.id, db)
    batch_ids = _get_children_batch_ids(children_ids, db)
    if not batch_ids:
        return []
    sessions = db.query(ClassSession).filter(
        ClassSession.batch_id.in_(batch_ids),
    ).order_by(ClassSession.date.desc()).limit(50).all()
    result = []
    for s in sessions:
        batch = db.query(Batch).filter(Batch.id == s.batch_id).first()
        result.append(ClassSessionResponse(
            id=s.id, batch_id=s.batch_id, date=s.date,
            duration_minutes=s.duration_minutes, topic=s.topic,
            meeting_link=s.meeting_link, notes=s.notes,
            created_at=s.created_at, batch_name=batch.name if batch else None,
        ))
    return result


# ==================== ANNOUNCEMENTS ====================

@router.get("/announcements", response_model=List[AnnouncementResponse])
def get_announcements(parent: User = Depends(require_parent), db: Session = Depends(get_db)):
    children_ids = _get_children_ids(parent.id, db)
    batch_ids = _get_children_batch_ids(children_ids, db)
    if not batch_ids:
        return []
    anns = db.query(Announcement).filter(
        Announcement.batch_id.in_(batch_ids)
    ).order_by(Announcement.created_at.desc()).limit(50).all()
    result = []
    for a in anns:
        batch = db.query(Batch).filter(Batch.id == a.batch_id).first()
        coach = db.query(User).filter(User.id == a.created_by).first()
        result.append(AnnouncementResponse(
            id=a.id, batch_id=a.batch_id, title=a.title,
            message=a.message, created_by=a.created_by,
            created_at=a.created_at,
            batch_name=batch.name if batch else None,
            coach_name=coach.full_name if coach else None,
        ))
    return result


# ==================== PAYMENTS ====================

@router.post("/payments/create-checkout")
def create_payment_checkout(
    data: PaymentCheckoutCreate,
    parent: User = Depends(require_parent),
    db: Session = Depends(get_db),
):
    # Verify the student is the parent's child
    children_ids = _get_children_ids(parent.id, db)
    if data.student_id not in children_ids:
        raise HTTPException(status_code=403, detail="This student is not your child")

    # Verify the student is in the batch
    sb = db.query(StudentBatch).filter(
        StudentBatch.student_id == data.student_id,
        StudentBatch.batch_id == data.batch_id,
        StudentBatch.is_active == True,
    ).first()
    if not sb:
        raise HTTPException(status_code=404, detail="Student not in this batch")

    batch = db.query(Batch).filter(Batch.id == data.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    student = db.query(User).filter(User.id == data.student_id).first()

    # Check for existing completed payment this month
    existing = db.query(Payment).filter(
        Payment.student_id == data.student_id,
        Payment.batch_id == data.batch_id,
        Payment.billing_month == data.billing_month,
        Payment.status == "completed",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Payment already completed for this month")

    # Create Stripe checkout session
    try:
        session = create_checkout_session(
            parent_id=parent.id,
            student_id=data.student_id,
            batch_id=data.batch_id,
            amount=batch.monthly_fee,
            currency="usd",
            billing_month=data.billing_month,
            batch_name=batch.name,
            student_name=student.full_name if student else "Student",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

    # Create pending payment record
    payment = Payment(
        parent_id=parent.id,
        student_id=data.student_id,
        batch_id=data.batch_id,
        amount=batch.monthly_fee,
        currency="usd",
        billing_month=data.billing_month,
        stripe_checkout_session_id=session.id,
    )
    db.add(payment)
    db.commit()

    return {"checkout_url": session.url, "session_id": session.id}


@router.get("/payments/history", response_model=List[PaymentResponse])
def get_payment_history(parent: User = Depends(require_parent), db: Session = Depends(get_db)):
    payments = db.query(Payment).filter(
        Payment.parent_id == parent.id
    ).order_by(Payment.created_at.desc()).all()
    result = []
    for p in payments:
        student = db.query(User).filter(User.id == p.student_id).first()
        batch = db.query(Batch).filter(Batch.id == p.batch_id).first()
        result.append(PaymentResponse(
            id=p.id, parent_id=p.parent_id, student_id=p.student_id,
            batch_id=p.batch_id, amount=p.amount, currency=p.currency,
            billing_month=p.billing_month, status=p.status,
            paid_at=p.paid_at, created_at=p.created_at,
            student_name=student.full_name if student else None,
            batch_name=batch.name if batch else None,
        ))
    return result


# ==================== STRIPE WEBHOOK ====================

@router.post("/payments/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = verify_webhook(payload, sig_header)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        checkout_session_id = session["id"]

        payment = db.query(Payment).filter(
            Payment.stripe_checkout_session_id == checkout_session_id
        ).first()
        if payment:
            payment.status = "completed"
            payment.paid_at = datetime.utcnow()
            db.commit()

            # Update StudentBatch payment_status
            sb = db.query(StudentBatch).filter(
                StudentBatch.student_id == payment.student_id,
                StudentBatch.batch_id == payment.batch_id,
                StudentBatch.is_active == True,
            ).first()
            if sb:
                sb.payment_status = "paid"
                db.commit()

    return {"status": "ok"}
