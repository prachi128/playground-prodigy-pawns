"""Shared helpers for student/parent account provisioning and linking."""

from __future__ import annotations

import re
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from end_game_between_users import level_from_rating
from models import ParentStudent, User, UserRole

STUDENT_PLACEHOLDER_DOMAIN = "@students.prodigypawns.internal"


def is_student_placeholder_email(email: Optional[str]) -> bool:
    if not email:
        return False
    return email.lower().endswith(STUDENT_PLACEHOLDER_DOMAIN.lower())


def student_placeholder_email(username: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9._-]", "_", username.strip().lower()) or "student"
    return f"{safe}{STUDENT_PLACEHOLDER_DOMAIN}"


def resolve_student_email(email: Optional[str], username: str) -> str:
    if email and email.strip():
        return email.strip().lower()
    return student_placeholder_email(username)


def password_reset_recipient(user: User) -> Optional[str]:
    """Email address to receive password-reset links for this user."""
    if user.role == UserRole.student:
        if user.guardian_email:
            return user.guardian_email.strip().lower()
        if user.email and not is_student_placeholder_email(user.email):
            return user.email.strip().lower()
        return None
    if user.email and not is_student_placeholder_email(user.email):
        return user.email.strip().lower()
    return None


def ensure_parent_student_link(parent_id: int, student_id: int, db: Session) -> bool:
    """Create ParentStudent link if missing. Returns True if a new link was added."""
    exists = (
        db.query(ParentStudent)
        .filter(
            ParentStudent.parent_id == parent_id,
            ParentStudent.student_id == student_id,
        )
        .first()
    )
    if exists:
        return False
    db.add(ParentStudent(parent_id=parent_id, student_id=student_id))
    db.flush()
    return True


def link_parent_to_guardian_students(parent: User, db: Session) -> List[User]:
    """Link parent to all students whose guardian_email matches the parent's email."""
    if parent.role not in (UserRole.parent, "parent"):
        return []
    parent_email = parent.email.strip().lower()
    students = (
        db.query(User)
        .filter(
            User.role == UserRole.student,
            User.guardian_email.isnot(None),
            func.lower(User.guardian_email) == parent_email,
        )
        .all()
    )
    linked: List[User] = []
    for student in students:
        if ensure_parent_student_link(parent.id, student.id, db):
            linked.append(student)
    return linked


def link_student_to_guardian_parent(student: User, db: Session) -> Optional[User]:
    """If a parent account exists for this student's guardian_email, link them."""
    if not student.guardian_email:
        return None
    guardian = student.guardian_email.strip().lower()
    parent = (
        db.query(User)
        .filter(
            User.role == UserRole.parent,
            func.lower(User.email) == guardian,
        )
        .first()
    )
    if not parent:
        return None
    ensure_parent_student_link(parent.id, student.id, db)
    return parent


def create_student_user(
    db: Session,
    *,
    username: str,
    full_name: str,
    password_hash: str,
    email: Optional[str] = None,
    guardian_email: Optional[str] = None,
    age: Optional[int] = None,
    gender: Optional[str] = None,
    avatar_url: str = "/avatars/default.png",
    primary_coach_id: Optional[int] = None,
) -> User:
    username = username.strip()
    resolved_email = resolve_student_email(email, username)
    if db.query(User).filter(User.email == resolved_email).first():
        raise ValueError("Email already registered")
    if db.query(User).filter(func.lower(User.username) == username.lower()).first():
        raise ValueError("Username already taken")

    guardian = guardian_email.strip().lower() if guardian_email else None
    student = User(
        email=resolved_email,
        username=username,
        full_name=full_name.strip(),
        hashed_password=password_hash,
        role=UserRole.student,
        age=age,
        gender=gender,
        avatar_url=avatar_url or "/avatars/default.png",
        guardian_email=guardian,
        primary_coach_id=primary_coach_id,
    )
    student.level = level_from_rating(student.rating or 100)
    db.add(student)
    db.flush()
    link_student_to_guardian_parent(student, db)
    return student
