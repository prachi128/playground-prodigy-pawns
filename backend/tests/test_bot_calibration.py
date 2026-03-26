import unittest

from bot_calibration import MatchSample, expected_score, run_acceptance_gate


class BotCalibrationTests(unittest.TestCase):
    def test_expected_score_monotonic(self):
        low = expected_score(800, 1200)
        high = expected_score(1400, 1200)
        self.assertLess(low, high)
        self.assertGreater(high, 0.5)

    def test_acceptance_gate_passes_for_balanced_samples(self):
        samples = []
        # Roughly 1200-level outcomes vs 1200 opponents
        for _ in range(60):
            samples.append(MatchSample(bot_rating_target=1200, opponent_rating=1200, score=1.0))
        for _ in range(40):
            samples.append(MatchSample(bot_rating_target=1200, opponent_rating=1200, score=0.0))
        report = run_acceptance_gate(samples, target_rating=1200, tolerance=150, min_samples=80)
        self.assertTrue(report.acceptance_passed)
        self.assertGreaterEqual(report.samples, 80)

    def test_acceptance_gate_fails_when_not_enough_samples(self):
        samples = [MatchSample(bot_rating_target=1200, opponent_rating=1200, score=0.5) for _ in range(12)]
        report = run_acceptance_gate(samples, target_rating=1200, tolerance=75, min_samples=80)
        self.assertFalse(report.acceptance_passed)


if __name__ == "__main__":
    unittest.main()
