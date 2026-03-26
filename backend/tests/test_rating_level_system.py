import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from main import level_from_rating, update_ratings_after_game


class RatingLevelSystemTests(unittest.TestCase):
    def _db_for_users(self, white_user, black_user):
        white_q = MagicMock()
        white_q.filter.return_value = white_q
        white_q.first.return_value = white_user

        black_q = MagicMock()
        black_q.filter.return_value = black_q
        black_q.first.return_value = black_user

        db = MagicMock()
        db.query.side_effect = [white_q, black_q]
        return db

    def test_level_thresholds_follow_rating_bands(self):
        self.assertEqual(level_from_rating(100), 1)
        self.assertEqual(level_from_rating(299), 1)
        self.assertEqual(level_from_rating(300), 2)
        self.assertEqual(level_from_rating(500), 3)
        self.assertEqual(level_from_rating(2900), 15)
        self.assertEqual(level_from_rating(9999), 15)

    def test_pvp_win_updates_both_ratings_and_levels(self):
        white = SimpleNamespace(id=1, username="white", rating=1000, level=1)
        black = SimpleNamespace(id=2, username="black", rating=1000, level=1)
        game = SimpleNamespace(white_player_id=1, black_player_id=2, result="1-0")
        db = self._db_for_users(white, black)

        update_ratings_after_game(game, db)

        self.assertEqual(white.rating, 1016)
        self.assertEqual(black.rating, 984)
        self.assertEqual(white.level, 5)
        self.assertEqual(black.level, 5)

    def test_bot_game_does_not_change_rating_or_level(self):
        white = SimpleNamespace(id=1, username="__BOT__", rating=1800, level=9)
        black = SimpleNamespace(id=2, username="student", rating=1200, level=6)
        game = SimpleNamespace(white_player_id=1, black_player_id=2, result="1-0")
        db = self._db_for_users(white, black)

        update_ratings_after_game(game, db)

        self.assertEqual(white.rating, 1800)
        self.assertEqual(white.level, 9)
        self.assertEqual(black.rating, 1200)
        self.assertEqual(black.level, 6)


if __name__ == "__main__":
    unittest.main()
