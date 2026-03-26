import unittest

from bot_opponents import get_bot_rating_for_game


class BotRatingMappingTests(unittest.TestCase):
    def test_named_bot_id_mapping(self):
        self.assertEqual(get_bot_rating_for_game("martin"), 400)
        self.assertEqual(get_bot_rating_for_game("zeno"), 2100)

    def test_legacy_mapping(self):
        self.assertEqual(get_bot_rating_for_game("beginner"), 400)
        self.assertEqual(get_bot_rating_for_game("expert"), 2000)

    def test_depth_fallback(self):
        self.assertGreaterEqual(get_bot_rating_for_game("unknown-bot", 6), 400)
        self.assertLessEqual(get_bot_rating_for_game("unknown-bot", 50), 2400)


if __name__ == "__main__":
    unittest.main()
