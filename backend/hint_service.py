# hint_service.py - Stockfish-powered Hint Generation Service

from stockfish import Stockfish
from typing import Dict, List
import os
import chess

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "./stockfish/stockfish.exe")

class HintService:
    def __init__(self):
        self.stockfish = Stockfish(
            path=STOCKFISH_PATH,
            depth=15,
            parameters={
                "Threads": 2,
                "Minimum Thinking Time": 30,
            }
        )

    def get_piece_name(self, piece_symbol: str) -> str:
        """Convert piece symbol to full name"""
        pieces = {
            'p': 'pawn', 'n': 'knight', 'b': 'bishop',
            'r': 'rook', 'q': 'queen', 'k': 'king'
        }
        return pieces.get(piece_symbol.lower(), 'piece')

    def get_hint(self, fen: str, hint_level: int) -> Dict:
        """
        Generate a hint for a given position at the specified level.

        Args:
            fen: FEN string of the current position
            hint_level: 1, 2, or 3 (1=vague, 3=specific)

        Returns:
            Dict with hint text and XP cost
        """
        try:
            self.stockfish.set_fen_position(fen)
            best_move = self.stockfish.get_best_move()
            evaluation = self.stockfish.get_evaluation()

            if not best_move:
                return {
                    "success": False,
                    "error": "Could not analyze position"
                }

            # Parse the best move
            board = chess.Board(fen)
            move = chess.Move.from_uci(best_move)

            from_square = chess.square_name(move.from_square)
            to_square = chess.square_name(move.to_square)

            piece = board.piece_at(move.from_square)
            piece_name = self.get_piece_name(piece.symbol()) if piece else "piece"

            target_piece = board.piece_at(move.to_square)
            is_capture = target_piece is not None
            is_check = board.gives_check(move)

            # Get top 3 moves to understand position complexity
            top_moves = self.stockfish.get_top_moves(3)
            is_forced = len(top_moves) < 2 or (
                len(top_moves) >= 2 and
                abs((top_moves[0].get('Centipawn') or 0) - (top_moves[1].get('Centipawn') or 0)) > 200
            )

            # XP costs per hint level
            xp_costs = {1: 2, 2: 4, 3: 8}
            xp_cost = xp_costs.get(hint_level, 2)

            # Generate hint based on level
            if hint_level == 1:
                hint_text = self._generate_hint_level_1(
                    piece_name, is_capture, is_check, evaluation, is_forced
                )
            elif hint_level == 2:
                hint_text = self._generate_hint_level_2(
                    piece_name, from_square, to_square, is_capture, is_check, board, move
                )
            else:
                hint_text = self._generate_hint_level_3(
                    piece_name, from_square, to_square, is_capture, is_check
                )

            return {
                "success": True,
                "hint_level": hint_level,
                "hint_text": hint_text,
                "xp_cost": xp_cost,
                "is_check": is_check,
                "is_capture": is_capture,
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def _generate_hint_level_1(self, piece_name, is_capture, is_check, evaluation, is_forced) -> str:
        """Vague conceptual hint"""
        if evaluation.get("type") == "mate":
            return "There's a forced checkmate sequence in this position! Look carefully."
        
        if is_check:
            return f"Think about moves that put the opponent's king in check."
        
        if is_capture:
            return f"Look for a {piece_name} that can win material by capturing an opponent's piece."
        
        if is_forced:
            return "There's one move that's clearly better than all others here."
        
        hints = [
            f"Focus on your {piece_name} - it has an important role to play.",
            "Look for a move that attacks multiple targets at once.",
            "Think about which of your pieces is poorly placed and could be activated.",
            "Consider moves that improve your position significantly.",
            "Look for a move that forces your opponent into a difficult situation.",
        ]
        import random
        return random.choice(hints)

    def _generate_hint_level_2(self, piece_name, from_square, to_square, is_capture, is_check, board, move) -> str:
        """More specific hint about the type of tactic"""
        col_from = from_square[0]
        col_to = to_square[0]
        
        if is_check and is_capture:
            return f"Move your {piece_name} to capture a piece AND deliver check at the same time."
        
        if is_check:
            target_piece = board.piece_at(move.to_square)
            return f"Move your {piece_name} to give check to the opponent's king."
        
        if is_capture:
            target = board.piece_at(move.to_square)
            if target:
                target_name = self.get_piece_name(target.symbol())
                return f"Your {piece_name} can capture the opponent's {target_name} to win material."
            return f"Your {piece_name} can make a capturing move."
        
        # Detect fork (piece moves to attack two pieces)
        return f"Your {piece_name} is the key piece. Try moving it toward the {'kingside' if col_to in 'efgh' else 'queenside'}."

    def _generate_hint_level_3(self, piece_name, from_square, to_square, is_capture, is_check) -> str:
        """Most specific hint - tells piece and general direction"""
        if is_capture and is_check:
            return f"Move your {piece_name} from {from_square} - it can capture and check at the same time!"
        
        if is_check:
            return f"Your {piece_name} on {from_square} can deliver check. Find the right square!"
        
        if is_capture:
            return f"Move your {piece_name} from {from_square} to make a winning capture."
        
        return f"The key move involves your {piece_name} on {from_square}. Where should it go?"


# Singleton instance
_hint_service = None

def get_hint_service() -> HintService:
    global _hint_service
    if _hint_service is None:
        _hint_service = HintService()
    return _hint_service
