import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from main import accept_game_invite, reject_game_invite


class GameInviteLifecycleTests(unittest.TestCase):
    @patch("main.create_notification")
    def test_reject_invite_marks_rejected_and_returns_message(self, _notify_mock):
        invite = SimpleNamespace(
            id=501,
            inviter_id=11,
            invitee_id=22,
            status="pending",
            responded_at=None,
        )
        invite_query = MagicMock()
        invite_query.filter.return_value = invite_query
        invite_query.first.return_value = invite

        user_query = MagicMock()
        user_query.filter.return_value = user_query
        user_query.first.return_value = SimpleNamespace(full_name="Student B")

        db = MagicMock()
        db.query.side_effect = [invite_query, user_query]

        result = reject_game_invite(invite_id=501, current_user_id=22, db=db)

        self.assertEqual(result.get("message"), "Invite rejected")
        self.assertEqual(invite.status, "rejected")
        self.assertIsNotNone(invite.responded_at)
        self.assertTrue(db.commit.called)

    def test_reject_invite_wrong_user_raises_403(self):
        invite = SimpleNamespace(
            id=502,
            inviter_id=11,
            invitee_id=22,
            status="pending",
            responded_at=None,
        )
        invite_query = MagicMock()
        invite_query.filter.return_value = invite_query
        invite_query.first.return_value = invite

        db = MagicMock()
        db.query.return_value = invite_query

        with self.assertRaises(HTTPException) as ctx:
            reject_game_invite(invite_id=502, current_user_id=99, db=db)

        self.assertEqual(ctx.exception.status_code, 403)

    def test_accept_invite_already_responded_raises_400(self):
        invite = SimpleNamespace(
            id=503,
            inviter_id=11,
            invitee_id=22,
            status="accepted",
            game_id=701,
            responded_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            time_control="10+0",
        )
        invite_query = MagicMock()
        invite_query.filter.return_value = invite_query
        invite_query.first.return_value = invite

        db = MagicMock()
        db.query.return_value = invite_query

        with self.assertRaises(HTTPException) as ctx:
            accept_game_invite(invite_id=503, current_user_id=22, db=db)

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("already been responded to", str(ctx.exception.detail))

    def test_accept_invite_not_found_raises_404(self):
        invite_query = MagicMock()
        invite_query.filter.return_value = invite_query
        invite_query.first.return_value = None

        db = MagicMock()
        db.query.return_value = invite_query

        with self.assertRaises(HTTPException) as ctx:
            accept_game_invite(invite_id=999, current_user_id=22, db=db)

        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
