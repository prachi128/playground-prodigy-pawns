import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from main import draw_game
from main import reject_draw_offer


class GameDrawFlowTests(unittest.TestCase):
    def _db_with_game(self, game_obj):
        q = MagicMock()
        q.filter.return_value = q
        q.first.return_value = game_obj
        db = MagicMock()
        db.query.return_value = q
        return db

    @patch("main.update_ratings_after_game")
    def test_offer_draw_sets_offer_fields_without_ending_game(self, ratings_mock):
        game = SimpleNamespace(
            id=1,
            white_player_id=11,
            black_player_id=22,
            result=None,
            draw_offered_by=None,
            draw_offered_at=None,
            pgn="1. e4 e5 *",
        )
        db = self._db_with_game(game)

        updated = draw_game(game_id=1, current_user_id=11, db=db)

        self.assertEqual(updated.draw_offered_by, 11)
        self.assertIsNotNone(updated.draw_offered_at)
        self.assertIsNone(updated.result)
        ratings_mock.assert_not_called()

    @patch("main.update_ratings_after_game")
    def test_accept_opponent_draw_ends_game_as_draw(self, ratings_mock):
        game = SimpleNamespace(
            id=2,
            white_player_id=11,
            black_player_id=22,
            result=None,
            draw_offered_by=11,
            draw_offered_at=datetime.now(timezone.utc),
            winner_id=11,
            ended_at=None,
            result_reason=None,
            pgn="1. d4 d5 *",
        )
        db = self._db_with_game(game)

        updated = draw_game(game_id=2, current_user_id=22, db=db)

        self.assertEqual(updated.result, "1/2-1/2")
        self.assertEqual(updated.result_reason, "draw")
        self.assertIsNone(updated.winner_id)
        self.assertIsNotNone(updated.ended_at)
        self.assertIsNone(updated.draw_offered_by)
        ratings_mock.assert_called_once()

    def test_draw_by_non_participant_raises_403(self):
        game = SimpleNamespace(
            id=3,
            white_player_id=11,
            black_player_id=22,
            result=None,
            draw_offered_by=None,
            draw_offered_at=None,
            pgn=None,
        )
        db = self._db_with_game(game)

        with self.assertRaises(HTTPException) as ctx:
            draw_game(game_id=3, current_user_id=99, db=db)

        self.assertEqual(ctx.exception.status_code, 403)

    def test_draw_on_finished_game_raises_400(self):
        game = SimpleNamespace(
            id=4,
            white_player_id=11,
            black_player_id=22,
            result="1-0",
            draw_offered_by=None,
            draw_offered_at=None,
            pgn="1. f4 e5 1-0",
        )
        db = self._db_with_game(game)

        with self.assertRaises(HTTPException) as ctx:
            draw_game(game_id=4, current_user_id=11, db=db)

        self.assertEqual(ctx.exception.status_code, 400)

    def test_reject_opponent_draw_offer_clears_offer_fields(self):
        game = SimpleNamespace(
            id=5,
            white_player_id=11,
            black_player_id=22,
            result=None,
            draw_offered_by=11,
            draw_offered_at=datetime.now(timezone.utc),
        )
        db = self._db_with_game(game)

        updated = reject_draw_offer(game_id=5, current_user_id=22, db=db)

        self.assertIsNone(updated.draw_offered_by)
        self.assertIsNone(updated.draw_offered_at)
        self.assertIsNone(updated.result)

    def test_reject_own_draw_offer_raises_400(self):
        game = SimpleNamespace(
            id=6,
            white_player_id=11,
            black_player_id=22,
            result=None,
            draw_offered_by=11,
            draw_offered_at=datetime.now(timezone.utc),
        )
        db = self._db_with_game(game)

        with self.assertRaises(HTTPException) as ctx:
            reject_draw_offer(game_id=6, current_user_id=11, db=db)

        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
