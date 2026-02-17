from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Optional

# Import models and utilities
from models import User, Game, Puzzle, PuzzleAttempt, Achievement, DailyChallenge, PuzzleRace, UserRole
from database import get_db
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user,
    authenticate_user
)
from schemas import (
    UserCreate, 
    UserResponse, 
    UserLogin, 
    Token,
    PuzzleResponse,
    GameResponse,
    AchievementResponse,
    DailyChallengeResponse,
    PuzzleAttemptCreate,
    PuzzleAttemptResponse,
    UserUpdate
)
from stockfish_service import get_stockfish_service
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

@app.post("/api/auth/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if email already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
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
    
    # Create access token
    access_token = create_access_token(data={"sub": new_user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@app.post("/api/auth/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login user and return JWT token - supports OAuth2 form"""
    # OAuth2PasswordRequestForm uses 'username' field, but we store 'email'
    # So we treat username as email
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_info(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current logged-in user information"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ==================== USER ENDPOINTS ====================

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
    db.commit()
    db.refresh(puzzle_attempt)
    
    return puzzle_attempt

# ==================== STOCKFISH PUZZLE ANALYSIS ENDPOINTS ====================

# Request/Response Models
class AnalyzePositionRequest(BaseModel):
    fen: str
    depth: Optional[int] = 15

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