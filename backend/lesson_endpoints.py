from collections import defaultdict
from datetime import datetime
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import (
    Lesson,
    LessonLevel,
    StudentLessonAccess,
    StudentLessonCompletion,
    User,
    UserRole,
)
from schemas import (
    LessonAccessCreate,
    LessonCreate,
    LessonDetailResponse,
    LessonListResponse,
    LessonReorderRequest,
    LessonUpdate,
)
from student_management_backend import _coach_can_access_student, _coach_roster_student_ids, _is_admin


coach_router = APIRouter(prefix="/api/coach", tags=["lessons"])
student_router = APIRouter(prefix="/api/lessons", tags=["lessons"])


def require_coach(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in (UserRole.coach, UserRole.admin, "coach", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Coach access required")
    return user


def require_student(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in (UserRole.student, "student"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    return user


def require_admin_coach(coach: User = Depends(require_coach)) -> User:
    if not _is_admin(coach):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin coach access required")
    return coach


def _slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug or "lesson"


def _ensure_unique_slug(db: Session, base_slug: str, lesson_id: Optional[int] = None) -> str:
    slug = base_slug
    counter = 2
    while True:
        query = db.query(Lesson).filter(Lesson.slug == slug)
        if lesson_id is not None:
            query = query.filter(Lesson.id != lesson_id)
        if not query.first():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


def _serialize_level(value: LessonLevel | str) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _lesson_list_row(lesson: Lesson, access_count: int = 0, completion_count: int = 0) -> LessonListResponse:
    return LessonListResponse(
        id=lesson.id,
        title=lesson.title,
        slug=lesson.slug,
        summary=lesson.summary,
        level=_serialize_level(lesson.level),
        is_published=lesson.is_published,
        sort_order=lesson.sort_order,
        video_url=lesson.video_url,
        cover_image_url=lesson.cover_image_url,
        created_by=lesson.created_by,
        created_at=lesson.created_at,
        updated_at=lesson.updated_at,
        access_count=access_count,
        completion_count=completion_count,
    )


@coach_router.get("/lessons", response_model=list[LessonListResponse])
def list_lessons_for_coaches(
    include_unpublished: bool = True,
    level: Optional[str] = None,
    search: Optional[str] = None,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    query = db.query(Lesson)
    if not include_unpublished and not _is_admin(coach):
        query = query.filter(Lesson.is_published == True)
    if level:
        query = query.filter(Lesson.level == LessonLevel(level))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Lesson.title.ilike(term)) | (Lesson.summary.ilike(term)) | (Lesson.content.ilike(term))
        )
    lessons = query.order_by(Lesson.sort_order.asc(), Lesson.created_at.desc()).all()
    if not lessons:
        return []

    lesson_ids = [lesson.id for lesson in lessons]
    access_rows = (
        db.query(StudentLessonAccess.lesson_id, func.count(StudentLessonAccess.id))
        .filter(StudentLessonAccess.lesson_id.in_(lesson_ids), StudentLessonAccess.is_active == True)
        .group_by(StudentLessonAccess.lesson_id)
        .all()
    )
    completion_rows = (
        db.query(StudentLessonCompletion.lesson_id, func.count(StudentLessonCompletion.id))
        .filter(StudentLessonCompletion.lesson_id.in_(lesson_ids))
        .group_by(StudentLessonCompletion.lesson_id)
        .all()
    )
    access_map = {lesson_id: count for lesson_id, count in access_rows}
    completion_map = {lesson_id: count for lesson_id, count in completion_rows}

    return [
        _lesson_list_row(
            lesson,
            access_count=access_map.get(lesson.id, 0),
            completion_count=completion_map.get(lesson.id, 0),
        )
        for lesson in lessons
        if _is_admin(coach) or lesson.is_published
    ]


@coach_router.post("/lessons", response_model=LessonDetailResponse, status_code=status.HTTP_201_CREATED)
def create_lesson(
    payload: LessonCreate,
    coach: User = Depends(require_admin_coach),
    db: Session = Depends(get_db),
):
    slug = _ensure_unique_slug(db, _slugify(payload.title))
    max_sort = db.query(func.max(Lesson.sort_order)).scalar()
    lesson = Lesson(
        title=payload.title.strip(),
        slug=slug,
        summary=payload.summary.strip() if payload.summary else None,
        content=payload.content.strip(),
        video_url=payload.video_url.strip() if payload.video_url else None,
        cover_image_url=payload.cover_image_url.strip() if payload.cover_image_url else None,
        level=LessonLevel(payload.level),
        is_published=payload.is_published,
        sort_order=(max_sort or 0) + 1,
        created_by=coach.id,
        updated_at=datetime.utcnow(),
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return LessonDetailResponse(**_lesson_list_row(lesson).model_dump(), content=lesson.content)


@coach_router.get("/lessons/{lesson_id}", response_model=LessonDetailResponse)
def get_lesson_for_coach(
    lesson_id: int,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson or (not _is_admin(coach) and not lesson.is_published):
        raise HTTPException(status_code=404, detail="Lesson not found")

    access_count = (
        db.query(func.count(StudentLessonAccess.id))
        .filter(StudentLessonAccess.lesson_id == lesson.id, StudentLessonAccess.is_active == True)
        .scalar()
        or 0
    )
    completion_count = (
        db.query(func.count(StudentLessonCompletion.id))
        .filter(StudentLessonCompletion.lesson_id == lesson.id)
        .scalar()
        or 0
    )
    return LessonDetailResponse(
        **_lesson_list_row(lesson, access_count=access_count, completion_count=completion_count).model_dump(),
        content=lesson.content,
    )


@coach_router.put("/lessons/{lesson_id}", response_model=LessonDetailResponse)
def update_lesson(
    lesson_id: int,
    payload: LessonUpdate,
    coach: User = Depends(require_admin_coach),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    if payload.title is not None:
        lesson.title = payload.title.strip()
        lesson.slug = _ensure_unique_slug(db, _slugify(lesson.title), lesson.id)
    if payload.summary is not None:
        lesson.summary = payload.summary.strip() or None
    if payload.content is not None:
        lesson.content = payload.content.strip()
    if payload.video_url is not None:
        lesson.video_url = payload.video_url.strip() or None
    if payload.cover_image_url is not None:
        lesson.cover_image_url = payload.cover_image_url.strip() or None
    if payload.level is not None:
        lesson.level = LessonLevel(payload.level)
    if payload.is_published is not None:
        lesson.is_published = payload.is_published
    lesson.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(lesson)
    return LessonDetailResponse(**_lesson_list_row(lesson).model_dump(), content=lesson.content)


@coach_router.post("/lessons/reorder")
def reorder_lessons(
    payload: LessonReorderRequest,
    coach: User = Depends(require_admin_coach),
    db: Session = Depends(get_db),
):
    lessons = db.query(Lesson).filter(Lesson.id.in_(payload.lesson_ids)).all()
    lesson_map = {lesson.id: lesson for lesson in lessons}
    if len(lesson_map) != len(payload.lesson_ids):
        raise HTTPException(status_code=400, detail="One or more lesson IDs are invalid")
    for idx, lesson_id in enumerate(payload.lesson_ids, start=1):
        lesson_map[lesson_id].sort_order = idx
        lesson_map[lesson_id].updated_at = datetime.utcnow()
    db.commit()
    return {"success": True}


@coach_router.post("/lessons/{lesson_id}/open-for-student")
def open_lesson_for_student(
    lesson_id: int,
    payload: LessonAccessCreate,
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id, Lesson.is_published == True).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Published lesson not found")
    if not _coach_can_access_student(coach, db, payload.student_id):
        raise HTTPException(status_code=403, detail="You cannot open lessons for this student")

    student = db.query(User).filter(User.id == payload.student_id, User.role == UserRole.student).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    access = (
        db.query(StudentLessonAccess)
        .filter(StudentLessonAccess.lesson_id == lesson_id, StudentLessonAccess.student_id == payload.student_id)
        .first()
    )
    if access:
        access.is_active = True
        access.opened_by_coach_id = coach.id
        access.opened_at = datetime.utcnow()
    else:
        access = StudentLessonAccess(
            lesson_id=lesson_id,
            student_id=payload.student_id,
            opened_by_coach_id=coach.id,
            is_active=True,
        )
        db.add(access)
    db.commit()
    return {"success": True, "student_id": payload.student_id, "lesson_id": lesson_id}


@coach_router.get("/lesson-students")
def list_students_for_lesson_assignment(
    coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
):
    roster = _coach_roster_student_ids(coach, db)
    query = db.query(User).filter(User.role == UserRole.student, User.is_active == True)
    if roster is not None:
        if not roster:
            return []
        query = query.filter(User.id.in_(roster))
    students = query.order_by(User.full_name.asc(), User.username.asc()).all()
    return [
        {
            "id": student.id,
            "full_name": student.full_name,
            "username": student.username,
            "level": student.level,
            "rating": student.rating,
        }
        for student in students
    ]


@student_router.get("/my-lessons", response_model=list[LessonListResponse])
def list_my_lessons(
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Lesson, StudentLessonAccess, StudentLessonCompletion)
        .join(
            StudentLessonAccess,
            (StudentLessonAccess.lesson_id == Lesson.id)
            & (StudentLessonAccess.student_id == student.id)
            & (StudentLessonAccess.is_active == True),
        )
        .outerjoin(
            StudentLessonCompletion,
            (StudentLessonCompletion.lesson_id == Lesson.id)
            & (StudentLessonCompletion.student_id == student.id),
        )
        .filter(Lesson.is_published == True)
        .order_by(Lesson.sort_order.asc(), StudentLessonAccess.opened_at.desc())
        .all()
    )
    return [
        LessonListResponse(
            id=lesson.id,
            title=lesson.title,
            slug=lesson.slug,
            summary=lesson.summary,
            level=_serialize_level(lesson.level),
            is_published=lesson.is_published,
            sort_order=lesson.sort_order,
            video_url=lesson.video_url,
            cover_image_url=lesson.cover_image_url,
            created_by=lesson.created_by,
            created_at=lesson.created_at,
            updated_at=lesson.updated_at,
            student_has_access=True,
            student_completed=completion is not None,
            opened_at=access.opened_at,
            completed_at=completion.completed_at if completion else None,
        )
        for lesson, access, completion in rows
    ]


@student_router.get("/{lesson_id}", response_model=LessonDetailResponse)
def get_my_lesson_detail(
    lesson_id: int,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Lesson, StudentLessonAccess, StudentLessonCompletion)
        .join(
            StudentLessonAccess,
            (StudentLessonAccess.lesson_id == Lesson.id)
            & (StudentLessonAccess.student_id == student.id)
            & (StudentLessonAccess.is_active == True),
        )
        .outerjoin(
            StudentLessonCompletion,
            (StudentLessonCompletion.lesson_id == Lesson.id)
            & (StudentLessonCompletion.student_id == student.id),
        )
        .filter(Lesson.id == lesson_id, Lesson.is_published == True)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Lesson not found")
    lesson, access, completion = row
    return LessonDetailResponse(
        id=lesson.id,
        title=lesson.title,
        slug=lesson.slug,
        summary=lesson.summary,
        content=lesson.content,
        level=_serialize_level(lesson.level),
        is_published=lesson.is_published,
        sort_order=lesson.sort_order,
        video_url=lesson.video_url,
        cover_image_url=lesson.cover_image_url,
        created_by=lesson.created_by,
        created_at=lesson.created_at,
        updated_at=lesson.updated_at,
        student_has_access=True,
        student_completed=completion is not None,
        opened_at=access.opened_at,
        completed_at=completion.completed_at if completion else None,
    )


@student_router.post("/{lesson_id}/complete")
def complete_lesson(
    lesson_id: int,
    student: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    access = (
        db.query(StudentLessonAccess)
        .filter(
            StudentLessonAccess.lesson_id == lesson_id,
            StudentLessonAccess.student_id == student.id,
            StudentLessonAccess.is_active == True,
        )
        .first()
    )
    if not access:
        raise HTTPException(status_code=404, detail="Lesson not found")

    completion = (
        db.query(StudentLessonCompletion)
        .filter(StudentLessonCompletion.lesson_id == lesson_id, StudentLessonCompletion.student_id == student.id)
        .first()
    )
    if completion:
        return {"success": True, "already_completed": True, "completed_at": completion.completed_at}

    completion = StudentLessonCompletion(lesson_id=lesson_id, student_id=student.id)
    db.add(completion)
    db.commit()
    db.refresh(completion)
    return {"success": True, "already_completed": False, "completed_at": completion.completed_at}
