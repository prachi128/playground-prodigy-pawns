import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi import HTTPException

from main import create_game_invite
from schemas import GameInviteCreate


class GameInviteCreateValidationTests(unittest.TestCase):
    def _make_query(self, first_result):
        q = MagicMock()
        q.filter.return_value = q
        q.first.return_value = first_result
        return q

    def test_create_invite_rejects_missing_user(self):
        db = MagicMock()
        db.query.side_effect = [self._make_query(None)]

        with self.assertRaises(HTTPException) as ctx:
            create_game_invite(
                invite_data=GameInviteCreate(invitee_id=999, time_control="10+0"),
                current_user_id=1,
                db=db,
            )

        self.assertEqual(ctx.exception.status_code, 404)
        self.assertIn("User not found", str(ctx.exception.detail))

    def test_create_invite_rejects_non_student_or_coach_invitee(self):
        invitee = SimpleNamespace(id=2, role="parent")
        db = MagicMock()
        db.query.side_effect = [self._make_query(invitee)]

        with self.assertRaises(HTTPException) as ctx:
            create_game_invite(
                invite_data=GameInviteCreate(invitee_id=2, time_control="10+0"),
                current_user_id=1,
                db=db,
            )

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Can only invite students or coaches", str(ctx.exception.detail))

    def test_create_invite_rejects_self_invite(self):
        invitee = SimpleNamespace(id=7, role="student")
        db = MagicMock()
        db.query.side_effect = [self._make_query(invitee)]

        with self.assertRaises(HTTPException) as ctx:
            create_game_invite(
                invite_data=GameInviteCreate(invitee_id=7, time_control="unlimited"),
                current_user_id=7,
                db=db,
            )

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Cannot invite yourself", str(ctx.exception.detail))

    def test_create_invite_rejects_duplicate_pending_invite(self):
        invitee = SimpleNamespace(id=9, role="student")
        existing = SimpleNamespace(id=55, inviter_id=1, invitee_id=9, status="pending")
        db = MagicMock()
        db.query.side_effect = [self._make_query(invitee), self._make_query(existing)]

        with self.assertRaises(HTTPException) as ctx:
            create_game_invite(
                invite_data=GameInviteCreate(invitee_id=9, time_control="5+0"),
                current_user_id=1,
                db=db,
            )

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("already have a pending invite", str(ctx.exception.detail))


if __name__ == "__main__":
    unittest.main()
