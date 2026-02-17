# stockfish_service.py - Stockfish Integration Service

from stockfish import Stockfish
from typing import Optional, Dict, List
import os

# Configure Stockfish path (adjust based on your installation)
STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "./stockfish/stockfish.exe")

class StockfishService:
    def __init__(self):
        """Initialize Stockfish engine"""
        self.stockfish = Stockfish(
            path=STOCKFISH_PATH,
            depth=15,  # Analysis depth
            parameters={
                "Threads": 2,
                "Minimum Thinking Time": 30,
            }
        )
    
    def analyze_position(self, fen: str, depth: int = 15) -> Dict:
        """
        Analyze a chess position and return evaluation + best move
        
        Args:
            fen: FEN string of the position
            depth: Search depth (default 15)
            
        Returns:
            Dict with evaluation, best_move, and analysis
        """
        try:
            self.stockfish.set_fen_position(fen)
            self.stockfish.set_depth(depth)
            
            best_move = self.stockfish.get_best_move()
            evaluation = self.stockfish.get_evaluation()
            top_moves = self.stockfish.get_top_moves(3)
            
            return {
                "success": True,
                "best_move": best_move,
                "evaluation": evaluation,
                "top_moves": top_moves,
                "is_mate": evaluation.get("type") == "mate" if evaluation else False
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def validate_puzzle(self, fen: str, solution_moves: List[str]) -> Dict:
        """
        Validate if a puzzle position has the correct solution
        
        Args:
            fen: Starting position FEN
            solution_moves: List of moves in UCI format (e.g., ['e2e4', 'e7e5'])
            
        Returns:
            Dict with validation result and analysis
        """
        try:
            self.stockfish.set_fen_position(fen)
            
            # Get best move from starting position
            best_move = self.stockfish.get_best_move()
            first_solution_move = solution_moves[0] if solution_moves else None
            
            # Check if solution's first move matches best move
            is_correct = best_move == first_solution_move
            
            # Try to analyze the position after solution
            final_evaluation = None
            try:
                # Create a new instance for move validation
                temp_stockfish = Stockfish(
                    path=STOCKFISH_PATH,
                    depth=15,
                    parameters={
                        "Threads": 2,
                        "Minimum Thinking Time": 30,
                    }
                )
                temp_stockfish.set_fen_position(fen)
                temp_stockfish.make_moves_from_current_position(solution_moves)
                final_evaluation = temp_stockfish.get_evaluation()
            except Exception as move_error:
                # If moves fail, just use the initial evaluation
                print(f"Move validation error: {move_error}")
                final_evaluation = self.stockfish.get_evaluation()
            
            return {
                "success": True,
                "is_valid": is_correct,
                "best_move": best_move,
                "solution_first_move": first_solution_move,
                "matches": is_correct,
                "final_evaluation": final_evaluation,
                "message": "Solution is optimal!" if is_correct else f"Best move is {best_move}, not {first_solution_move}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def detect_tactic_theme(self, fen: str, solution_moves: List[str]) -> str:
        """
        Detect the tactical theme of a puzzle
        
        Args:
            fen: Position FEN
            solution_moves: Solution moves
            
        Returns:
            String describing the tactic (fork, pin, skewer, etc.)
        """
        # This is a simplified version - real theme detection is complex
        # You could expand this with pattern matching
        
        try:
            self.stockfish.set_fen_position(fen)
            evaluation_before = self.stockfish.get_evaluation()
            
            self.stockfish.make_moves_from_current_position(solution_moves)
            evaluation_after = self.stockfish.get_evaluation()
            
            # Simple heuristics
            if evaluation_after.get("type") == "mate":
                return "checkmate"
            
            # Check for material gain
            if evaluation_before.get("type") == "cp" and evaluation_after.get("type") == "cp":
                gain = evaluation_after["value"] - evaluation_before["value"]
                if gain > 300:
                    return "winning_material"
                elif gain > 100:
                    return "tactics"
            
            return "positional"
        except:
            return "unknown"
    
    def suggest_difficulty(self, fen: str) -> str:
        """
        Suggest difficulty rating based on position complexity
        
        Args:
            fen: Position FEN
            
        Returns:
            Difficulty level (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT)
        """
        try:
            analysis = self.analyze_position(fen, depth=15)
            
            if not analysis["success"]:
                return "INTERMEDIATE"
            
            evaluation = analysis["evaluation"]
            
            # Simple heuristics for difficulty
            if evaluation.get("type") == "mate":
                mate_in = abs(evaluation.get("value", 0))
                if mate_in <= 2:
                    return "BEGINNER"
                elif mate_in <= 4:
                    return "INTERMEDIATE"
                else:
                    return "ADVANCED"
            
            # For positional puzzles, check evaluation complexity
            top_moves = analysis.get("top_moves", [])
            if len(top_moves) > 1:
                best_eval = top_moves[0].get("Centipawn", 0)
                second_eval = top_moves[1].get("Centipawn", 0)
                diff = abs(best_eval - second_eval)
                
                if diff > 300:
                    return "BEGINNER"
                elif diff > 150:
                    return "INTERMEDIATE"
                elif diff > 50:
                    return "ADVANCED"
                else:
                    return "EXPERT"
            
            return "INTERMEDIATE"
        except:
            return "INTERMEDIATE"

# Singleton instance
_stockfish_service = None

def get_stockfish_service() -> StockfishService:
    """Get or create StockfishService singleton"""
    global _stockfish_service
    if _stockfish_service is None:
        _stockfish_service = StockfishService()
    return _stockfish_service