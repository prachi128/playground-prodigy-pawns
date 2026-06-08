"""Shared puzzle format helpers."""

from __future__ import annotations

from typing import Union

from models import PuzzleFormat


def resolve_puzzle_format(
    puzzle: Union[Puzzle, object],
) -> str:
    """
    Return 'lichess' or 'direct' for how student play should interpret fen + moves.
    """
    explicit = getattr(puzzle, "puzzle_format", None)
    if explicit is not None and str(explicit).strip():
        if isinstance(explicit, PuzzleFormat):
            return explicit.value
        value = str(explicit).strip().lower()
        if value in ("lichess", "direct"):
            return value

    lichess_id = getattr(puzzle, "lichess_id", None)
    if lichess_id:
        return PuzzleFormat.LICHESS.value
    return PuzzleFormat.DIRECT.value
