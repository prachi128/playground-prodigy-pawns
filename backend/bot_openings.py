from __future__ import annotations

import random
from typing import Dict, List, Optional

import chess


# Lightweight opening books for personality differentiation.
# Each entry is a sequence of UCI moves from initial position.
OPENING_BOOKS: Dict[str, List[List[str]]] = {
    "default": [
        ["e2e4", "e7e5", "g1f3", "b8c6"],
        ["d2d4", "d7d5", "c2c4", "e7e6"],
        ["c2c4", "e7e5", "g1f3", "b8c6"],
    ],
    "martin": [
        ["e2e4", "e7e5", "g1f3", "g8f6"],
        ["d2d4", "d7d5", "c1f4", "g8f6"],
    ],
    "elena": [
        ["d2d4", "d7d5", "g1f3", "g8f6"],
        ["c2c4", "e7e6", "g2g3", "d7d5"],
    ],
    "noor": [
        ["d2d4", "g8f6", "c2c4", "e7e6", "g1f3", "d7d5"],
        ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4"],
    ],
}


def _history_uci(board: chess.Board) -> List[str]:
    return [mv.uci() for mv in board.move_stack]


def choose_opening_move(board: chess.Board, bot_id: str, max_ply: int = 8) -> Optional[str]:
    """
    Returns opening-book move if current line matches a configured prefix.
    """
    if board.ply() >= max(0, max_ply):
        return None
    history = _history_uci(board)
    # Prefer bot-specific book, then default.
    candidate_books = []
    if bot_id in OPENING_BOOKS:
        candidate_books.extend(OPENING_BOOKS[bot_id])
    candidate_books.extend(OPENING_BOOKS["default"])

    choices: List[str] = []
    for line in candidate_books:
        if len(history) >= len(line):
            continue
        prefix = line[: len(history)]
        if prefix != history:
            continue
        next_move = line[len(history)]
        move_obj = chess.Move.from_uci(next_move)
        if move_obj in board.legal_moves:
            choices.append(next_move)
    if not choices:
        return None
    return random.choice(choices)
