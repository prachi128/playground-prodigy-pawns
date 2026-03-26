"""
Verify choose_bot_move weakens play for lower bot_rating vs higher bot_rating.

This does not prove FIDE-accurate Elo; it proves the selection policy is ordered
by nominal rating when wild picks and oversight policies are disabled.
"""

from __future__ import annotations

import random
import unittest
from unittest.mock import MagicMock

import chess

from stockfish_service import StockfishService


START_FEN = chess.STARTING_FEN

# Config that forces the weighted multi-PV path only (no wild picks / oversight / blunders).
_NEUTRAL_PROFILE = {
    "wild_move_probability_cap": 0.0,
    "oversight_model": {"tactical_oversight_rate": 0.0, "blunder_rate": 0.0},
    "force_mate_in": 0,  # disable short-mate forcing for this unit test fixture
}


def _fake_top_moves():
    """Five legal opening moves with a clear eval spread."""
    return [
        {"Move": "e2e4", "Centipawn": 40},
        {"Move": "d2d4", "Centipawn": 28},
        {"Move": "g1f3", "Centipawn": 18},
        {"Move": "b1c3", "Centipawn": 8},
        {"Move": "f2f4", "Centipawn": -60},
    ]


def _service_with_mock_stockfish():
    svc = StockfishService.__new__(StockfishService)
    mock_sf = MagicMock()
    mock_sf.get_top_moves.return_value = _fake_top_moves()
    mock_sf.get_evaluation.return_value = {"type": "cp", "value": 40}
    mock_sf.get_best_move.return_value = "e2e4"
    svc.stockfish = mock_sf
    return svc


def _monte_carlo_stats(bot_rating: int, *, trials: int, seed: int) -> tuple[float, float]:
    random.seed(seed)
    svc = _service_with_mock_stockfish()
    rank_sum = 0.0
    loss_sum = 0.0
    top_move_hits = 0
    for _ in range(trials):
        out = svc.choose_bot_move(START_FEN, bot_rating, dict(_NEUTRAL_PROFILE))
        if not out.get("success"):
            raise AssertionError(out.get("error", "choose_bot_move failed"))
        rk = out.get("selected_rank")
        if rk is None:
            raise AssertionError("expected selected_rank in weighted path")
        rank_sum += float(rk)
        loss_sum += float(out.get("eval_loss_cp") or 0)
        if out.get("best_move") == "e2e4":
            top_move_hits += 1
    mean_rank = rank_sum / trials
    mean_loss = loss_sum / trials
    top_rate = top_move_hits / trials
    return mean_rank, mean_loss, top_rate


class BotMoveStrengthScalingTests(unittest.TestCase):
    def test_low_rated_bot_picks_worse_moves_than_high_rated_bot(self):
        trials = 4000
        weak_rating = 400
        strong_rating = 2100
        mr_w, loss_w, tr_w = _monte_carlo_stats(weak_rating, trials=trials, seed=12345)
        mr_s, loss_s, tr_s = _monte_carlo_stats(strong_rating, trials=trials, seed=12345)

        self.assertGreater(mr_w, mr_s, "weaker nominal rating should pick higher mean average rank")
        self.assertGreater(loss_w, loss_s, "weaker nominal rating should incur more eval loss vs top line")
        self.assertGreater(tr_s, tr_w, "stronger bot should play engine-top move more often")

    def test_rating_monotone_across_named_bot_bands(self):
        """Spaced ratings from bot_opponents should stay ordered on mean rank."""
        from bot_opponents import BOT_RATING_BY_ID

        ratings = sorted(set(BOT_RATING_BY_ID.values()))
        if len(ratings) < 3:
            self.skipTest("need multiple distinct ratings")

        trials = 2500
        means = []
        for r in [ratings[0], ratings[len(ratings) // 2], ratings[-1]]:
            mr, _, _ = _monte_carlo_stats(r, trials=trials, seed=999 + r)
            means.append((r, mr))
        means.sort(key=lambda x: x[0])
        self.assertGreater(means[0][1], means[1][1])
        self.assertGreater(means[1][1], means[2][1])


if __name__ == "__main__":
    unittest.main()
