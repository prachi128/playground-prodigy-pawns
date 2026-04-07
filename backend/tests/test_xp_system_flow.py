import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from main import HintRequest, PuzzleAttemptCreate, get_hint, submit_puzzle_attempt


class XPSystemFlowTests(unittest.TestCase):
    def _db_for_attempt(self, user_obj, puzzle_obj):
        user_q = MagicMock()
        user_q.filter.return_value = user_q
        user_q.first.return_value = user_obj

        puzzle_q = MagicMock()
        puzzle_q.filter.return_value = puzzle_q
        puzzle_q.first.return_value = puzzle_obj

        db = MagicMock()
        db.query.side_effect = [user_q, puzzle_q]
        return db

    @patch("main.create_notification")
    def test_submit_puzzle_awards_xp_minus_hint_penalty_with_min_floor(self, _notif_mock):
        user = SimpleNamespace(id=7, total_xp=20)
        puzzle = SimpleNamespace(
            id=11,
            fen="r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
            moves="Nxe5 Nxe5",
            xp_reward=10,
            success_count=0,
            attempts_count=0,
        )
        db = self._db_for_attempt(user, puzzle)

        attempt = PuzzleAttemptCreate(
            puzzle_id=11,
            is_solved=True,
            moves_made="f3e5 c6e5",
            time_taken=35,
            hints_used=4,  # 10 - 8 => 2, but floor should keep 5
        )

        result = submit_puzzle_attempt(puzzle_id=11, attempt=attempt, user_id=7, assignment_id=None, db=db)

        self.assertEqual(result.xp_earned, 5)
        self.assertEqual(user.total_xp, 25)
        self.assertEqual(puzzle.success_count, 1)
        self.assertEqual(puzzle.attempts_count, 1)
        db.commit.assert_called_once()

    def test_submit_unsolved_puzzle_does_not_award_xp(self):
        user = SimpleNamespace(id=7, total_xp=20)
        puzzle = SimpleNamespace(
            id=11,
            fen="r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
            moves="Nxe5 Nxe5",
            xp_reward=25,
            success_count=0,
            attempts_count=0,
        )
        db = self._db_for_attempt(user, puzzle)

        attempt = PuzzleAttemptCreate(
            puzzle_id=11,
            is_solved=False,
            moves_made="e2e4 e7e5 g1f3",
            time_taken=60,
            hints_used=2,
        )

        result = submit_puzzle_attempt(puzzle_id=11, attempt=attempt, user_id=7, assignment_id=None, db=db)

        self.assertEqual(result.xp_earned, 0)
        self.assertEqual(user.total_xp, 20)
        self.assertEqual(puzzle.success_count, 0)
        self.assertEqual(puzzle.attempts_count, 1)

    @patch("main.create_notification")
    def test_submit_puzzle_accepts_uci_attempt_for_san_solution(self, _notif_mock):
        user = SimpleNamespace(id=7, total_xp=20)
        puzzle = SimpleNamespace(
            id=12,
            fen="6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
            moves="Re8#",
            xp_reward=15,
            success_count=0,
            attempts_count=0,
        )
        db = self._db_for_attempt(user, puzzle)

        attempt = PuzzleAttemptCreate(
            puzzle_id=12,
            is_solved=False,
            moves_made="e1e8",
            time_taken=12,
            hints_used=0,
        )

        result = submit_puzzle_attempt(puzzle_id=12, attempt=attempt, user_id=7, assignment_id=None, db=db)

        self.assertTrue(result.is_solved)
        self.assertEqual(result.xp_earned, 15)
        self.assertEqual(user.total_xp, 35)

    def test_submit_puzzle_rejects_incorrect_attempt_even_if_client_claims_solved(self):
        user = SimpleNamespace(id=7, total_xp=20)
        puzzle = SimpleNamespace(
            id=12,
            fen="6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
            moves="Re8#",
            xp_reward=15,
            success_count=0,
            attempts_count=0,
        )
        db = self._db_for_attempt(user, puzzle)

        attempt = PuzzleAttemptCreate(
            puzzle_id=12,
            is_solved=True,
            moves_made="g1h1",
            time_taken=12,
            hints_used=0,
        )

        result = submit_puzzle_attempt(puzzle_id=12, attempt=attempt, user_id=7, assignment_id=None, db=db)

        self.assertFalse(result.is_solved)
        self.assertEqual(result.xp_earned, 0)
        self.assertEqual(user.total_xp, 20)

    @patch("main.get_hint_service")
    def test_get_hint_deducts_xp_when_balance_is_sufficient(self, hint_service_mock):
        user = SimpleNamespace(id=9, total_xp=25)
        user_q = MagicMock()
        user_q.filter.return_value = user_q
        user_q.first.return_value = user

        db = MagicMock()
        db.query.return_value = user_q

        hint_service_mock.return_value.get_hint.return_value = {
            "success": True,
            "hint_level": 2,
            "hint_text": "Look at checks first.",
            "xp_cost": 4,
        }

        payload = HintRequest(
            fen="8/8/8/8/8/8/8/8 w - - 0 1",
            hint_level=2,
            puzzle_id=3,
        )
        response = get_hint(puzzle_id=3, request=payload, user_id=9, db=db)

        self.assertEqual(response["xp_cost"], 4)
        self.assertEqual(response["remaining_xp"], 21)
        self.assertEqual(user.total_xp, 21)
        db.commit.assert_called_once()

    @patch("main.get_hint_service")
    def test_get_hint_rejects_when_balance_is_insufficient(self, hint_service_mock):
        user = SimpleNamespace(id=9, total_xp=3)
        user_q = MagicMock()
        user_q.filter.return_value = user_q
        user_q.first.return_value = user

        db = MagicMock()
        db.query.return_value = user_q

        hint_service_mock.return_value.get_hint.return_value = {
            "success": True,
            "hint_level": 2,
            "hint_text": "Look at checks first.",
            "xp_cost": 4,
        }

        payload = HintRequest(
            fen="8/8/8/8/8/8/8/8 w - - 0 1",
            hint_level=2,
            puzzle_id=3,
        )

        with self.assertRaises(HTTPException) as ctx:
            get_hint(puzzle_id=3, request=payload, user_id=9, db=db)

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Not enough XP", ctx.exception.detail)
        self.assertEqual(user.total_xp, 3)


if __name__ == "__main__":
    unittest.main()
