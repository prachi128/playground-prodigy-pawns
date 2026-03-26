"""
Calibration utilities for production bots.

This module provides a lightweight Elo estimation + acceptance gate that can be
run from scheduled jobs or admin-triggered scripts.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import log10
from typing import Iterable, List, Tuple


@dataclass
class MatchSample:
    """One sampled game result from the perspective of the bot under test."""

    bot_rating_target: int
    opponent_rating: int
    score: float  # 1.0 win, 0.5 draw, 0.0 loss


@dataclass
class CalibrationReport:
    estimated_rating: int
    confidence_low: int
    confidence_high: int
    acceptance_passed: bool
    samples: int


def expected_score(player_rating: float, opponent_rating: float) -> float:
    return 1.0 / (1.0 + 10 ** ((opponent_rating - player_rating) / 400.0))


def estimate_rating_from_samples(samples: Iterable[MatchSample], initial: int = 1200, lr: float = 6.0, steps: int = 120) -> int:
    """
    Estimate observed rating by minimizing squared error between actual score and
    Elo expected score. This is simple and robust for nightly calibration jobs.
    """
    rows = list(samples)
    if not rows:
        return initial
    r = float(initial)
    for _ in range(max(1, steps)):
        grad = 0.0
        for s in rows:
            exp = expected_score(r, s.opponent_rating)
            # d exp / d r
            d_exp = (log10(10) / 400.0) * exp * (1.0 - exp)
            grad += 2.0 * (exp - s.score) * d_exp
        r -= lr * grad
        if r < 100:
            r = 100.0
        if r > 3200:
            r = 3200.0
    return int(round(r))


def confidence_interval_simple(estimate: int, sample_count: int) -> Tuple[int, int]:
    """
    Conservative confidence band based on sample count.
    Replace with SPRT/Glicko confidence in later iterations.
    """
    n = max(1, sample_count)
    margin = int(round(220 / (n ** 0.5)))
    margin = max(20, margin)
    return estimate - margin, estimate + margin


def run_acceptance_gate(
    samples: List[MatchSample],
    *,
    target_rating: int,
    tolerance: int = 75,
    min_samples: int = 80,
) -> CalibrationReport:
    estimate = estimate_rating_from_samples(samples, initial=target_rating)
    lo, hi = confidence_interval_simple(estimate, len(samples))
    passed = len(samples) >= min_samples and lo <= target_rating + tolerance and hi >= target_rating - tolerance
    return CalibrationReport(
        estimated_rating=estimate,
        confidence_low=lo,
        confidence_high=hi,
        acceptance_passed=passed,
        samples=len(samples),
    )
