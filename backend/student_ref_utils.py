"""Resolve a coach API student path segment (numeric id or username)."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import User, UserRole


def resolve_student_user(ref: str, db: Session) -> User:
    key = (ref or "").strip()
    if not key:
        raise HTTPException(status_code=404, detail="Student not found")

    if key.isdigit():
        student = (
            db.query(User)
            .filter(User.id == int(key), User.role == UserRole.student)
            .first()
        )
    else:
        student = (
            db.query(User)
            .filter(User.username == key, User.role == UserRole.student)
            .first()
        )

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student
