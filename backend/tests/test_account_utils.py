import unittest

from account_utils import (
    is_student_placeholder_email,
    password_reset_recipient,
    resolve_student_email,
    student_placeholder_email,
)
from models import User, UserRole


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


if __name__ == "__main__":
    unittest.main()
