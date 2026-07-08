import unittest
from datetime import datetime
from types import SimpleNamespace

from parent_payment_utils import (
    PAYMENT_DEADLINE_DAY,
    compute_billing_status,
    is_billable_enrollment,
    is_join_month,
)


class ParentPaymentUtilsTests(unittest.TestCase):
    def test_join_month_never_overdue(self):
        joined = datetime(2026, 3, 25)
        now = datetime(2026, 3, 31)
        status, due_day, is_join = compute_billing_status(
            has_completed_payment=False,
            billing_month="2026-03",
            joined_at=joined,
            now=now,
        )
        self.assertEqual(status, "pending")
        self.assertIsNone(due_day)
        self.assertTrue(is_join)

    def test_second_month_overdue_after_tenth(self):
        joined = datetime(2026, 3, 25)
        now = datetime(2026, 4, 15)
        status, due_day, is_join = compute_billing_status(
            has_completed_payment=False,
            billing_month="2026-04",
            joined_at=joined,
            now=now,
        )
        self.assertEqual(status, "overdue")
        self.assertEqual(due_day, PAYMENT_DEADLINE_DAY)
        self.assertFalse(is_join)

    def test_second_month_pending_before_tenth(self):
        joined = datetime(2026, 3, 25)
        now = datetime(2026, 4, 5)
        status, due_day, is_join = compute_billing_status(
            has_completed_payment=False,
            billing_month="2026-04",
            joined_at=joined,
            now=now,
        )
        self.assertEqual(status, "pending")
        self.assertEqual(due_day, PAYMENT_DEADLINE_DAY)
        self.assertFalse(is_join)

    def test_is_join_month(self):
        joined = datetime(2026, 6, 2)
        self.assertTrue(is_join_month(joined, "2026-06"))
        self.assertFalse(is_join_month(joined, "2026-07"))

    def test_not_billable_without_coach(self):
        student = SimpleNamespace(primary_coach_id=None)
        sb = SimpleNamespace(is_active=True)
        batch = SimpleNamespace(name="Batch A")
        self.assertFalse(is_billable_enrollment(student, sb, batch))


if __name__ == "__main__":
    unittest.main()
