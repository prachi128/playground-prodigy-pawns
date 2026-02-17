"""
Test script to verify Stockfish chess engine is installed and working.
Sets position e2e4 e7e5, gets best move and evaluation.
"""
import os
import sys
from pathlib import Path

# Ensure UTF-8 output on Windows so checkmark prints
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# Load .env so STOCKFISH_PATH is available
from dotenv import load_dotenv
load_dotenv()

from stockfish import Stockfish


def main():
    # Path relative to backend directory
    path_from_env = os.getenv("STOCKFISH_PATH")
    if path_from_env:
        # Resolve relative to backend directory
        backend_dir = Path(__file__).resolve().parent
        stockfish_path = (backend_dir / path_from_env).resolve()
    else:
        stockfish_path = Path(__file__).resolve().parent / "stockfish" / "stockfish.exe"

    if not stockfish_path.exists():
        print(f"[FAIL] Stockfish not found at: {stockfish_path}")
        return 1

    try:
        sf = Stockfish(path=str(stockfish_path))
    except Exception as e:
        print(f"[FAIL] Failed to start Stockfish: {e}")
        return 1

    # Set position: e2e4 e7e5 (Italian/King's Pawn opening)
    # FEN after 1. e4 e5 (black to move)
    sf.set_fen_position("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1")

    best_move = sf.get_best_move()
    evaluation = sf.get_evaluation()

    if best_move is None:
        print("[FAIL] Stockfish did not return a best move.")
        return 1

    print("✅ Stockfish is working!")
    print(f"   Position: e2e4 e7e5")
    print(f"   Best move: {best_move}")
    print(f"   Evaluation: {evaluation}")
    return 0


if __name__ == "__main__":
    exit(main())
