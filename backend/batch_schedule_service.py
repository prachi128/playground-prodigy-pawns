"""Shared helpers for coach batch schedules and class session rosters."""

from __future__ import annotations

from typing import Iterable, List, Optional, Sequence

from sqlalchemy.orm import Session

from models import Batch, ClassSession, SessionStudent, StudentBatch, User, UserRole
from schedule_utils import (
    DEFAULT_SCHEDULE_TIMEZONE,
    build_schedule_label,
    infer_weekdays_from_schedule_text,
    parse_weekdays_csv,
    weekdays_to_csv,
)
from schemas import BatchResponse, ClassSessionResponse


def is_admin_user(user: User) -> bool:
    return user.role in (UserRole.admin, "admin")


def apply_schedule_fields_to_batch(
    batch: Batch,
    *,
    schedule_weekdays: Optional[Sequence[int]] = None,
    schedule_time: Optional[str] = None,
    schedule_timezone: Optional[str] = None,
    default_duration_minutes: Optional[int] = None,
    default_meeting_link: Optional[str] = None,
    schedule_text: Optional[str] = None,
) -> None:
    if schedule_weekdays is not None:
        batch.schedule_weekdays = weekdays_to_csv(schedule_weekdays)
    if schedule_time is not None:
        batch.schedule_time = schedule_time.strip() or None
    if schedule_timezone is not None:
        batch.schedule_timezone = schedule_timezone.strip() or DEFAULT_SCHEDULE_TIMEZONE
    if default_duration_minutes is not None:
        batch.default_duration_minutes = default_duration_minutes
    if default_meeting_link is not None:
        batch.default_meeting_link = default_meeting_link.strip() or None

    if not getattr(batch, "schedule_timezone", None):
        batch.schedule_timezone = DEFAULT_SCHEDULE_TIMEZONE

    # Rebuild readable label when structured fields are present
    weekdays = parse_weekdays_csv(batch.schedule_weekdays)
    if not weekdays and batch.schedule:
        weekdays = infer_weekdays_from_schedule_text(batch.schedule)
        if weekdays:
            batch.schedule_weekdays = weekdays_to_csv(weekdays)

    label = build_schedule_label(weekdays, batch.schedule_time, batch.schedule_timezone)
    if label:
        batch.schedule = label
    elif schedule_text is not None:
        batch.schedule = schedule_text.strip() or None


def batch_to_response(batch: Batch, student_count: int, viewer: User) -> BatchResponse:
    admin = is_admin_user(viewer)
    return BatchResponse(
        id=batch.id,
        name=batch.name,
        description=batch.description,
        schedule=batch.schedule,
        schedule_weekdays=batch.schedule_weekdays,
        schedule_time=batch.schedule_time,
        schedule_timezone=getattr(batch, "schedule_timezone", None) or DEFAULT_SCHEDULE_TIMEZONE,
        default_duration_minutes=batch.default_duration_minutes or 60,
        default_meeting_link=batch.default_meeting_link,
        coach_id=batch.coach_id,
        monthly_fee=float(batch.monthly_fee) if admin else None,
        is_active=batch.is_active,
        created_at=batch.created_at,
        student_count=student_count,
    )


def active_batch_student_ids(db: Session, batch_id: int) -> List[int]:
    rows = (
        db.query(StudentBatch.student_id)
        .filter(StudentBatch.batch_id == batch_id, StudentBatch.is_active == True)
        .all()
    )
    return [r[0] for r in rows]


def seed_session_roster(
    db: Session,
    session: ClassSession,
    batch_id: int,
    student_ids: Optional[Iterable[int]] = None,
    *,
    default_expected: bool = True,
) -> None:
    ids = list(student_ids) if student_ids is not None else active_batch_student_ids(db, batch_id)
    for sid in ids:
        db.add(
            SessionStudent(
                class_session_id=session.id,
                student_id=sid,
                expected_to_join=default_expected,
            )
        )


def session_to_response(
    session: ClassSession,
    batch_name: str,
    db: Session,
) -> ClassSessionResponse:
    expected_count = (
        db.query(SessionStudent)
        .filter(
            SessionStudent.class_session_id == session.id,
            SessionStudent.expected_to_join == True,
        )
        .count()
    )
    return ClassSessionResponse(
        id=session.id,
        batch_id=session.batch_id,
        date=session.date,
        duration_minutes=session.duration_minutes,
        topic=session.topic,
        meeting_link=session.meeting_link,
        notes=session.notes,
        session_kind=getattr(session, "session_kind", None) or "regular",
        created_at=session.created_at,
        batch_name=batch_name,
        expected_join_count=expected_count,
    )


def find_session_near_datetime(
    db: Session,
    batch_id: int,
    target,
    *,
    tolerance_minutes: int = 90,
) -> Optional[ClassSession]:
    from datetime import timedelta

    start = target - timedelta(minutes=tolerance_minutes)
    end = target + timedelta(minutes=tolerance_minutes)
    return (
        db.query(ClassSession)
        .filter(
            ClassSession.batch_id == batch_id,
            ClassSession.date >= start,
            ClassSession.date <= end,
        )
        .order_by(ClassSession.date.asc())
        .first()
    )
