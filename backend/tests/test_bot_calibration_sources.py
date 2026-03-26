import unittest

from bot_calibration_sources import game_result_to_bot_score


class GameResultToBotScoreTests(unittest.TestCase):
    def test_decisive_and_draw(self):
        self.assertEqual(game_result_to_bot_score("1-0", True), 1.0)
        self.assertEqual(game_result_to_bot_score("1-0", False), 0.0)
        self.assertEqual(game_result_to_bot_score("0-1", False), 1.0)
        self.assertEqual(game_result_to_bot_score("0-1", True), 0.0)
        self.assertEqual(game_result_to_bot_score("1/2-1/2", True), 0.5)
        self.assertEqual(game_result_to_bot_score("1/2-1/2", False), 0.5)

    def test_invalid_or_incomplete(self):
        self.assertIsNone(game_result_to_bot_score(None, True))
        self.assertIsNone(game_result_to_bot_score("*", True))
        self.assertIsNone(game_result_to_bot_score("bogus", True))


if __name__ == "__main__":
    unittest.main()
