import unittest

import chess

from bot_openings import choose_opening_move


class BotOpeningsTests(unittest.TestCase):
    def test_opening_move_available_from_start(self):
        board = chess.Board()
        mv = choose_opening_move(board, "martin", max_ply=8)
        self.assertIsNotNone(mv)
        self.assertIn(chess.Move.from_uci(mv), board.legal_moves)

    def test_opening_move_none_after_max_ply(self):
        board = chess.Board()
        board.push(chess.Move.from_uci("e2e4"))
        board.push(chess.Move.from_uci("e7e5"))
        board.push(chess.Move.from_uci("g1f3"))
        board.push(chess.Move.from_uci("b8c6"))
        mv = choose_opening_move(board, "martin", max_ply=2)
        self.assertIsNone(mv)


if __name__ == "__main__":
    unittest.main()
