"""Tests for puzzle format resolution and play-state assumptions."""

import unittest
from types import SimpleNamespace

from puzzle_utils import resolve_puzzle_format
from models import PuzzleFormat


class ResolvePuzzleFormatTests(unittest.TestCase):
    def test_explicit_lichess(self):
        puzzle = SimpleNamespace(puzzle_format=PuzzleFormat.LICHESS, lichess_id=None)
        self.assertEqual(resolve_puzzle_format(puzzle), "lichess")

    def test_explicit_direct(self):
        puzzle = SimpleNamespace(puzzle_format=PuzzleFormat.DIRECT, lichess_id="abc")
        self.assertEqual(resolve_puzzle_format(puzzle), "direct")

    def test_lichess_id_fallback(self):
        puzzle = SimpleNamespace(puzzle_format=None, lichess_id="00sHx")
        self.assertEqual(resolve_puzzle_format(puzzle), "lichess")

    def test_default_direct(self):
        puzzle = SimpleNamespace(puzzle_format=None, lichess_id=None)
        self.assertEqual(resolve_puzzle_format(puzzle), "direct")


if __name__ == "__main__":
    unittest.main()
