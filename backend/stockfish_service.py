# stockfish_service.py - Stockfish Integration Service

from stockfish import Stockfish
from typing import Optional, Dict, List, Any
import os
import random
import json

import chess

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

    def choose_bot_move(self, fen: str, bot_rating: int, profile_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Pick a move intended to approximate human strength near ``bot_rating`` Elo.

        Uses Stockfish multi-PV, then biased sampling: weaker ratings favour
        sub-top moves and occasional random legal moves instead of always
        playing the engine's first line.
        """
        try:
            cfg = profile_config or {}
            r = max(200, min(2900, int(bot_rating)))
            board = chess.Board(fen)
            legal_moves = list(board.legal_moves)
            if not legal_moves:
                return {"success": False, "error": "No legal moves"}

            # Slightly deeper search for stronger nominal ratings (better move ordering).
            min_depth = int(cfg.get("min_depth", 6))
            max_depth = int(cfg.get("max_depth", 18))
            depth = max(min_depth, min(max_depth, 7 + int((r - 400) / 220)))

            self.stockfish.set_fen_position(fen)
            self.stockfish.set_depth(depth)
            top_n = max(2, min(20, int(cfg.get("top_n", 10))))
            top = self.stockfish.get_top_moves(top_n) or []

            legal_ucis = {m.uci() for m in legal_moves}
            candidates: List[Dict[str, Any]] = []
            for entry in top:
                mv = entry.get("Move")
                if mv and isinstance(mv, str) and mv in legal_ucis:
                    candidates.append(entry)

            if not candidates:
                bm = self.stockfish.get_best_move()
                if bm and bm in legal_ucis:
                    return {
                        "success": True,
                        "best_move": bm,
                        "evaluation": self.stockfish.get_evaluation(),
                        "top_moves": top,
                        "selected_rank": 1,
                        "eval_cp": None,
                        "eval_loss_cp": 0,
                        "decision_meta_json": json.dumps({"fallback": "best_move"}),
                    }
                pick = random.choice(legal_moves)
                return {
                    "success": True,
                    "best_move": pick.uci(),
                    "evaluation": self.stockfish.get_evaluation(),
                    "top_moves": top,
                    "selected_rank": None,
                    "eval_cp": None,
                    "eval_loss_cp": None,
                    "decision_meta_json": json.dumps({"fallback": "random_legal"}),
                }

            # Force obvious short mates so the bot doesn't look broken.
            top0 = candidates[0]
            mate0 = top0.get("Mate")
            force_mate_in = int(cfg.get("force_mate_in", 2))
            if mate0 is not None and mate0 > 0 and mate0 <= force_mate_in:
                return {
                    "success": True,
                    "best_move": top0["Move"],
                    "evaluation": self.stockfish.get_evaluation(),
                    "top_moves": top,
                    "selected_rank": 1,
                    "eval_cp": int(top0.get("Centipawn") or 0),
                    "eval_loss_cp": 0,
                    "decision_meta_json": json.dumps({"forced_short_mate": mate0}),
                }

            top_ucis = {c["Move"] for c in candidates}

            # Rare "coffeehouse" picks — stronger bots almost never do this.
            wild_cap = float(cfg.get("wild_move_probability_cap", 0.38))
            wild_p = max(0.0, min(wild_cap, 0.40 - (r - 380) / 5200))
            if random.random() < wild_p:
                others = [m for m in legal_moves if m.uci() not in top_ucis]
                if others:
                    pick = random.choice(others)
                    return {
                        "success": True,
                        "best_move": pick.uci(),
                        "evaluation": self.stockfish.get_evaluation(),
                        "top_moves": top,
                        "selected_rank": None,
                        "eval_cp": None,
                        "eval_loss_cp": None,
                        "decision_meta_json": json.dumps({"wild_pick": True, "wild_probability": round(wild_p, 4)}),
                    }

            oversight = cfg.get("oversight_model", {}) if isinstance(cfg.get("oversight_model", {}), dict) else {}
            tactical_oversight_rate = float(oversight.get("tactical_oversight_rate", 0.0))
            blunder_rate = float(oversight.get("blunder_rate", 0.0))
            blunder_severity_cp = int(oversight.get("blunder_severity_cp", 0))

            # Tactical oversight: when top line is clearly better, intentionally pick lower-ranked top move.
            if len(candidates) >= 2 and random.random() < max(0.0, min(0.9, tactical_oversight_rate)):
                top_cp = int(candidates[0].get("Centipawn") or 0)
                weak_choices = []
                for i, c in enumerate(candidates[1:], start=2):
                    cp = int(c.get("Centipawn") or 0)
                    if top_cp - cp >= 80:
                        weak_choices.append((i, c))
                if weak_choices:
                    rank, c = random.choice(weak_choices[:4])
                    return {
                        "success": True,
                        "best_move": c["Move"],
                        "evaluation": self.stockfish.get_evaluation(),
                        "top_moves": top,
                        "selected_rank": rank,
                        "eval_cp": int(c.get("Centipawn") or 0),
                        "eval_loss_cp": max(0, top_cp - int(c.get("Centipawn") or 0)),
                        "decision_meta_json": json.dumps({"policy": "tactical_oversight"}),
                    }

            # Controlled blunder template: choose a move with a target evaluation loss band.
            if len(candidates) >= 3 and blunder_rate > 0 and random.random() < max(0.0, min(0.9, blunder_rate)):
                top_cp = int(candidates[0].get("Centipawn") or 0)
                min_drop = max(100, blunder_severity_cp)
                blunder_candidates = []
                for i, c in enumerate(candidates[2:], start=3):
                    cp = int(c.get("Centipawn") or 0)
                    drop = top_cp - cp
                    if drop >= min_drop:
                        blunder_candidates.append((i, c, drop))
                if blunder_candidates:
                    rank, c, drop = random.choice(blunder_candidates[:4])
                    return {
                        "success": True,
                        "best_move": c["Move"],
                        "evaluation": self.stockfish.get_evaluation(),
                        "top_moves": top,
                        "selected_rank": rank,
                        "eval_cp": int(c.get("Centipawn") or 0),
                        "eval_loss_cp": drop,
                        "decision_meta_json": json.dumps({"policy": "controlled_blunder", "drop_cp": drop}),
                    }

            # k: small for weak ratings (flat weights → more sub-top picks), large for strong (top line dominant).
            k = max(0.06, min(4.2, (r - 200) / 520.0))
            weights = [1.0 / (1.0 + k * i) for i in range(len(candidates))]

            total_w = sum(weights)
            rv = random.uniform(0, total_w)
            acc = 0.0
            chosen_move = candidates[0]["Move"]
            chosen_rank = 1
            top_cp = int(candidates[0].get("Centipawn") or 0)
            chosen_cp = top_cp
            for i, w in enumerate(weights):
                acc += w
                if rv <= acc:
                    chosen_move = candidates[i]["Move"]
                    chosen_rank = i + 1
                    chosen_cp = int(candidates[i].get("Centipawn") or 0)
                    break

            return {
                "success": True,
                "best_move": chosen_move,
                "evaluation": self.stockfish.get_evaluation(),
                "top_moves": top,
                "selected_rank": chosen_rank,
                "eval_cp": chosen_cp,
                "eval_loss_cp": max(0, top_cp - chosen_cp),
                "decision_meta_json": json.dumps({"policy": "weighted_topn", "k": round(k, 4), "top_n": len(candidates)}),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

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