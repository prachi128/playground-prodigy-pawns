# test_stockfish_debug.py - Debug Stockfish issues

import os
from dotenv import load_dotenv

load_dotenv()

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "C:/Stockfish/stockfish.exe")

print("=" * 60)
print("STOCKFISH DEBUG")
print("=" * 60)
print(f"Path from .env: {STOCKFISH_PATH}")
print(f"File exists: {os.path.exists(STOCKFISH_PATH)}")
print(f"Is file: {os.path.isfile(STOCKFISH_PATH)}")
print()

# Try to import and use Stockfish
try:
    from stockfish import Stockfish
    print("✅ Stockfish package imported successfully")
    
    print(f"Attempting to initialize Stockfish at: {STOCKFISH_PATH}")
    stockfish = Stockfish(path=STOCKFISH_PATH, depth=15)
    print("✅ Stockfish initialized!")
    
    # Test with a simple position
    stockfish.set_fen_position("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
    best_move = stockfish.get_best_move()
    print(f"✅ Best move: {best_move}")
    
except FileNotFoundError as e:
    print(f"❌ Stockfish executable not found at: {STOCKFISH_PATH}")
    print(f"Error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
    print(f"Error type: {type(e).__name__}")
    
print("=" * 60)
