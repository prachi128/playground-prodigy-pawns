import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from main import accept_game_invite


class GameInviteTimeControlTests(unittest.TestCase):
    def _build_db_for_accept(self, invite_obj):
        db = MagicMock()
        q_invite = MagicMock()
        q_invite.filter.return_value = q_invite
        q_invite.first.return_value = invite_obj

        q_user = MagicMock()
        q_user.filter.return_value = q_user
        q_user.first.return_value = SimpleNamespace(full_name="Student B")

        db.query.side_effect = [q_invite, q_user]
        return db

    @patch("main.create_notification")
    def test_accept_invite_uses_selected_time_control(self, _notify_mock):
        invite = SimpleNamespace(
            id=101,
            inviter_id=11,
            invitee_id=22,
            status="pending",
            game_id=None,
            responded_at=None,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            time_control="5+0",
        )
        db = self._build_db_for_accept(invite)

        created_game = accept_game_invite(invite_id=101, current_user_id=22, db=db)

        added_game = db.add.call_args.args[0]
        self.assertEqual(added_game.time_control, "5+0")
        self.assertEqual(invite.status, "accepted")
        self.assertIsNotNone(invite.responded_at)
        self.assertEqual(created_game, added_game)

    @patch("main.create_notification")
    def test_accept_invite_falls_back_to_unlimited_when_missing(self, _notify_mock):
        invite = SimpleNamespace(
            id=202,
            inviter_id=11,
            invitee_id=22,
            status="pending",
            game_id=None,
            responded_at=None,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            time_control=None,
        )
        db = self._build_db_for_accept(invite)

        accept_game_invite(invite_id=202, current_user_id=22, db=db)

        added_game = db.add.call_args.args[0]
        self.assertEqual(added_game.time_control, "unlimited")

    @patch("main.create_notification")
    def test_accept_invite_handles_naive_expires_at_without_type_error(self, _notify_mock):
        invite = SimpleNamespace(
            id=250,
            inviter_id=11,
            invitee_id=22,
            status="pending",
            game_id=None,
            responded_at=None,
            # Naive datetime to mirror common DB values in this codebase.
            expires_at=datetime.now() + timedelta(hours=1),
            time_control="10+0",
        )
        db = self._build_db_for_accept(invite)

        created_game = accept_game_invite(invite_id=250, current_user_id=22, db=db)

        self.assertIsNotNone(created_game)

    def test_accept_invite_rejects_non_invitee_user(self):
        invite = SimpleNamespace(
            id=303,
            inviter_id=11,
            invitee_id=22,
            status="pending",
            game_id=None,
            responded_at=None,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            time_control="10+0",
        )
        db = MagicMock()
        q_invite = MagicMock()
        q_invite.filter.return_value = q_invite
        q_invite.first.return_value = invite
        db.query.return_value = q_invite

        with self.assertRaises(HTTPException) as ctx:
            accept_game_invite(invite_id=303, current_user_id=99, db=db)

        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("only accept invites sent to you", str(ctx.exception.detail))

    def test_accept_invite_marks_expired_and_raises(self):
        invite = SimpleNamespace(
            id=404,
            inviter_id=11,
            invitee_id=22,
            status="pending",
            game_id=None,
            responded_at=None,
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
            time_control="10+0",
        )
        db = MagicMock()
        q_invite = MagicMock()
        q_invite.filter.return_value = q_invite
        q_invite.first.return_value = invite
        db.query.return_value = q_invite

        with self.assertRaises(HTTPException) as ctx:
            accept_game_invite(invite_id=404, current_user_id=22, db=db)

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(invite.status, "expired")
        self.assertTrue(db.commit.called)


if __name__ == "__main__":
    unittest.main()
