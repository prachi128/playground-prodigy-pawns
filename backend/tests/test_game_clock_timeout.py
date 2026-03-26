import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from main import check_clock_flag_timeout


class GameClockTimeoutTests(unittest.TestCase):
    @patch("main.update_ratings_after_game")
    def test_white_flags_on_time_and_black_wins(self, ratings_mock):
        game = SimpleNamespace(
            id=101,
            white_player_id=11,
            black_player_id=22,
            result=None,
            time_control="5+0",
            bot_difficulty=None,
            total_moves=0,
            started_at=datetime.now(timezone.utc) - timedelta(minutes=6),
            last_move_at=None,
            white_time_ms=5 * 60 * 1000,
            black_time_ms=5 * 60 * 1000,
            starting_fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            final_fen=None,
            winner_id=None,
            ended_at=None,
            draw_offered_by=11,
            draw_offered_at=datetime.now(timezone.utc),
            pgn="1. e4 *",
        )
        db = MagicMock()

        check_clock_flag_timeout(game, db)

        self.assertEqual(game.result, "0-1")
        self.assertEqual(game.result_reason, "timeout")
        self.assertEqual(game.winner_id, 22)
        self.assertEqual(game.white_time_ms, 0)
        self.assertIsNone(game.draw_offered_by)
        ratings_mock.assert_called_once()
        self.assertTrue(db.commit.called)

    @patch("main.update_ratings_after_game")
    def test_unlimited_game_never_flags(self, ratings_mock):
        game = SimpleNamespace(
            id=102,
            white_player_id=11,
            black_player_id=22,
            result=None,
            time_control="unlimited",
            bot_difficulty=None,
            total_moves=0,
            started_at=datetime.now(timezone.utc) - timedelta(hours=1),
            last_move_at=None,
            white_time_ms=None,
            black_time_ms=None,
            starting_fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            final_fen=None,
            winner_id=None,
            ended_at=None,
            draw_offered_by=None,
            draw_offered_at=None,
            pgn=None,
        )
        db = MagicMock()

        check_clock_flag_timeout(game, db)

        self.assertIsNone(game.result)
        ratings_mock.assert_not_called()
        self.assertFalse(db.commit.called)


if __name__ == "__main__":
    unittest.main()
