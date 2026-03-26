from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from models import (
    Attendance,
    ClassSession,
    StudentBatch,
    Batch,
    User,
    UserRole,
    ParentStudent,
)
from auth import get_current_user
from database import get_db


router = APIRouter(prefix="/api/attendance", tags=["attendance"])


def require_coach(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRole.coach, UserRole.admin, "coach", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Coach privileges required",
        )
    return user


def require_any(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )
    return user


def _status_bucket(value: Optional[str]) -> str:
    v = (value or "").strip().lower()
    if v in ("present", "absent"):
        return v
    return "not_marked"


def _attendance_summary(statuses: List[str]) -> Dict[str, Any]:
    total = len(statuses)
    present_count = sum(1 for s in statuses if s == "present")
    absent_count = sum(1 for s in statuses if s == "absent")
    not_marked_count = sum(1 for s in statuses if s == "not_marked")
    pct = (present_count / total * 100.0) if total > 0 else 0.0
    return {
        "total_sessions": total,
        "present_count": present_count,
        "absent_count": absent_count,
        "not_marked_count": not_marked_count,
        "attendance_pct": round(pct, 2),
    }


def _get_owned_session(
    db: Session,
    session_id: int,
    coach_id: int,
) -> ClassSession:
    session = (
        db.query(ClassSession)
        .join(Batch, Batch.id == ClassSession.batch_id)
        .filter(ClassSession.id == session_id, Batch.coach_id == coach_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Class session not found")
    return session


def _get_owned_batch(db: Session, batch_id: int, coach_id: int) -> Batch:
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.coach_id == coach_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.get("/session/{session_id}")
def get_session_attendance(
    session_id: int,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(db, session_id=session_id, coach_id=coach.id)

    students = (
        db.query(User)
        .join(StudentBatch, StudentBatch.student_id == User.id)
        .filter(
            StudentBatch.batch_id == session.batch_id,
            StudentBatch.is_active == True,
        )
        .all()
    )

    student_ids = [s.id for s in students]
    attendance_rows = (
        db.query(Attendance)
        .filter(
            Attendance.class_session_id == session_id,
            Attendance.student_id.in_(student_ids) if student_ids else False,
        )
        .all()
    )
    attendance_by_student_id = {a.student_id: a for a in attendance_rows}

    out = []
    for s in students:
        a = attendance_by_student_id.get(s.id)
        out.append(
            {
                "student_id": s.id,
                "student_name": s.full_name,
                "student_username": s.username,
                "status": _status_bucket(getattr(a, "status", None)) if a else "not_marked",
                "marked_at": getattr(a, "marked_at", None) if a else None,
                "notes": getattr(a, "notes", None) if a else None,
                "attendance_id": getattr(a, "id", None) if a else None,
            }
        )

    out.sort(key=lambda r: (r.get("student_name") or "").lower())
    return out


class MarkAttendanceRequest(BaseModel):
    student_id: int
    status: str  # "present" or "absent"
    notes: Optional[str] = None


@router.post("/session/{session_id}/mark")
def mark_attendance(
    session_id: int,
    data: MarkAttendanceRequest,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    status_norm = (data.status or "").strip().lower()
    if status_norm not in ("present", "absent"):
        raise HTTPException(status_code=400, detail="Invalid status; must be 'present' or 'absent'")

    session = _get_owned_session(db, session_id=session_id, coach_id=coach.id)

    sb = (
        db.query(StudentBatch)
        .filter(
            StudentBatch.batch_id == session.batch_id,
            StudentBatch.student_id == data.student_id,
            StudentBatch.is_active == True,
        )
        .first()
    )
    if not sb:
        raise HTTPException(status_code=404, detail="Student not in this batch")

    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.class_session_id == session_id,
            Attendance.student_id == data.student_id,
        )
        .first()
    )
    now = datetime.utcnow()
    if attendance:
        attendance.status = status_norm
        attendance.notes = data.notes
        attendance.marked_by = coach.id
        attendance.marked_at = now
    else:
        attendance = Attendance(
            class_session_id=session_id,
            student_id=data.student_id,
            status=status_norm,
            notes=data.notes,
            marked_by=coach.id,
            marked_at=now,
        )
        db.add(attendance)

    db.commit()
    db.refresh(attendance)

    return {
        "attendance_id": attendance.id,
        "student_id": attendance.student_id,
        "session_id": attendance.class_session_id,
        "status": attendance.status,
        "marked_at": attendance.marked_at,
        "marked_by": attendance.marked_by,
    }


class MarkAllAttendanceRequest(BaseModel):
    default_status: str = "absent"
    overrides: Optional[Dict[int, str]] = None


@router.post("/session/{session_id}/mark-all")
def mark_all_attendance(
    session_id: int,
    data: MarkAllAttendanceRequest,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    session = _get_owned_session(db, session_id=session_id, coach_id=coach.id)

    default_norm = (data.default_status or "").strip().lower()
    if default_norm not in ("present", "absent"):
        raise HTTPException(status_code=400, detail="Invalid default_status; must be 'present' or 'absent'")

    overrides = data.overrides or {}
    for sid, st in overrides.items():
        st_norm = (st or "").strip().lower()
        if st_norm not in ("present", "absent"):
            raise HTTPException(status_code=400, detail=f"Invalid override status for student {sid}")

    students = (
        db.query(StudentBatch)
        .filter(StudentBatch.batch_id == session.batch_id, StudentBatch.is_active == True)
        .all()
    )
    student_ids = [sb.student_id for sb in students]

    existing = (
        db.query(Attendance)
        .filter(
            Attendance.class_session_id == session_id,
            Attendance.student_id.in_(student_ids) if student_ids else False,
        )
        .all()
    )
    existing_by_student_id = {a.student_id: a for a in existing}

    now = datetime.utcnow()
    marked = 0
    for sid in student_ids:
        st = overrides.get(sid, default_norm)
        st_norm = (st or "").strip().lower()

        row = existing_by_student_id.get(sid)
        if row:
            row.status = st_norm
            row.marked_by = coach.id
            row.marked_at = now
        else:
            row = Attendance(
                class_session_id=session_id,
                student_id=sid,
                status=st_norm,
                marked_by=coach.id,
                marked_at=now,
            )
            db.add(row)
            existing_by_student_id[sid] = row
        marked += 1

    db.commit()
    return {"marked": marked, "session_id": session_id}


@router.get("/student/{student_id}")
def get_student_attendance(
    student_id: int,
    batch_id: Optional[int] = None,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    coach_batches_q = db.query(Batch).filter(Batch.coach_id == coach.id)
    coach_batches = coach_batches_q.all()
    coach_batch_ids = [b.id for b in coach_batches]
    batch_name_by_id = {b.id: b.name for b in coach_batches}

    enrolled = (
        db.query(StudentBatch)
        .filter(
            StudentBatch.student_id == student_id,
            StudentBatch.batch_id.in_(coach_batch_ids) if coach_batch_ids else False,
        )
        .all()
    )
    enrolled_batch_ids = list({sb.batch_id for sb in enrolled})
    if batch_id is not None:
        if batch_id not in coach_batch_ids:
            raise HTTPException(status_code=404, detail="Batch not found")
        enrolled_batch_ids = [bid for bid in enrolled_batch_ids if bid == batch_id]

    sessions = []
    if enrolled_batch_ids:
        sessions = (
            db.query(ClassSession)
            .filter(ClassSession.batch_id.in_(enrolled_batch_ids))
            .order_by(ClassSession.date.desc())
            .all()
        )

    session_ids = [s.id for s in sessions]
    attendance_rows = (
        db.query(Attendance)
        .filter(
            Attendance.student_id == student_id,
            Attendance.class_session_id.in_(session_ids) if session_ids else False,
        )
        .all()
    )
    attendance_by_session_id = {a.class_session_id: a for a in attendance_rows}

    out_sessions = []
    statuses = []
    for s in sessions:
        a = attendance_by_session_id.get(s.id)
        st = _status_bucket(getattr(a, "status", None)) if a else "not_marked"
        statuses.append(st)
        out_sessions.append(
            {
                "session_id": s.id,
                "date": s.date,
                "topic": getattr(s, "topic", None),
                "batch_name": batch_name_by_id.get(s.batch_id) or "",
                "status": st,
                "notes": getattr(a, "notes", None) if a else None,
            }
        )

    return {"summary": _attendance_summary(statuses), "sessions": out_sessions}


@router.get("/batch/{batch_id}")
def get_batch_attendance(
    batch_id: int,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    batch = _get_owned_batch(db, batch_id=batch_id, coach_id=coach.id)

    sessions = (
        db.query(ClassSession)
        .filter(ClassSession.batch_id == batch_id)
        .order_by(ClassSession.date.desc())
        .all()
    )
    session_ids = [s.id for s in sessions]
    total_sessions = len(sessions)

    students = (
        db.query(User)
        .join(StudentBatch, StudentBatch.student_id == User.id)
        .filter(
            StudentBatch.batch_id == batch_id,
            StudentBatch.is_active == True,
        )
        .all()
    )
    student_ids = [s.id for s in students]

    attendance_rows = (
        db.query(Attendance)
        .filter(
            Attendance.class_session_id.in_(session_ids) if session_ids else False,
            Attendance.student_id.in_(student_ids) if student_ids else False,
        )
        .all()
    )
    by_student: Dict[int, List[Attendance]] = {}
    for a in attendance_rows:
        by_student.setdefault(a.student_id, []).append(a)

    out_students = []
    for s in students:
        rows = by_student.get(s.id, [])
        present_count = sum(1 for r in rows if _status_bucket(r.status) == "present")
        absent_count = sum(1 for r in rows if _status_bucket(r.status) == "absent")
        not_marked_count = total_sessions - (present_count + absent_count)
        pct = (present_count / total_sessions * 100.0) if total_sessions > 0 else 0.0

        last_present = None
        for r in rows:
            if _status_bucket(r.status) == "present":
                if last_present is None or (r.marked_at and r.marked_at > last_present):
                    last_present = r.marked_at

        out_students.append(
            {
                "student_id": s.id,
                "student_name": s.full_name,
                "student_username": s.username,
                "present_count": present_count,
                "absent_count": absent_count,
                "not_marked_count": not_marked_count,
                "attendance_pct": round(pct, 2),
                "last_present": last_present,
            }
        )

    out_students.sort(key=lambda r: (r.get("attendance_pct") or 0.0), reverse=True)
    return {
        "batch_name": batch.name,
        "total_sessions": total_sessions,
        "students": out_students,
    }


@router.get("/my")
def get_my_attendance(
    student: User = Depends(require_any),
    db: Session = Depends(get_db),
):
    sbs = db.query(StudentBatch).filter(
        StudentBatch.student_id == student.id,
        StudentBatch.is_active == True,
    ).all()
    batch_ids = list({sb.batch_id for sb in sbs})

    batches = db.query(Batch).filter(Batch.id.in_(batch_ids) if batch_ids else False).all()
    batch_name_by_id = {b.id: b.name for b in batches}

    sessions = []
    if batch_ids:
        sessions = (
            db.query(ClassSession)
            .filter(ClassSession.batch_id.in_(batch_ids))
            .order_by(ClassSession.date.desc())
            .all()
        )

    session_ids = [s.id for s in sessions]
    attendance_rows = (
        db.query(Attendance)
        .filter(
            Attendance.student_id == student.id,
            Attendance.class_session_id.in_(session_ids) if session_ids else False,
        )
        .all()
    )
    attendance_by_session_id = {a.class_session_id: a for a in attendance_rows}

    out_sessions = []
    statuses = []
    for s in sessions:
        a = attendance_by_session_id.get(s.id)
        st = _status_bucket(getattr(a, "status", None)) if a else "not_marked"
        statuses.append(st)
        out_sessions.append(
            {
                "session_id": s.id,
                "date": s.date,
                "topic": getattr(s, "topic", None),
                "batch_name": batch_name_by_id.get(s.batch_id) or "",
                "status": st,
                "notes": getattr(a, "notes", None) if a else None,
            }
        )

    return {"summary": _attendance_summary(statuses), "sessions": out_sessions}


@router.get("/child/{child_id}")
def get_child_attendance(
    child_id: int,
    parent: User = Depends(require_any),
    db: Session = Depends(get_db),
):
    if parent.role not in ["parent", UserRole.parent]:
        raise HTTPException(status_code=403, detail="Parent privileges required")

    link = db.query(ParentStudent).filter(
        ParentStudent.parent_id == parent.id,
        ParentStudent.student_id == child_id,
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="Not your child")

    sbs = db.query(StudentBatch).filter(
        StudentBatch.student_id == child_id,
        StudentBatch.is_active == True,
    ).all()
    batch_ids = list({sb.batch_id for sb in sbs})

    batches = db.query(Batch).filter(Batch.id.in_(batch_ids) if batch_ids else False).all()
    batch_name_by_id = {b.id: b.name for b in batches}

    sessions = []
    if batch_ids:
        sessions = (
            db.query(ClassSession)
            .filter(ClassSession.batch_id.in_(batch_ids))
            .order_by(ClassSession.date.desc())
            .all()
        )

    session_ids = [s.id for s in sessions]
    attendance_rows = (
        db.query(Attendance)
        .filter(
            Attendance.student_id == child_id,
            Attendance.class_session_id.in_(session_ids) if session_ids else False,
        )
        .all()
    )
    attendance_by_session_id = {a.class_session_id: a for a in attendance_rows}

    out_sessions = []
    statuses = []
    for s in sessions:
        a = attendance_by_session_id.get(s.id)
        st = _status_bucket(getattr(a, "status", None)) if a else "not_marked"
        statuses.append(st)
        out_sessions.append(
            {
                "session_id": s.id,
                "date": s.date,
                "topic": getattr(s, "topic", None),
                "batch_name": batch_name_by_id.get(s.batch_id) or "",
                "status": st,
                "notes": getattr(a, "notes", None) if a else None,
            }
        )

    return {"summary": _attendance_summary(statuses), "sessions": out_sessions}

