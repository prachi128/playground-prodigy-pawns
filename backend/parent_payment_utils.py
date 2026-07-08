"""Parent-facing batch payment rules (deadline, join-month grace, billability)."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional, Tuple

PAYMENT_DEADLINE_DAY = 10


def billing_month(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def is_billable_enrollment(student: Any, sb: Any, batch: Any) -> bool:
    """Parent sees payment info only when the child has a coach and an active batch."""
    if student is None or sb is None or batch is None:
        return False
    if not getattr(sb, "is_active", False):
        return False
    if getattr(student, "primary_coach_id", None) is None:
        return False
    return True


def is_join_month(joined_at: datetime, billing_month: str) -> bool:
    return billing_month == billing_month_key(joined_at)


def billing_month_key(joined_at: datetime) -> str:
    return joined_at.strftime("%Y-%m")


def is_past_deadline_for_month(billing_month: str, now: datetime) -> bool:
    year, month = (int(part) for part in billing_month.split("-"))
    return now.date() > date(year, month, PAYMENT_DEADLINE_DAY)


def compute_billing_status(
    *,
    has_completed_payment: bool,
    billing_month: str,
    joined_at: datetime,
    now: datetime,
) -> Tuple[str, Optional[int], bool]:
    """
    Returns (payment_status, payment_due_day, is_join_month).
    Join month: always pending until paid, never overdue; no fixed due day.
    Later months: due on the 10th; overdue after that if unpaid.
    """
    join_month = is_join_month(joined_at, billing_month)
    if has_completed_payment:
        return "paid", PAYMENT_DEADLINE_DAY if not join_month else None, join_month
    if join_month:
        return "pending", None, True
    due_day = PAYMENT_DEADLINE_DAY
    if is_past_deadline_for_month(billing_month, now):
        return "overdue", due_day, False
    return "pending", due_day, False
