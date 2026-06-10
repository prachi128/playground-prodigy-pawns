"""Join-based attendance: in-app join events and auto-present marking."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from batch_schedule_service import active_batch_student_ids
from models import (
    Attendance,
    ClassSession,
    ClassSessionJoin,
    ParentStudent,
    SessionStudent,
    StudentBatch,
    User,
    UserRole,
)

JOIN_WINDOW_BEFORE_MINUTES = 15
ATTENDANCE_SOURCE_AUTO = "auto_join"
ATTENDANCE_SOURCE_MANUAL = "coach_manual"


def _is_student(user: User) -> bool:
    return user.role in (UserRole.student, "student")


def _is_parent(user: User) -> bool:
    return user.role in (UserRole.parent, "parent")


def session_join_window(session: ClassSession) -> Tuple[datetime, datetime]:
    start = session.date
    duration = session.duration_minutes or 60
    window_start = start - timedelta(minutes=JOIN_WINDOW_BEFORE_MINUTES)
    window_end = start + timedelta(minutes=duration)
    return window_start, window_end


def is_within_join_window(session: ClassSession, now: Optional[datetime] = None) -> bool:
    now = now or datetime.utcnow()
    window_start, window_end = session_join_window(session)
    return window_start <= now <= window_end


def _student_enrolled_in_batch(db: Session, student_id: int, batch_id: int) -> bool:
    return (
        db.query(StudentBatch.id)
        .filter(
            StudentBatch.student_id == student_id,
            StudentBatch.batch_id == batch_id,
            StudentBatch.is_active == True,
        )
        .first()
        is not None
    )


def _student_on_makeup_roster(db: Session, session_id: int, student_id: int) -> bool:
    return (
        db.query(SessionStudent.id)
        .filter(
            SessionStudent.class_session_id == session_id,
            SessionStudent.student_id == student_id,
        )
        .first()
        is not None
    )


def student_can_join_session(db: Session, student_id: int, session: ClassSession) -> None:
    if not _student_enrolled_in_batch(db, student_id, session.batch_id):
        raise HTTPException(status_code=403, detail="Student is not enrolled in this class")

    session_kind = (getattr(session, "session_kind", None) or "regular").lower()
    if session_kind == "makeup" and not _student_on_makeup_roster(db, session.id, student_id):
        raise HTTPException(status_code=403, detail="Student is not on this make-up session roster")

    if not is_within_join_window(session):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Join is only available shortly before class through the end of the session",
        )


def resolve_join_student_id(
    db: Session,
    user: User,
    session: ClassSession,
    requested_student_id: Optional[int],
) -> int:
    if _is_student(user):
        if requested_student_id is not None and requested_student_id != user.id:
            raise HTTPException(status_code=403, detail="Students can only join for themselves")
        return user.id

    if _is_parent(user):
        children = (
            db.query(ParentStudent.student_id)
            .filter(ParentStudent.parent_id == user.id)
            .all()
        )
        child_ids = {row[0] for row in children}
        if not child_ids:
            raise HTTPException(status_code=403, detail="No linked children on this account")

        batch_student_ids = set(active_batch_student_ids(db, session.batch_id))
        eligible = child_ids & batch_student_ids

        if requested_student_id is not None:
            if requested_student_id not in child_ids:
                raise HTTPException(status_code=403, detail="Not your child")
            if requested_student_id not in batch_student_ids:
                raise HTTPException(status_code=403, detail="Child is not enrolled in this class")
            return requested_student_id

        if len(eligible) == 1:
            return next(iter(eligible))

        if len(eligible) == 0:
            raise HTTPException(status_code=403, detail="No enrolled children for this class")

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="student_id is required when multiple children are enrolled in this class",
        )

    raise HTTPException(status_code=403, detail="Only students and parents can join class sessions")


def record_join_and_mark_present(
    db: Session,
    session: ClassSession,
    student_id: int,
) -> Tuple[ClassSessionJoin, Attendance]:
    now = datetime.utcnow()

    join_row = (
        db.query(ClassSessionJoin)
        .filter(
            ClassSessionJoin.class_session_id == session.id,
            ClassSessionJoin.student_id == student_id,
        )
        .first()
    )
    if not join_row:
        join_row = ClassSessionJoin(
            class_session_id=session.id,
            student_id=student_id,
            joined_at=now,
            join_source="in_app",
        )
        db.add(join_row)

    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.class_session_id == session.id,
            Attendance.student_id == student_id,
        )
        .first()
    )

    if attendance and attendance.source == ATTENDANCE_SOURCE_MANUAL:
        db.flush()
        return join_row, attendance

    if attendance:
        attendance.status = "present"
        attendance.source = ATTENDANCE_SOURCE_AUTO
        attendance.marked_by = student_id
        attendance.marked_at = now
    else:
        attendance = Attendance(
            class_session_id=session.id,
            student_id=student_id,
            status="present",
            source=ATTENDANCE_SOURCE_AUTO,
            marked_by=student_id,
            marked_at=now,
        )
        db.add(attendance)

    db.flush()
    return join_row, attendance
