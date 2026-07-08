import unittest
from unittest.mock import MagicMock

from account_utils import (
    is_student_placeholder_email,
    link_parent_to_guardian_students,
    link_student_to_guardian_parent,
    password_reset_recipient,
    resolve_student_email,
    student_placeholder_email,
)
from models import ParentStudent, User, UserRole


class AccountUtilsTests(unittest.TestCase):
    def test_placeholder_email(self):
        email = student_placeholder_email("Emma_Sharma!")
        self.assertTrue(is_student_placeholder_email(email))
        self.assertIn("emma_sharma", email)

    def test_resolve_student_email_uses_placeholder_when_missing(self):
        self.assertTrue(
            is_student_placeholder_email(resolve_student_email(None, "kid1"))
        )

    def test_password_reset_recipient_student_uses_guardian(self):
        user = User(
            id=1,
            email="kid@students.prodigypawns.internal",
            username="kid1",
            role=UserRole.student,
            guardian_email="parent@example.com",
        )
        self.assertEqual(password_reset_recipient(user), "parent@example.com")

    def test_password_reset_recipient_parent_uses_email(self):
        user = User(
            id=2,
            email="parent@example.com",
            username="parent1",
            role=UserRole.parent,
        )
        self.assertEqual(password_reset_recipient(user), "parent@example.com")

    def test_link_parent_to_guardian_students_creates_link(self):
        db = MagicMock()
        parent = User(id=10, email="Parent@Example.com", role=UserRole.parent)
        student = User(
            id=20,
            email="kid@students.prodigypawns.internal",
            username="kid1",
            role=UserRole.student,
            guardian_email="parent@example.com",
        )

        query = MagicMock()
        db.query.return_value = query
        query.filter.return_value = query
        query.first.return_value = None
        query.all.return_value = [student]

        linked = link_parent_to_guardian_students(parent, db)
        self.assertEqual(len(linked), 1)
        self.assertEqual(linked[0].id, 20)
        db.add.assert_called()
        added = db.add.call_args[0][0]
        self.assertIsInstance(added, ParentStudent)
        self.assertEqual(added.parent_id, 10)
        self.assertEqual(added.student_id, 20)

    def test_link_student_to_guardian_parent_creates_link(self):
        db = MagicMock()
        student = User(
            id=20,
            email="kid@students.prodigypawns.internal",
            username="kid1",
            role=UserRole.student,
            guardian_email="parent@example.com",
        )
        parent = User(id=10, email="parent@example.com", role=UserRole.parent)

        query = MagicMock()
        db.query.return_value = query
        query.filter.return_value = query
        query.first.side_effect = [parent, None]

        result = link_student_to_guardian_parent(student, db)
        self.assertIsNotNone(result)
        self.assertEqual(result.id, 10)
        db.add.assert_called()


if __name__ == "__main__":
    unittest.main()
