from fastapi import FastAPI, Depends, HTTPException, Request, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Optional

# Import models and utilities
from models import User, Game, Puzzle, PuzzleAttempt, Achievement, DailyChallenge, PuzzleRace, UserRole, GameInvite, Notification
from database import get_db
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_current_user,
    authenticate_user,
    COOKIE_ACCESS_TOKEN,
    COOKIE_REFRESH_TOKEN,
)
from schemas import (
    UserCreate,
    UserResponse,
    UserLogin,
    PuzzleResponse,
    GameResponse,
    AchievementResponse,
    DailyChallengeResponse,
    PuzzleAttemptCreate,
    PuzzleAttemptResponse,
    UserUpdate,
    GameInviteCreate,
    GameInviteResponse,
    GameInviteAccept,
    GameCreate,
    GameMoveCreate,
    BotGameCreate,
    NotificationResponse,
    NotificationMarkRead,
)
from stockfish_service import get_stockfish_service
from hint_service import get_hint_service
from coach_endpoints import router as coach_router

# FastAPI app
app = FastAPI(
    title="Prodigy Pawns Student Portal API",
    description="Chess Academy Portal for Students - Play, Learn, and Grow!",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(coach_router)


# Cookie settings for auth (Cookie-Based Session Auth)
def _cookie_attrs():
    return {
        "httponly": True,
        "samesite": "lax",
        "path": "/",
    }

# Health check endpoints
@app.get("/")
def read_root():
    return {
        "message": "Welcome to Prodigy Pawns Student Portal API! 🎮♟️",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "database": "connected"}

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.post("/api/auth/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user. Sets HttpOnly access + refresh cookies and returns user."""
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password,
        age=user.age,
        role=UserRole.student
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    access_token = create_access_token(data={"sub": new_user.id})
    refresh_token = create_refresh_token(data={"sub": new_user.id})
    user_payload = UserResponse.model_validate(new_user).model_dump(mode="json")
    response = JSONResponse(content={"user": user_payload})
    response.set_cookie(
        key=COOKIE_ACCESS_TOKEN,
        value=access_token,
        max_age=15 * 60,
        **_cookie_attrs(),
    )
    response.set_cookie(
        key=COOKIE_REFRESH_TOKEN,
        value=refresh_token,
        max_age=7 * 24 * 3600,
        **_cookie_attrs(),
    )
    return response

@app.post("/api/auth/login")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login user. Sets HttpOnly access + refresh cookies and returns user."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    user_payload = UserResponse.model_validate(user).model_dump(mode="json")
    response = JSONResponse(content={"user": user_payload})
    
    # Debug: log origin
    origin = request.headers.get("origin", "unknown")
    print(f"🔐 Login successful for user {user.id}. Origin: {origin}")
    
    cookie_attrs = _cookie_attrs()
    response.set_cookie(
        key=COOKIE_ACCESS_TOKEN,
        value=access_token,
        max_age=15 * 60,
        **cookie_attrs,
    )
    response.set_cookie(
        key=COOKIE_REFRESH_TOKEN,
        value=refresh_token,
        max_age=7 * 24 * 3600,
        **cookie_attrs,
    )
    print(f"🍪 Cookies set: access_token={bool(access_token)}, refresh_token={bool(refresh_token)}")
    print(f"🍪 Cookie attrs: {cookie_attrs}")
    return response

@app.post("/api/auth/refresh")
def refresh_token(request: Request, db: Session = Depends(get_db)):
    """Issue a new access token from refresh token (in HttpOnly cookie). Returns user."""
    refresh = request.cookies.get(COOKIE_REFRESH_TOKEN)
    if not refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
    user_id = decode_refresh_token(refresh)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access_token = create_access_token(data={"sub": user.id})
    user_payload = UserResponse.model_validate(user).model_dump(mode="json")
    response = JSONResponse(content={"user": user_payload})
    response.set_cookie(
        key=COOKIE_ACCESS_TOKEN,
        value=access_token,
        max_age=15 * 60,
        **_cookie_attrs(),
    )
    return response


@app.post("/api/auth/logout")
def logout():
    """Clear auth cookies (access + refresh)."""
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key=COOKIE_ACCESS_TOKEN, path="/")
    response.delete_cookie(key=COOKIE_REFRESH_TOKEN, path="/")
    return response


@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_info(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current logged-in user information (token from cookie or Authorization header)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ==================== USER ENDPOINTS ====================

# IMPORTANT: /api/users/search must come BEFORE /api/users/{user_id} to avoid route conflicts
@app.get("/api/users/search")
def search_users(
    query: str = Query("", description="Search query (username or full name)"),
    limit: int = 20,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search for users/students by username or full name"""
    # Return empty list if query is None, empty, or too short
    if not query or not query.strip() or len(query.strip()) < 2:
        return []
    
    # Handle empty string case
    query = query.strip()
    
    # Ensure limit is within reasonable bounds
    if limit < 1:
        limit = 1
    if limit > 100:
        limit = 100
    
    search_term = f"%{query.lower()}%"
    users = db.query(User).filter(
        User.role == UserRole.student,
        User.is_active == True,
        User.id != current_user_id,
        (
            User.username.ilike(search_term) |
            User.full_name.ilike(search_term)
        )
    ).limit(limit).all()
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "level": user.level,
            "rating": user.rating,
            "total_xp": user.total_xp
        }
        for user in users
    ]

@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/api/users/me", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    current_user = db.query(User).filter(User.id == user_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.full_name:
        current_user.full_name = user_update.full_name
    if user_update.avatar_url:
        current_user.avatar_url = user_update.avatar_url
    if user_update.age:
        current_user.age = user_update.age
    
    db.commit()
    db.refresh(current_user)
    return current_user

# ==================== PUZZLE ENDPOINTS ====================

@app.get("/api/puzzles", response_model=list[PuzzleResponse])
def get_puzzles(
    difficulty: str = None,
    theme: str = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get list of puzzles with optional filters"""
    query = db.query(Puzzle).filter(Puzzle.is_active == True)
    
    if difficulty:
        # Convert to uppercase to match enum values
        query = query.filter(Puzzle.difficulty == difficulty.upper())
    if theme:
        query = query.filter(Puzzle.theme == theme)
    
    puzzles = query.offset(skip).limit(limit).all()
    return puzzles

@app.get("/api/puzzles/{puzzle_id}", response_model=PuzzleResponse)
def get_puzzle(puzzle_id: int, db: Session = Depends(get_db)):
    """Get specific puzzle by ID"""
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id).first()
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    return puzzle

@app.post("/api/puzzles/{puzzle_id}/attempt", response_model=PuzzleAttemptResponse)
def submit_puzzle_attempt(
    puzzle_id: int,
    attempt: PuzzleAttemptCreate,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a puzzle attempt and award XP"""
    current_user = db.query(User).filter(User.id == user_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id).first()
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    
    # Calculate XP earned
    xp_earned = 0
    if attempt.is_solved:
        xp_earned = puzzle.xp_reward
        # Reduce XP for hints used
        xp_earned = max(5, xp_earned - (attempt.hints_used * 2))
        
        # Award XP to user
        current_user.total_xp += xp_earned
        
        # Update level (simple: 100 XP per level)
        current_user.level = (current_user.total_xp // 100) + 1
        
        # Update puzzle stats
        puzzle.success_count += 1
    
    puzzle.attempts_count += 1
    
    # Create attempt record
    puzzle_attempt = PuzzleAttempt(
        user_id=current_user.id,
        puzzle_id=puzzle_id,
        is_solved=attempt.is_solved,
        moves_made=attempt.moves_made,
        time_taken=attempt.time_taken,
        hints_used=attempt.hints_used,
        xp_earned=xp_earned
    )
    
    db.add(puzzle_attempt)
    if attempt.is_solved:
        create_notification(
            db,
            current_user.id,
            "achievement",
            "Puzzle solved!",
            f"You earned {xp_earned} XP. Great work!",
            link_url=f"/puzzles/{puzzle_id}",
        )
    db.commit()
    db.refresh(puzzle_attempt)
    
    return puzzle_attempt

# ==================== STOCKFISH PUZZLE ANALYSIS ENDPOINTS ====================

# Request/Response Models
class AnalyzePositionRequest(BaseModel):
    fen: str
    depth: Optional[int] = 15


class HintRequest(BaseModel):
    fen: str
    hint_level: int  # 1, 2, or 3
    puzzle_id: int

class ValidatePuzzleRequest(BaseModel):
    fen: str
    solution_moves: List[str]  # UCI format: ['e2e4', 'e7e5']

class PuzzleValidationResponse(BaseModel):
    success: bool
    is_valid: bool
    best_move: str
    suggested_difficulty: str
    tactical_theme: str
    message: str

@app.post("/api/puzzles/analyze")
def analyze_position(request: AnalyzePositionRequest):
    """
    Analyze a chess position using Stockfish
    Returns best move, evaluation, and top moves
    """
    sf = get_stockfish_service()
    result = sf.analyze_position(request.fen, request.depth)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@app.post("/api/puzzles/{puzzle_id}/hint")
def get_hint(
    puzzle_id: int,
    request: HintRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a hint for a puzzle - deducts XP from student
    Level 1: Vague (costs 2 XP)
    Level 2: Moderate (costs 4 XP)  
    Level 3: Specific (costs 8 XP)
    """
    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get hint from Stockfish
    hint_svc = get_hint_service()
    result = hint_svc.get_hint(request.fen, request.hint_level)

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Failed to generate hint")
        )

    xp_cost = result["xp_cost"]

    # Check if user has enough XP
    if user.xp < xp_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough XP! You need {xp_cost} XP but only have {user.xp}."
        )

    # Deduct XP
    user.xp -= xp_cost
    db.commit()

    return {
        "success": True,
        "hint_level": result["hint_level"],
        "hint_text": result["hint_text"],
        "xp_cost": xp_cost,
        "remaining_xp": user.xp,
    }

@app.post("/api/puzzles/validate")
def validate_puzzle(request: ValidatePuzzleRequest):
    """
    Validate a puzzle solution using Stockfish
    Returns whether the solution is correct and suggests improvements
    """
    sf = get_stockfish_service()
    
    # Validate the puzzle
    validation = sf.validate_puzzle(request.fen, request.solution_moves)
    
    if not validation["success"]:
        raise HTTPException(status_code=400, detail=validation.get("error"))
    
    # Get additional info
    difficulty = sf.suggest_difficulty(request.fen)
    theme = sf.detect_tactic_theme(request.fen, request.solution_moves)
    
    return {
        "success": True,
        "is_valid": validation["is_valid"],
        "best_move": validation["best_move"],
        "solution_move": validation["solution_first_move"],
        "matches": validation["matches"],
        "suggested_difficulty": difficulty,
        "tactical_theme": theme,
        "message": validation["message"],
        "final_evaluation": validation["final_evaluation"]
    }

@app.post("/api/puzzles/auto-solve")
def auto_solve_puzzle(request: AnalyzePositionRequest):
    """
    Given a position, automatically find the best solution
    Perfect for coaches creating puzzles
    """
    sf = get_stockfish_service()
    analysis = sf.analyze_position(request.fen, depth=20)
    
    if not analysis["success"]:
        raise HTTPException(status_code=400, detail=analysis.get("error"))
    
    difficulty = sf.suggest_difficulty(request.fen)
    
    return {
        "success": True,
        "best_move": analysis["best_move"],
        "evaluation": analysis["evaluation"],
        "top_moves": analysis["top_moves"],
        "is_mate": analysis["is_mate"],
        "suggested_difficulty": difficulty
    }

# ==================== GAME ENDPOINTS ====================

@app.get("/api/games", response_model=list[GameResponse])
def get_games(
    user_id: int = None,
    skip: int = 0,
    limit: int = 20,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of games"""
    query = db.query(Game)
    
    if user_id:
        query = query.filter(
            (Game.white_player_id == user_id) | (Game.black_player_id == user_id)
        )
    
    games = query.order_by(Game.started_at.desc()).offset(skip).limit(limit).all()
    return games

@app.get("/api/games/{game_id}", response_model=GameResponse)
def get_game(
    game_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific game by ID"""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check if user is part of this game
    if game.white_player_id != current_user_id and game.black_player_id != current_user_id:
        raise HTTPException(status_code=403, detail="You are not part of this game")
    
    return game

@app.post("/api/games", response_model=GameResponse)
def create_game(
    game_data: GameCreate,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new game"""
    # Verify both players exist
    white_player = db.query(User).filter(User.id == game_data.white_player_id).first()
    black_player = db.query(User).filter(User.id == game_data.black_player_id).first()
    
    if not white_player or not black_player:
        raise HTTPException(status_code=404, detail="One or both players not found")
    
    # Verify current user is one of the players
    if current_user_id != game_data.white_player_id and current_user_id != game_data.black_player_id:
        raise HTTPException(status_code=403, detail="You can only create games you are part of")
    
    new_game = Game(
        white_player_id=game_data.white_player_id,
        black_player_id=game_data.black_player_id,
        time_control=game_data.time_control
    )
    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    return new_game

@app.post("/api/games/{game_id}/move", response_model=GameResponse)
def make_move(
    game_id: int,
    move_data: GameMoveCreate,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Make a move in a chess game"""
    import chess
    import chess.pgn
    
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check if user is part of this game
    if game.white_player_id != current_user_id and game.black_player_id != current_user_id:
        raise HTTPException(status_code=403, detail="You are not part of this game")
    
    # Check if game has ended
    if game.result:
        raise HTTPException(status_code=400, detail="Game has already ended")
    
    # Initialize chess board - rebuild from PGN to preserve move history, fallback to final_fen
    board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    
    # Replay existing moves from PGN to get current position with move history
    if game.pgn:
        try:
            pgn_io = chess.pgn.StringIO(game.pgn)
            game_node = chess.pgn.read_game(pgn_io)
            if game_node:
                board = game_node.board()
        except Exception as e:
            print(f"Warning: PGN parsing failed, using final_fen: {e}")
            # If PGN parsing fails, use final_fen as fallback
            if game.final_fen:
                try:
                    board = chess.Board(game.final_fen)
                except:
                    board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
            else:
                board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    elif game.final_fen:
        # No PGN but we have final_fen, use it
        try:
            board = chess.Board(game.final_fen)
        except:
            board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    
    # Determine whose turn it is
    is_white_turn = board.turn == chess.WHITE
    is_current_user_white = game.white_player_id == current_user_id
    
    if is_white_turn != is_current_user_white:
        raise HTTPException(status_code=400, detail="It's not your turn")
    
    # Create move in UCI format (e.g., "e2e4" or "e7e8q" for promotion)
    # Only add promotion if the move actually requires it (pawn reaching 8th/1st rank)
    from_square = chess.parse_square(move_data.from_square)
    to_square = chess.parse_square(move_data.to_square)
    
    # Check if this is a promotion move
    is_promotion_square = chess.square_rank(to_square) in [0, 7]  # 1st or 8th rank
    piece = board.piece_at(from_square)
    is_pawn = piece and piece.piece_type == chess.PAWN
    
    move_uci = f"{move_data.from_square}{move_data.to_square}"
    # Only add promotion suffix if it's actually a promotion move
    if is_pawn and is_promotion_square and move_data.promotion:
        move_uci += move_data.promotion.lower()
    
    try:
        move = board.push(chess.Move.from_uci(move_uci))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid move: {move_uci} - {str(e)}")
    
    # Update game state
    game.total_moves += 1
    game.final_fen = board.fen()
    
    # Update PGN - rebuild by replaying existing PGN and appending new move
    pgn_board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    pgn_game = chess.pgn.Game()
    pgn_game.setup(pgn_board)
    node = pgn_game
    
    # Replay existing PGN moves if available
    if game.pgn:
        try:
            pgn_io = chess.pgn.StringIO(game.pgn)
            existing_game = chess.pgn.read_game(pgn_io)
            if existing_game:
                # Replay all moves from existing PGN
                for existing_move in existing_game.mainline_moves():
                    if existing_move in pgn_board.legal_moves:
                        node = node.add_variation(existing_move)
                        pgn_board.push(existing_move)
                    else:
                        print(f"Warning: Existing PGN move {existing_move} is not legal, skipping PGN rebuild")
                        # Reset and start fresh
                        pgn_board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
                        pgn_game = chess.pgn.Game()
                        pgn_game.setup(pgn_board)
                        node = pgn_game
                        break
        except Exception as e:
            print(f"Warning: Failed to parse existing PGN: {e}")
            # Reset to starting position
            pgn_board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
            pgn_game = chess.pgn.Game()
            pgn_game.setup(pgn_board)
            node = pgn_game
    
    # Add the new move (the one we just made)
    # Get the move we just made - use move variable or get from move_stack as fallback
    new_move = move if move else (board.move_stack[-1] if board.move_stack else None)
    
    if new_move is None:
        print(f"Error: Could not determine the move that was just made")
        # Skip PGN update if we can't determine the move
    elif new_move in pgn_board.legal_moves:
        node = node.add_variation(new_move)
    else:
        # Try to find matching legal move (might be promotion difference)
        matching_move = None
        for legal_move in pgn_board.legal_moves:
            if (legal_move.from_square == new_move.from_square and 
                legal_move.to_square == new_move.to_square):
                matching_move = legal_move
                break
        if matching_move:
            node = node.add_variation(matching_move)
        else:
            print(f"Error: Cannot add move {new_move} to PGN - not legal in current state")
    
    # Export PGN (append "*" when game in progress so clients like chess.js can parse it)
    exporter = chess.pgn.StringExporter(headers=False, variations=False, comments=False)
    game.pgn = str(pgn_game.accept(exporter)).strip()
    if not game.pgn.endswith(("*", "1-0", "0-1", "1/2-1/2")):
        game.pgn = game.pgn + " *"
    
    # Check for game end conditions
    if board.is_checkmate():
        game.result = "1-0" if is_current_user_white else "0-1"
        # For bot games, set winner correctly
        bot_user = get_or_create_bot_user(db)
        if game.white_player_id == bot_user.id or game.black_player_id == bot_user.id:
            # This is a bot game - winner is the human player (current_user_id)
            game.winner_id = current_user_id
        else:
            game.winner_id = current_user_id
        game.ended_at = datetime.utcnow()
    elif board.is_stalemate() or board.is_insufficient_material() or board.is_seventyfive_moves() or board.is_fivefold_repetition():
        game.result = "1/2-1/2"
        game.ended_at = datetime.utcnow()
    
    db.commit()
    db.refresh(game)
    
    # Don't make bot move here - let frontend trigger it after showing player's move
    # This ensures the player sees their move first before bot responds
    
    return game

# ==================== BOT GAME ENDPOINTS ====================

def get_or_create_bot_user(db: Session) -> User:
    """Get or create a special bot user"""
    # Use a special username to identify bot user
    bot_user = db.query(User).filter(User.username == "__BOT__").first()
    if not bot_user:
        bot_user = User(
            email="bot@prodigypawns.com",
            username="__BOT__",
            full_name="ChessBot",
            hashed_password=get_password_hash("bot_password_not_used"),
            role=UserRole.student,
            rating=1000,
            level=1,
            total_xp=0,
            is_active=True
        )
        db.add(bot_user)
        db.commit()
        db.refresh(bot_user)
    return bot_user

@app.post("/api/games/bot", response_model=GameResponse)
def create_bot_game(
    bot_data: BotGameCreate,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new game against a bot"""
    import chess
    
    bot_user = get_or_create_bot_user(db)
    
    # Determine player colors
    if bot_data.player_color.lower() == 'white':
        white_player_id = current_user_id
        black_player_id = bot_user.id
    else:
        white_player_id = bot_user.id
        black_player_id = current_user_id
    
    # Create game
    new_game = Game(
        white_player_id=white_player_id,
        black_player_id=black_player_id,
        time_control="Unlimited",
        bot_difficulty=bot_data.bot_difficulty,
        bot_depth=bot_data.bot_depth
    )
    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    
    # If bot plays white, make first move
    if white_player_id == bot_user.id:
        try:
            _make_bot_move_if_needed(new_game, db, bot_user.id)
            db.refresh(new_game)
        except Exception as e:
            print(f"Error making initial bot move: {e}")
    
    return new_game

@app.post("/api/games/{game_id}/bot-move", response_model=GameResponse)
def get_bot_move(
    game_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get bot's move (triggered automatically after player move)"""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check if user is part of this game
    if game.white_player_id != current_user_id and game.black_player_id != current_user_id:
        raise HTTPException(status_code=403, detail="You are not part of this game")
    
    # Check if this is a bot game
    bot_user = get_or_create_bot_user(db)
    if game.white_player_id != bot_user.id and game.black_player_id != bot_user.id:
        raise HTTPException(status_code=400, detail="This is not a bot game")
    
    _make_bot_move_if_needed(game, db, bot_user.id)
    db.refresh(game)
    return game

def _make_bot_move_if_needed(game: Game, db: Session, bot_user_id: int):
    """Make bot move if it's bot's turn"""
    import chess
    import chess.pgn
    
    # Check if game has ended
    if game.result:
        print(f"Bot move skipped: Game already ended with result {game.result}")
        return
    
    # Initialize chess board - use final_fen if available, otherwise starting_fen
    if game.final_fen:
        try:
            board = chess.Board(game.final_fen)
        except:
            board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    else:
        board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    
    # Replay existing moves from PGN if available (as backup/verification)
    if game.pgn:
        try:
            pgn_io = chess.pgn.StringIO(game.pgn)
            game_node = chess.pgn.read_game(pgn_io)
            if game_node:
                pgn_board = game_node.board()
                # Use PGN board if it matches the final_fen, otherwise trust final_fen
                if pgn_board.fen() == board.fen():
                    board = pgn_board
        except Exception as e:
            print(f"Warning: PGN parsing failed, using FEN: {e}")
            # Continue with board from FEN
    
    # Determine whose turn it is
    is_white_turn = board.turn == chess.WHITE
    is_bot_white = game.white_player_id == bot_user_id
    is_bot_black = game.black_player_id == bot_user_id
    
    print(f"Bot move check: is_white_turn={is_white_turn}, is_bot_white={is_bot_white}, is_bot_black={is_bot_black}")
    print(f"Board FEN: {board.fen()}")
    print(f"Game final_fen: {game.final_fen}")
    print(f"Game PGN: {game.pgn}")
    
    # Check if it's bot's turn
    if (is_white_turn and not is_bot_white) or (not is_white_turn and not is_bot_black):
        print(f"Bot move skipped: Not bot's turn (white turn: {is_white_turn}, bot is white: {is_bot_white}, bot is black: {is_bot_black})")
        return  # Not bot's turn
    
    # Check if there are legal moves
    legal_moves = list(board.legal_moves)
    if not legal_moves:
        print("Bot move skipped: No legal moves available")
        return
    
    print(f"Bot has {len(legal_moves)} legal moves available")
    
    # Get bot difficulty/depth
    bot_depth = getattr(game, 'bot_depth', 15)
    if not bot_depth:
        bot_depth = 15
    
    print(f"Bot making move: depth={bot_depth}, position={board.fen()}")
    
    # Get Stockfish service and make move
    sf = get_stockfish_service()
    analysis = sf.analyze_position(board.fen(), depth=bot_depth)
    
    print(f"Stockfish analysis result: {analysis}")
    
    if not analysis.get("success"):
        error_msg = analysis.get("error", "Unknown error")
        print(f"Stockfish failed: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to get bot move: {error_msg}")
    
    best_move_uci = analysis.get("best_move")
    
    # If Stockfish didn't return a best move, try to get a legal move as fallback
    if not best_move_uci:
        print("Warning: Stockfish returned no best move, trying to find a legal move")
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            print("No legal moves available - game might be over")
            raise HTTPException(status_code=400, detail="No legal moves available")
        # Use first legal move as fallback
        best_move_uci = legal_moves[0].uci()
        print(f"Using fallback move: {best_move_uci}")
    else:
        print(f"Bot best move: {best_move_uci}")
    
    # Make the move
    try:
        move = board.push(chess.Move.from_uci(best_move_uci))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid bot move: {best_move_uci} - {str(e)}")
    
    # Update game state
    game.total_moves += 1
    game.final_fen = board.fen()
    
    # Update PGN - rebuild by replaying existing PGN and appending new move
    pgn_board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    pgn_game = chess.pgn.Game()
    pgn_game.setup(pgn_board)
    node = pgn_game
    
    # Replay existing PGN moves if available
    if game.pgn:
        try:
            pgn_io = chess.pgn.StringIO(game.pgn)
            existing_game = chess.pgn.read_game(pgn_io)
            if existing_game:
                # Replay all moves from existing PGN
                for existing_move in existing_game.mainline_moves():
                    if existing_move in pgn_board.legal_moves:
                        node = node.add_variation(existing_move)
                        pgn_board.push(existing_move)
                    else:
                        print(f"Warning: Existing PGN move {existing_move} is not legal, skipping PGN rebuild")
                        # Reset and start fresh
                        pgn_board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
                        pgn_game = chess.pgn.Game()
                        pgn_game.setup(pgn_board)
                        node = pgn_game
                        break
        except Exception as e:
            print(f"Warning: Failed to parse existing PGN: {e}")
            # Reset to starting position
            pgn_board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
            pgn_game = chess.pgn.Game()
            pgn_game.setup(pgn_board)
            node = pgn_game
    
    # Add the new bot move (the one we just made)
    # Get the move we just made - use move variable or get from move_stack as fallback
    new_move = move if move else (board.move_stack[-1] if board.move_stack else None)
    
    if new_move is None:
        print(f"Error: Could not determine the bot move that was just made")
        # Skip PGN update if we can't determine the move
    elif new_move in pgn_board.legal_moves:
        node = node.add_variation(new_move)
    else:
        # Try to find matching legal move (might be promotion difference)
        matching_move = None
        for legal_move in pgn_board.legal_moves:
            if (legal_move.from_square == new_move.from_square and 
                legal_move.to_square == new_move.to_square):
                matching_move = legal_move
                break
        if matching_move:
            node = node.add_variation(matching_move)
        else:
            print(f"Error: Cannot add bot move {new_move} to PGN - not legal in current state")
    
    exporter = chess.pgn.StringExporter(headers=False, variations=False, comments=False)
    game.pgn = str(pgn_game.accept(exporter)).strip()
    if not game.pgn.endswith(("*", "1-0", "0-1", "1/2-1/2")):
        game.pgn = game.pgn + " *"
    
    # Check for game end conditions
    if board.is_checkmate():
        # Bot wins if it's bot's color turn (meaning bot just made winning move)
        if is_bot_white:
            game.result = "1-0"
            game.winner_id = bot_user_id
        else:
            game.result = "0-1"
            game.winner_id = bot_user_id
        game.ended_at = datetime.utcnow()
    elif board.is_stalemate() or board.is_insufficient_material() or board.is_seventyfive_moves() or board.is_fivefold_repetition():
        game.result = "1/2-1/2"
        game.ended_at = datetime.utcnow()
    
    db.commit()

# ==================== USER SEARCH ENDPOINTS ====================
# Note: search endpoint is defined above in USER ENDPOINTS section to avoid route conflicts

# ==================== GAME INVITE ENDPOINTS ====================

@app.post("/api/game-invites", response_model=GameInviteResponse)
def create_game_invite(
    invite_data: GameInviteCreate,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a game invite"""
    # Verify invitee exists and is a student
    invitee = db.query(User).filter(User.id == invite_data.invitee_id).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found")
    
    if invitee.role != UserRole.student:
        raise HTTPException(status_code=400, detail="Can only invite students")
    
    if invite_data.invitee_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")
    
    # Check for existing pending invite
    existing_invite = db.query(GameInvite).filter(
        GameInvite.inviter_id == current_user_id,
        GameInvite.invitee_id == invite_data.invitee_id,
        GameInvite.status == "pending"
    ).first()
    
    if existing_invite:
        raise HTTPException(status_code=400, detail="You already have a pending invite with this user")
    
    # Create new invite
    new_invite = GameInvite(
        inviter_id=current_user_id,
        invitee_id=invite_data.invitee_id,
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(new_invite)
    db.flush()  # ensure invite is in session so commit persists both
    inviter = db.query(User).filter(User.id == current_user_id).first()
    # Notify the invitee (Student B) immediately so they see it in the bell
    create_notification(
        db,
        invite_data.invitee_id,
        "system",
        "Game invite!",
        f"{inviter.full_name} invited you to play chess. Tap to view in Play.",
        link_url="/chess-game",
    )
    db.commit()
    db.refresh(new_invite)
    
    # Load relationships for response
    invitee_user = db.query(User).filter(User.id == invite_data.invitee_id).first()
    
    response_data = GameInviteResponse.model_validate(new_invite).model_dump(mode="json")
    response_data["inviter"] = UserResponse.model_validate(inviter).model_dump(mode="json")
    response_data["invitee"] = UserResponse.model_validate(invitee_user).model_dump(mode="json")
    
    return response_data

@app.get("/api/game-invites", response_model=List[GameInviteResponse])
def get_game_invites(
    status: Optional[str] = None,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get game invites for current user (sent or received)"""
    query = db.query(GameInvite).filter(
        (GameInvite.inviter_id == current_user_id) | (GameInvite.invitee_id == current_user_id)
    )
    
    if status:
        query = query.filter(GameInvite.status == status)
    
    invites = query.order_by(GameInvite.created_at.desc()).all()
    
    result = []
    for invite in invites:
        inviter = db.query(User).filter(User.id == invite.inviter_id).first()
        invitee = db.query(User).filter(User.id == invite.invitee_id).first()
        
        invite_data = GameInviteResponse.model_validate(invite).model_dump(mode="json")
        invite_data["inviter"] = UserResponse.model_validate(inviter).model_dump(mode="json")
        invite_data["invitee"] = UserResponse.model_validate(invitee).model_dump(mode="json")
        result.append(invite_data)
    
    return result

@app.post("/api/game-invites/{invite_id}/accept", response_model=GameResponse)
def accept_game_invite(
    invite_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a game invite and create the game"""
    invite = db.query(GameInvite).filter(GameInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    # Verify current user is the invitee
    if invite.invitee_id != current_user_id:
        raise HTTPException(status_code=403, detail="You can only accept invites sent to you")
    
    # Verify invite is still pending
    if invite.status != "pending":
        raise HTTPException(status_code=400, detail="Invite has already been responded to")
    
    # Check if invite expired
    if invite.expires_at and invite.expires_at < datetime.utcnow():
        invite.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Invite has expired")
    
    # Create the game
    new_game = Game(
        white_player_id=invite.inviter_id,
        black_player_id=invite.invitee_id,
        time_control="unlimited"
    )
    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    
    # Update invite status
    invite.status = "accepted"
    invite.game_id = new_game.id
    invite.responded_at = datetime.utcnow()
    invitee_user = db.query(User).filter(User.id == invite.invitee_id).first()
    create_notification(
        db,
        invite.inviter_id,
        "system",
        "Invite accepted!",
        f"{invitee_user.full_name} accepted your game invite. Let's play!",
        link_url=f"/chess-game/{new_game.id}" if new_game else None,
    )
    db.commit()
    
    return new_game

@app.post("/api/game-invites/{invite_id}/reject")
def reject_game_invite(
    invite_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a game invite"""
    invite = db.query(GameInvite).filter(GameInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    # Verify current user is the invitee
    if invite.invitee_id != current_user_id:
        raise HTTPException(status_code=403, detail="You can only reject invites sent to you")
    
    # Verify invite is still pending
    if invite.status != "pending":
        raise HTTPException(status_code=400, detail="Invite has already been responded to")
    
    invite.status = "rejected"
    invite.responded_at = datetime.utcnow()
    invitee_user = db.query(User).filter(User.id == invite.invitee_id).first()
    create_notification(
        db,
        invite.inviter_id,
        "system",
        "Invite declined",
        f"{invitee_user.full_name} declined your game invite.",
        link_url="/chess-game",
    )
    db.commit()
    
    return {"message": "Invite rejected"}

# ==================== ACHIEVEMENT ENDPOINTS ====================

@app.get("/api/achievements", response_model=list[AchievementResponse])
def get_achievements(db: Session = Depends(get_db)):
    """Get all active achievements"""
    achievements = db.query(Achievement).filter(Achievement.is_active == True).all()
    return achievements

# ==================== DAILY CHALLENGE ENDPOINTS ====================

@app.get("/api/daily-challenge", response_model=DailyChallengeResponse)
def get_daily_challenge(db: Session = Depends(get_db)):
    """Get today's daily challenge"""
    from datetime import date
    today = date.today()
    
    challenge = db.query(DailyChallenge).filter(
        DailyChallenge.date >= today,
        DailyChallenge.is_active == True
    ).first()
    
    if not challenge:
        raise HTTPException(status_code=404, detail="No daily challenge available today")
    return challenge

# ==================== LEADERBOARD ENDPOINTS ====================

@app.get("/api/leaderboard")
def get_leaderboard(
    leaderboard_type: str = "xp",
    period: str = "all_time",
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get leaderboard rankings"""
    if leaderboard_type == "xp":
        users = db.query(User).order_by(User.total_xp.desc()).limit(limit).all()
        score_field = "total_xp"
    elif leaderboard_type == "rating":
        users = db.query(User).order_by(User.rating.desc()).limit(limit).all()
        score_field = "rating"
    else:
        users = db.query(User).order_by(User.total_xp.desc()).limit(limit).all()
        score_field = "total_xp"
    
    return [
        {
            "rank": idx + 1,
            "user_id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "score": getattr(user, score_field),
            "level": user.level
        }
        for idx, user in enumerate(users)
    ]


# ==================== NOTIFICATION HELPERS & ENDPOINTS ====================

def create_notification(
    db: Session,
    user_id: int,
    category: str,
    title: str,
    message: str,
    link_url: Optional[str] = None,
):
    """Create an in-app notification for a user. Caller must commit."""
    notification = Notification(
        user_id=user_id,
        category=category,
        title=title,
        message=message,
        link_url=link_url,
    )
    db.add(notification)
    return notification


@app.get("/api/notifications", response_model=List[NotificationResponse])
def get_notifications(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
):
    """Get current user's notifications, newest first."""
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return notifications


@app.patch("/api/notifications/{notification_id}", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.read = True
    db.commit()
    db.refresh(notification)
    return notification


@app.post("/api/notifications/mark-all-read")
def mark_all_notifications_read(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read for the current user."""
    to_update = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.read == False)
        .all()
    )
    for n in to_update:
        n.read = True
    db.commit()
    return {"marked": len(to_update)}


@app.delete("/api/notifications/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def dismiss_notification(
    notification_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove (dismiss) a notification."""
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notification)
    db.commit()
    return None


# ==================== STATS ENDPOINTS ====================

@app.get("/api/users/me/stats")
def get_user_stats(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's statistics"""
    current_user = db.query(User).filter(User.id == user_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Count games played
    games_played = db.query(Game).filter(
        (Game.white_player_id == current_user.id) | (Game.black_player_id == current_user.id)
    ).count()
    
    # Count games won
    games_won = db.query(Game).filter(
        Game.winner_id == current_user.id
    ).count()
    
    # Count puzzles solved
    puzzles_solved = db.query(PuzzleAttempt).filter(
        PuzzleAttempt.user_id == current_user.id,
        PuzzleAttempt.is_solved == True
    ).count()
    
    # Count total puzzle attempts
    puzzle_attempts = db.query(PuzzleAttempt).filter(
        PuzzleAttempt.user_id == current_user.id
    ).count()
    
    return {
        "games_played": games_played,
        "games_won": games_won,
        "win_rate": (games_won / games_played * 100) if games_played > 0 else 0,
        "puzzles_solved": puzzles_solved,
        "puzzle_attempts": puzzle_attempts,
        "puzzle_accuracy": (puzzles_solved / puzzle_attempts * 100) if puzzle_attempts > 0 else 0,
        "total_xp": current_user.total_xp,
        "level": current_user.level,
        "rating": current_user.rating
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)