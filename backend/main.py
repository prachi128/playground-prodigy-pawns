from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from typing import List, Optional, Dict, Set
import io
import random

from apscheduler.schedulers.background import BackgroundScheduler

# Import models and utilities
from models import (
    User,
    Game,
    Puzzle,
    PuzzleAttempt,
    Achievement,
    DailyChallenge,
    PuzzleRace,
    UserRole,
    GameInvite,
    Notification,
    ParentStudent,
    CoachSignupInvite,
    Assignment,
    AssignmentPuzzle,
    AssignmentCompletion,
    StudentBatch,
    ShopPurchase,
)
from database import get_db, SessionLocal, validate_required_schema
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
    ParentSignup,
    CoachSignup,
    PuzzleRaceRoomState,
    PuzzleRaceRoomCreate,
    PuzzleRaceCarSelect,
    PuzzleRaceNameSet,
)
from stockfish_service import get_stockfish_service
from bot_opponents import get_bot_rating_for_game
from bot_runtime import (
    complete_bot_move_job,
    enqueue_bot_move_job,
    log_bot_move_telemetry,
    mark_job_processing,
    resolve_runtime_profile,
)
from bot_worker import process_pending_jobs
from bot_openings import choose_opening_move
from hint_service import get_hint_service
from coach_endpoints import router as coach_router
from student_management_backend import router as student_router, admin_router as admin_students_router
from parent_endpoints import router as parent_router
from batch_endpoints import router as batch_router, admin_router
from assignment_endpoints import router as assignment_router
from attendance_endpoints import router as attendance_router
from bot_admin_endpoints import router as bot_admin_router
# Level from rating (max level 15; level is no longer from XP)
LEVEL_MIN = 1
LEVEL_MAX = 15

# Uploaded avatars (served under /uploads/avatars/)
_BACKEND_ROOT = Path(__file__).resolve().parent
_UPLOAD_ROOT = _BACKEND_ROOT / "uploads"
_AVATAR_UPLOAD_DIR = _UPLOAD_ROOT / "avatars"
_MAX_AVATAR_BYTES = 2 * 1024 * 1024
# Rating thresholds: level 2 starts at 300, level 3 at 500, ..., level 15 at 2900+
_RATING_THRESHOLDS = [300, 500, 700, 900, 1100, 1300, 1500, 1700, 1900, 2100, 2300, 2500, 2700, 2900]
XP_PER_STAR = 250


def level_from_rating(rating: int) -> int:
    """Compute level 1-15 from player rating. Level is driven only by rating."""
    r = max(100, rating)
    level = LEVEL_MIN
    for t in _RATING_THRESHOLDS:
        if r >= t:
            level += 1
        else:
            break
    return min(level, LEVEL_MAX)


def get_level_category(level: int) -> str:
    """Category name for display: Pawn, Knight, Bishop, Rook, Queen, King."""
    if level <= 2:
        return "Pawn"
    if level <= 5:
        return "Knight"
    if level <= 8:
        return "Bishop"
    if level <= 11:
        return "Rook"
    if level <= 14:
        return "Queen"
    return "King"


def sync_user_level_from_rating(user: User) -> None:
    """Ensure user.level matches rating (for existing users or if level got out of sync)."""
    expected = level_from_rating(user.rating or 100)
    if user.level != expected:
        user.level = expected


# Elo rating update (K=32, min 100)
def _score_white_from_result(result) -> float:
    res = str(getattr(result, "value", result) or "")
    if res == "1-0":
        return 1.0
    if res == "0-1":
        return 0.0
    if res == "1/2-1/2":
        return 0.5
    return 0.5


def update_ratings_after_game(game: Game, db: Session) -> None:
    """Update both players' ratings using Elo only for PvP games. No rating change when playing vs bot."""
    if not game.result:
        return
    white = db.query(User).filter(User.id == game.white_player_id).first()
    black = db.query(User).filter(User.id == game.black_player_id).first()
    if not white or not black:
        return
    BOT_USERNAME = "__BOT__"
    if white.username == BOT_USERNAME or black.username == BOT_USERNAME:
        return  # Bot game: do not update anyone's rating or level
    score_white = _score_white_from_result(game.result)
    rw = white.rating or 100
    rb = black.rating or 100
    K = 32
    min_rating = 100
    expected_white = 1.0 / (1.0 + 10.0 ** ((rb - rw) / 400.0))
    delta_white = K * (score_white - expected_white)
    white.rating = max(min_rating, round((white.rating or 100) + delta_white))
    white.level = level_from_rating(white.rating)
    black.rating = max(min_rating, round((black.rating or 100) - delta_white))
    black.level = level_from_rating(black.rating)


# Inactivity auto-resign: if the player whose turn it is doesn't move within this many seconds, they lose.
INACTIVITY_AUTO_RESIGN_SECONDS = int(2.5 * 60)  # 2.5 minutes per turn

# Total clock per player (for display and flag-on-time). Used when deducting time in make_move.
INITIAL_CLOCK_MS = 10 * 60 * 1000  # 10 minutes


def base_clock_ms_from_time_control(time_control: Optional[str]) -> Optional[int]:
    """Parse base clock minutes from controls like '5+0'. Unlimited -> None."""
    value = (time_control or "").strip().lower()
    if not value or value == "unlimited":
        return None
    base_part = value.split("+", 1)[0].strip()
    try:
        minutes = int(base_part)
    except (TypeError, ValueError):
        return INITIAL_CLOCK_MS
    if minutes <= 0:
        return INITIAL_CLOCK_MS
    return minutes * 60 * 1000

# Puzzle Racer countdown length (seconds) – must match frontend COUNTDOWN_SECONDS
PUZZLE_RACER_COUNTDOWN_SECONDS = 10

# Total number of car emojis available – must match frontend CAR_EMOJIS.length
PUZZLE_RACER_TOTAL_CARS = 7
PUZZLE_RACER_COUNTDOWN_SECONDS = 10
PUZZLE_RACER_RACE_DURATION_SECONDS = 150
PUZZLE_RACER_TOTAL_RACE_SECONDS = PUZZLE_RACER_COUNTDOWN_SECONDS + PUZZLE_RACER_RACE_DURATION_SECONDS


def to_utc_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def check_auto_resign_timeout(game: Game, db: Session) -> None:
    """If the player whose turn it is has exceeded the timeout, end the game (they lose)."""
    try:
        if game.result:
            return
        # Beat-the-bot mode is intentionally untimed.
        if getattr(game, "bot_difficulty", None):
            return
        # When did the current turn start?
        if (game.total_moves or 0) == 0:
            turn_started = game.started_at
        else:
            turn_started = getattr(game, "last_move_at", None) or game.started_at
        if not turn_started:
            return
        elapsed = (datetime.utcnow() - turn_started).total_seconds()
        if elapsed < INACTIVITY_AUTO_RESIGN_SECONDS:
            return
        # Whose turn is it? (FEN second token is side to move: "w" or "b")
        fen = (game.final_fen or game.starting_fen or "").strip()
        parts = fen.split()
        turn_token = parts[1] if len(parts) > 1 else "w"
        white_to_move = turn_token.lower() == "w"
        # Timed-out player loses: white to move timed out -> 0-1, black to move timed out -> 1-0
        if white_to_move:
            game.result = "0-1"
            game.winner_id = game.black_player_id
        else:
            game.result = "1-0"
            game.winner_id = game.white_player_id
        game.result_reason = "auto_resign"
        game.ended_at = datetime.now(timezone.utc)
        if game.pgn and not game.pgn.rstrip().endswith(("1-0", "0-1", "1/2-1/2")):
            game.pgn = (game.pgn.rstrip() + " " + game.result).strip()
        update_ratings_after_game(game, db)
        db.commit()
        db.refresh(game)
    except Exception:
        db.rollback()
        try:
            db.refresh(game)
        except Exception:
            pass
        # Don't re-raise: allow get_game to return the game so the frontend doesn't 500/loop


def check_clock_flag_timeout(game: Game, db: Session) -> None:
    """If a timed game's active player's clock is <= 0, end game immediately by timeout."""
    try:
        if game.result:
            return
        # Bot and unlimited games are untimed.
        if getattr(game, "bot_difficulty", None):
            return
        if (str(getattr(game, "time_control", "") or "").strip().lower() == "unlimited"):
            return

        # Resolve current turn start
        if (game.total_moves or 0) == 0:
            turn_started = game.started_at
        else:
            turn_started = getattr(game, "last_move_at", None) or game.started_at
        turn_started_utc = to_utc_aware(turn_started)
        if not turn_started_utc:
            return

        base_clock_ms = base_clock_ms_from_time_control(game.time_control) or INITIAL_CLOCK_MS
        white_time_ms = game.white_time_ms if game.white_time_ms is not None else base_clock_ms
        black_time_ms = game.black_time_ms if game.black_time_ms is not None else base_clock_ms

        fen = (game.final_fen or game.starting_fen or "").strip()
        parts = fen.split()
        turn_token = parts[1] if len(parts) > 1 else "w"
        white_to_move = turn_token.lower() == "w"

        now_utc = datetime.now(timezone.utc)
        elapsed_ms = int(max(0, (now_utc - turn_started_utc).total_seconds() * 1000))

        if white_to_move:
            white_remaining = white_time_ms - elapsed_ms
            if white_remaining > 0:
                return
            game.white_time_ms = 0
            game.result = "0-1"
            game.winner_id = game.black_player_id
        else:
            black_remaining = black_time_ms - elapsed_ms
            if black_remaining > 0:
                return
            game.black_time_ms = 0
            game.result = "1-0"
            game.winner_id = game.white_player_id

        game.result_reason = "timeout"
        game.ended_at = now_utc
        game.draw_offered_by = None
        game.draw_offered_at = None
        if game.pgn and not game.pgn.rstrip().endswith(("1-0", "0-1", "1/2-1/2")):
            game.pgn = (game.pgn.rstrip() + " " + game.result).strip()
        update_ratings_after_game(game, db)
        db.commit()
        db.refresh(game)
    except Exception:
        db.rollback()
        try:
            db.refresh(game)
        except Exception:
            pass


def run_auto_resign_for_all_games() -> None:
    """Background job: find all ongoing games that have exceeded the turn timeout and end them."""
    db = SessionLocal()
    try:
        games = (
            db.query(Game)
            .filter(Game.result.is_(None), Game.ended_at.is_(None))
            .all()
        )
        for game in games:
            check_clock_flag_timeout(game, db)
            check_auto_resign_timeout(game, db)
    finally:
        db.close()


# ==================== IN-MEMORY PUZZLE RACER ROOMS (MULTIPLAYER) ====================

_puzzle_race_rooms: Dict[str, Dict] = {}


def _get_puzzle_race_room(room_id: str) -> Optional[Dict]:
    return _puzzle_race_rooms.get(room_id)


def _pick_random_available_car(room: Dict) -> int:
    """Return a random car index not already taken by another participant."""
    taken = set(room.get("car_assignments", {}).values())
    available = [i for i in range(PUZZLE_RACER_TOTAL_CARS) if i not in taken]
    if not available:
        return random.randint(0, PUZZLE_RACER_TOTAL_CARS - 1)
    return random.choice(available)


def _create_puzzle_race_room(room_id: str, host_user_id: int) -> Dict:
    car_index = random.randint(0, PUZZLE_RACER_TOTAL_CARS - 1)
    room = {
        "id": room_id,
        "host_user_id": host_user_id,
        "status": "waiting",
        "created_at": datetime.utcnow(),
        "participants": {host_user_id},
        "countdown_start_at": None,
        "car_assignments": {host_user_id: car_index},
        "racer_names": {},
    }
    _puzzle_race_rooms[room_id] = room
    return room


def _maybe_finish_race(room: Dict) -> None:
    """Auto-transition to finished if the race time has elapsed."""
    if room["status"] == "racing" and room.get("race_end_at"):
        if datetime.utcnow() >= room["race_end_at"]:
            room["status"] = "finished"


def _serialize_puzzle_race_room(room: Dict) -> PuzzleRaceRoomState:
    _maybe_finish_race(room)
    return PuzzleRaceRoomState(
        id=room["id"],
        host_user_id=room["host_user_id"],
        status=room["status"],
        created_at=room["created_at"],
        participants=sorted(list(room.get("participants", set()))),
        countdown_start_at=room.get("countdown_start_at"),
        race_end_at=room.get("race_end_at"),
        car_assignments=room.get("car_assignments", {}),
        racer_names=room.get("racer_names", {}),
        scores=room.get("scores", {}),
    )


# FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_required_schema()
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_auto_resign_for_all_games, "interval", minutes=1)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="Prodigy Pawns Student Portal API",
    description="Chess Academy Portal for Students - Play, Learn, and Grow!",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware (include both localhost and 127.0.0.1 so it works either way)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_UPLOAD_ROOT)), name="uploads")

# Include routers
app.include_router(coach_router)
app.include_router(student_router)
app.include_router(admin_students_router)
app.include_router(parent_router)
app.include_router(batch_router)
app.include_router(admin_router)
app.include_router(assignment_router)
app.include_router(attendance_router)
app.include_router(bot_admin_router)


@app.get("/api/server-time")
def get_server_time():
    """Return current server UTC time (ISO-8601) for client clock-sync."""
    return {"now": datetime.utcnow().isoformat() + "Z"}


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


@app.post("/api/puzzle-racer/rooms", response_model=PuzzleRaceRoomState)
def create_puzzle_race_room(
    payload: PuzzleRaceRoomCreate,
    current_user_id: int = Depends(get_current_user),
):
    """
    Create a new puzzle racer room for the current user.
    Returns the room state and an ID that frontend uses in the URL.
    """
    room_id = f"{current_user_id}-{int(datetime.utcnow().timestamp())}"
    room = _create_puzzle_race_room(room_id, current_user_id)
    return _serialize_puzzle_race_room(room)


@app.get("/api/puzzle-racer/rooms/{room_id}", response_model=PuzzleRaceRoomState)
def get_puzzle_race_room(
    room_id: str,
    current_user_id: int = Depends(get_current_user),
):
    """
    Get current state of a puzzle racer room.
    Used by all participants to poll room status and participants.
    """
    room = _get_puzzle_race_room(room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Race room not found")
    return _serialize_puzzle_race_room(room)


@app.post("/api/puzzle-racer/rooms/{room_id}/join", response_model=PuzzleRaceRoomState)
def join_puzzle_race_room(
    room_id: str,
    current_user_id: int = Depends(get_current_user),
):
    """
    Join an existing puzzle racer room. Only adds the current user as a participant.
    Automatically assigns a random available car.
    """
    room = _get_puzzle_race_room(room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Race room not found")
    if room["status"] in ("racing", "countdown"):
        raise HTTPException(status_code=409, detail="Race is ongoing. You cannot join until it ends.")
    participants: Set[int] = room.setdefault("participants", set())
    is_new = current_user_id not in participants
    participants.add(current_user_id)
    car_assignments: Dict[int, int] = room.setdefault("car_assignments", {})
    if is_new and current_user_id not in car_assignments:
        car_assignments[current_user_id] = _pick_random_available_car(room)
    return _serialize_puzzle_race_room(room)


@app.post("/api/puzzle-racer/rooms/{room_id}/start", response_model=PuzzleRaceRoomState)
def start_puzzle_race_room(
    room_id: str,
    current_user_id: int = Depends(get_current_user),
):
    """
    Mark room as started. Only host can start. (For current testing, solo races are allowed.)
    """
    room = _get_puzzle_race_room(room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Race room not found")
    if room["host_user_id"] != current_user_id:
        raise HTTPException(status_code=403, detail="Only the host can start the race")
    participants: Set[int] = room.setdefault("participants", set())
    if room.get("countdown_start_at") is None:
        now = datetime.utcnow()
        room["countdown_start_at"] = now
        room["race_end_at"] = now + timedelta(seconds=PUZZLE_RACER_TOTAL_RACE_SECONDS)
    room["status"] = "racing"
    return _serialize_puzzle_race_room(room)


@app.post("/api/puzzle-racer/rooms/{room_id}/select-car", response_model=PuzzleRaceRoomState)
def select_puzzle_race_car(
    room_id: str,
    payload: PuzzleRaceCarSelect,
    current_user_id: int = Depends(get_current_user),
):
    """
    Change the current user's car in a puzzle racer room.
    Only allows selecting a car that isn't already taken by another participant.
    """
    room = _get_puzzle_race_room(room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Race room not found")
    if current_user_id not in room.get("participants", set()):
        raise HTTPException(status_code=403, detail="You are not in this room")
    if room["status"] == "racing":
        raise HTTPException(status_code=400, detail="Cannot change car during a race")
    car_index = payload.car_index
    if car_index < 0 or car_index >= PUZZLE_RACER_TOTAL_CARS:
        raise HTTPException(status_code=400, detail="Invalid car index")
    car_assignments: Dict[int, int] = room.setdefault("car_assignments", {})
    for uid, cidx in car_assignments.items():
        if cidx == car_index and uid != current_user_id:
            raise HTTPException(status_code=409, detail="Car already taken by another player")
    car_assignments[current_user_id] = car_index
    return _serialize_puzzle_race_room(room)


@app.post("/api/puzzle-racer/rooms/{room_id}/set-name", response_model=PuzzleRaceRoomState)
def set_puzzle_race_name(
    room_id: str,
    payload: PuzzleRaceNameSet,
    current_user_id: int = Depends(get_current_user),
):
    """
    Set the current user's display name in a puzzle racer room.
    Visible to all participants via room state polling.
    """
    room = _get_puzzle_race_room(room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Race room not found")
    if current_user_id not in room.get("participants", set()):
        raise HTTPException(status_code=403, detail="You are not in this room")
    name = payload.name.strip()[:16]
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    racer_names: Dict[str, str] = room.setdefault("racer_names", {})
    racer_names[current_user_id] = name
    return _serialize_puzzle_race_room(room)


@app.post("/api/puzzle-racer/rooms/{room_id}/update-score", response_model=PuzzleRaceRoomState)
def update_puzzle_race_score(
    room_id: str,
    current_user_id: int = Depends(get_current_user),
):
    """Increment the current user's score by 1 (called on each correct puzzle solve)."""
    room = _get_puzzle_race_room(room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Race room not found")
    if current_user_id not in room.get("participants", set()):
        raise HTTPException(status_code=403, detail="You are not in this room")
    scores: Dict[int, int] = room.setdefault("scores", {})
    scores[current_user_id] = scores.get(current_user_id, 0) + 1
    return _serialize_puzzle_race_room(room)


@app.post("/api/puzzle-racer/rooms/{room_id}/leave")
def leave_puzzle_race_room(
    room_id: str,
    current_user_id: int = Depends(get_current_user),
):
    """
    Remove a non-host participant from the room.
    Host cannot leave (they own the room).
    """
    room = _get_puzzle_race_room(room_id)
    if room is None:
        return {"ok": True}
    if room["host_user_id"] == current_user_id:
        return {"ok": True}
    participants: set = room.get("participants", set())
    participants.discard(current_user_id)
    car_assignments: Dict[int, int] = room.get("car_assignments", {})
    car_assignments.pop(current_user_id, None)
    racer_names = room.get("racer_names", {})
    racer_names.pop(current_user_id, None)
    scores = room.get("scores", {})
    scores.pop(current_user_id, None)
    return {"ok": True}


@app.post("/api/puzzle-racer/rooms/{room_id}/reset", response_model=PuzzleRaceRoomState)
def reset_puzzle_race_room(
    room_id: str,
    current_user_id: int = Depends(get_current_user),
):
    """
    Reset a room back to waiting state.
    Any current or former participant can call this.
    First caller resets the room; all callers are (re-)added as participants.
    """
    room = _get_puzzle_race_room(room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Race room not found")
    if room["status"] != "waiting":
        room["status"] = "waiting"
        room["countdown_start_at"] = None
        room["race_end_at"] = None
        room["scores"] = {}
        # Clear participants — each player re-joins by calling reset
        room["participants"] = set()
    # Add the caller as a participant
    participants: set = room.setdefault("participants", set())
    participants.add(current_user_id)
    # Preserve their car and name
    car_assignments: Dict[int, int] = room.setdefault("car_assignments", {})
    if current_user_id not in car_assignments:
        car_assignments[current_user_id] = _pick_random_available_car(room)
    return _serialize_puzzle_race_room(room)


@app.get("/api/levels")
def get_levels_info():
    """Return level bands (1–15) and categories. Level is determined by rating only."""
    # Rating band for each level: level 1 = 100–299, 2 = 300–499, ..., 15 = 2900+
    bands = []
    low = 100
    for level in range(LEVEL_MIN, LEVEL_MAX + 1):
        if level == LEVEL_MAX:
            high = None  # 2900+
        else:
            high = _RATING_THRESHOLDS[level - 1] - 1
        bands.append({
            "level": level,
            "category": get_level_category(level),
            "rating_min": low,
            "rating_max": high,
        })
        if level < LEVEL_MAX:
            low = _RATING_THRESHOLDS[level - 1]
    return {"max_level": LEVEL_MAX, "levels": bands}


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
        gender=user.gender,
        avatar_url=user.avatar_url or "/avatars/default.png",
        role=UserRole.student
    )
    new_user.level = level_from_rating(new_user.rating or 100)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    access_token = create_access_token(data={"sub": new_user.id})
    refresh_token = create_refresh_token(data={"sub": new_user.id})
    user_payload = UserResponse.model_validate(new_user).model_dump(mode="json")
    user_payload["level_category"] = get_level_category(new_user.level)
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

@app.post("/api/auth/signup/parent")
def signup_parent(data: ParentSignup, db: Session = Depends(get_db)):
    """Register a new parent account and link to existing student(s)."""
    # Check if email/username taken
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Verify child emails exist as students
    children = []
    for child_email in data.child_emails:
        student = db.query(User).filter(User.email == child_email).first()
        if not student:
            raise HTTPException(
                status_code=400,
                detail=f"No student account found with email: {child_email}"
            )
        children.append(student)

    # Create parent user
    hashed_password = get_password_hash(data.password)
    parent = User(
        email=data.email,
        username=data.username,
        full_name=data.full_name,
        hashed_password=hashed_password,
        role=UserRole.parent,
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)

    # Link to children
    for child in children:
        link = ParentStudent(parent_id=parent.id, student_id=child.id)
        db.add(link)
    db.commit()

    access_token = create_access_token(data={"sub": parent.id})
    refresh_token = create_refresh_token(data={"sub": parent.id})
    user_payload = UserResponse.model_validate(parent).model_dump(mode="json")
    user_payload["level_category"] = None
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


@app.post("/api/auth/signup/coach")
def signup_coach(data: CoachSignup, db: Session = Depends(get_db)):
    """Register a coach account using an admin-generated invite token."""
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    invite = db.query(CoachSignupInvite).filter(
        CoachSignupInvite.token == data.invite_token,
        CoachSignupInvite.is_active == True,
        CoachSignupInvite.used_at.is_(None),
    ).first()
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or inactive invite token")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invite token has expired")
    if invite.email and invite.email.lower() != data.email.lower():
        raise HTTPException(status_code=400, detail="Invite token is bound to a different email")

    hashed_password = get_password_hash(data.password)
    coach = User(
        email=data.email,
        username=data.username,
        full_name=data.full_name,
        hashed_password=hashed_password,
        avatar_url="/avatars/default.png",
        role=UserRole.coach,
    )
    coach.level = level_from_rating(coach.rating or 100)
    db.add(coach)
    db.flush()

    invite.used_at = datetime.utcnow()
    invite.used_by = coach.id
    invite.is_active = False
    db.commit()
    db.refresh(coach)

    access_token = create_access_token(data={"sub": coach.id})
    refresh_token = create_refresh_token(data={"sub": coach.id})
    user_payload = UserResponse.model_validate(coach).model_dump(mode="json")
    user_payload["level_category"] = get_level_category(coach.level)
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


@app.get("/api/auth/coach-invite/{token}")
def get_coach_invite(token: str, db: Session = Depends(get_db)):
    invite = db.query(CoachSignupInvite).filter(
        CoachSignupInvite.token == token
    ).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if not invite.is_active or invite.used_at is not None:
        raise HTTPException(status_code=400, detail="Invite already used or revoked")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invite token has expired")
    if not invite.email:
        raise HTTPException(status_code=400, detail="Invite is missing email restriction")
    return {
        "email": invite.email,
        "expires_at": invite.expires_at,
    }


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
    sync_user_level_from_rating(user)
    db.commit()
    db.refresh(user)
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    user_payload = UserResponse.model_validate(user).model_dump(mode="json")
    user_payload["level_category"] = get_level_category(user.level)
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
    if user.is_active is False:
        raise HTTPException(status_code=401, detail="Account is deactivated")
    sync_user_level_from_rating(user)
    db.commit()
    db.refresh(user)
    access_token = create_access_token(data={"sub": user.id})
    user_payload = UserResponse.model_validate(user).model_dump(mode="json")
    user_payload["level_category"] = get_level_category(user.level)
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
    sync_user_level_from_rating(user)
    db.commit()
    db.refresh(user)
    return {**UserResponse.model_validate(user).model_dump(mode="json"), "level_category": get_level_category(user.level)}

# ==================== USER ENDPOINTS ====================

# IMPORTANT: /api/users/search must come BEFORE /api/users/{user_id} to avoid route conflicts
@app.get("/api/users/search")
def search_users(
    query: str = Query("", description="Search query (username or full name)"),
    limit: int = 20,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search for students/coaches by username or full name"""
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
        User.role.in_([UserRole.student, UserRole.coach]),
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


@app.post("/api/users/me/avatar", response_model=UserResponse)
async def upload_my_avatar(
    request: Request,
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a profile image; replaces any previous upload for this user."""
    ct = (file.content_type or "").lower()
    if not ct.startswith("image/"):
        raise HTTPException(status_code=400, detail="Image file required")

    contents = await file.read()
    if len(contents) > _MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 2MB or smaller")

    suffix = ".jpg"
    if "png" in ct:
        suffix = ".png"
    elif "webp" in ct:
        suffix = ".webp"
    elif "gif" in ct:
        suffix = ".gif"

    for old in _AVATAR_UPLOAD_DIR.glob(f"{user_id}.*"):
        try:
            old.unlink()
        except OSError:
            pass

    out_path = _AVATAR_UPLOAD_DIR / f"{user_id}{suffix}"
    with open(out_path, "wb") as f:
        f.write(contents)

    current_user = db.query(User).filter(User.id == user_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    base = str(request.base_url).rstrip("/")
    current_user.avatar_url = f"{base}/uploads/avatars/{user_id}{suffix}"
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
    
    # Order by id for fast indexed query (ORDER BY random() is slow on large sets)
    puzzles = query.order_by(Puzzle.id).offset(skip).limit(limit).all()
    return puzzles

@app.get("/api/puzzles/{puzzle_id}", response_model=PuzzleResponse)
def get_puzzle(puzzle_id: int, db: Session = Depends(get_db)):
    """Get specific puzzle by ID"""
    puzzle = db.query(Puzzle).filter(Puzzle.id == puzzle_id).first()
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    return puzzle


def _record_assignment_completion_if_eligible(
    db: Session,
    student_id: int,
    assignment_id: int,
    puzzle_id: int,
) -> None:
    """If the student may access the assignment and the puzzle belongs to it, insert completion (idempotent)."""
    batch_ids = [
        sb.batch_id
        for sb in db.query(StudentBatch).filter(
            StudentBatch.student_id == student_id,
            StudentBatch.is_active == True,
        ).all()
    ]
    a = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id, Assignment.is_active == True)
        .first()
    )
    if not a:
        return
    if not (
        a.student_id == student_id
        or (a.batch_id is not None and a.batch_id in batch_ids)
    ):
        return
    ap = (
        db.query(AssignmentPuzzle)
        .filter(
            AssignmentPuzzle.assignment_id == assignment_id,
            AssignmentPuzzle.puzzle_id == puzzle_id,
        )
        .first()
    )
    if not ap:
        return
    existing = (
        db.query(AssignmentCompletion)
        .filter(
            AssignmentCompletion.assignment_id == assignment_id,
            AssignmentCompletion.student_id == student_id,
            AssignmentCompletion.puzzle_id == puzzle_id,
        )
        .first()
    )
    if existing:
        return
    db.add(
        AssignmentCompletion(
            assignment_id=assignment_id,
            student_id=student_id,
            puzzle_id=puzzle_id,
        )
    )


@app.post("/api/puzzles/{puzzle_id}/attempt", response_model=PuzzleAttemptResponse)
def submit_puzzle_attempt(
    puzzle_id: int,
    attempt: PuzzleAttemptCreate,
    user_id: int = Depends(get_current_user),
    assignment_id: Optional[int] = Query(None, description="When set, record completion for this assignment if eligible"),
    db: Session = Depends(get_db),
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
        
        # Award XP to user (level is driven by rating, not XP)
        current_user.total_xp += xp_earned
        
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
    if assignment_id is not None and attempt.is_solved:
        _record_assignment_completion_if_eligible(
            db, current_user.id, assignment_id, puzzle_id
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


class GameAnalysisMove(BaseModel):
    """Per-move engine evaluation for a game."""
    ply: int  # 1-based half-move index
    move_san: str
    move_uci: str
    side_to_move: str  # 'white' or 'black' who played this move
    best_move_uci: Optional[str] = None
    evaluation: Optional[Dict] = None  # Raw Stockfish eval dict
    tag: str  # e.g. 'best', 'ok', 'inaccuracy', 'mistake', 'blunder'


class GameAnalysisResponse(BaseModel):
    """Engine analysis for an entire game."""
    game_id: int
    moves: List[GameAnalysisMove]

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
    if user.total_xp < xp_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough XP! You need {xp_cost} XP but only have {user.total_xp}."
        )

    # Deduct XP (level is driven by rating, not XP)
    user.total_xp -= xp_cost
    db.commit()

    return {
        "success": True,
        "hint_level": result["hint_level"],
        "hint_text": result["hint_text"],
        "xp_cost": xp_cost,
        "remaining_xp": user.total_xp,
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


@app.get("/api/games/{game_id}/analysis", response_model=GameAnalysisResponse)
def analyze_game(
    game_id: int,
    depth: int = Query(12, ge=6, le=20),
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Run a lightweight engine analysis of a completed game.
    Returns per-move tags and best moves, similar to lichess/chess.com,
    but tuned for kid-friendly, high-level feedback.
    """
    import chess
    import chess.pgn

    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Only players in the game can view analysis
    if game.white_player_id != current_user_id and game.black_player_id != current_user_id:
        raise HTTPException(status_code=403, detail="You are not part of this game")

    if not game.pgn:
        raise HTTPException(status_code=400, detail="Game has no PGN to analyze yet")

    # Parse PGN into a python-chess game
    try:
        pgn_io = io.StringIO(game.pgn)
        pgn_game = chess.pgn.read_game(pgn_io)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse game PGN for analysis")

    if pgn_game is None:
        raise HTTPException(status_code=400, detail="Game PGN is empty or invalid")

    board = pgn_game.board()
    sf = get_stockfish_service()

    analysis_moves: List[GameAnalysisMove] = []

    # Walk through the mainline, analyzing the position before each move
    for ply_index, move in enumerate(pgn_game.mainline_moves(), start=1):
        fen_before = board.fen()
        try:
            engine_result = sf.analyze_position(fen_before, depth=depth)
        except Exception:
            engine_result = {"success": False}

        best_move_uci = None
        evaluation: Optional[Dict] = None
        tag = "unknown"

        if engine_result.get("success"):
            best_move_uci = engine_result.get("best_move")
            evaluation = engine_result.get("evaluation")

        # Compute SAN on the current position before pushing; otherwise the move
        # may no longer be legal in the new position and python-chess asserts.
        move_san = board.san(move)
        board.push(move)
        move_uci = move.uci()
        side_to_move = "white" if (ply_index % 2 == 1) else "black"

        # Simple tagging based on whether we matched Stockfish's top move.
        if best_move_uci is None:
            tag = "ok"
        elif best_move_uci == move_uci:
            tag = "best"
        else:
            tag = "could_improve"

        analysis_moves.append(
            GameAnalysisMove(
                ply=ply_index,
                move_san=move_san,
                move_uci=move_uci,
                side_to_move=side_to_move,
                best_move_uci=best_move_uci,
                evaluation=evaluation,
                tag=tag,
            )
        )

    return GameAnalysisResponse(game_id=game.id, moves=analysis_moves)

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

    check_clock_flag_timeout(game, db)
    check_auto_resign_timeout(game, db)

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
    
    # If no explicit time control is provided, default to 10+0
    time_control = game_data.time_control or "10+0"
    base_clock_ms = base_clock_ms_from_time_control(time_control)
    new_game = Game(
        white_player_id=game_data.white_player_id,
        black_player_id=game_data.black_player_id,
        time_control=time_control,
        white_time_ms=base_clock_ms,
        black_time_ms=base_clock_ms,
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
    db.refresh(game)  # ensure latest from DB (avoids stale state if bot-move just committed)
    
    # Check if user is part of this game
    if game.white_player_id != current_user_id and game.black_player_id != current_user_id:
        raise HTTPException(status_code=403, detail="You are not part of this game")
    
    # Check if game has ended
    if game.result:
        raise HTTPException(status_code=400, detail="Game has already ended")
    
    # Initialize chess board - prefer PGN so we use full move history (avoids desync with final_fen)
    board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    used_pgn = False
    if game.pgn:
        try:
            pgn_io = io.StringIO(game.pgn)
            game_node = chess.pgn.read_game(pgn_io)
            if game_node:
                board = game_node.board()
                for move in game_node.mainline_moves():
                    board.push(move)
                used_pgn = True
        except Exception as e:
            print(f"Warning: PGN parsing failed, using final_fen: {e}")
    if not used_pgn and game.final_fen:
        try:
            board = chess.Board(game.final_fen)
        except Exception:
            board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    elif not used_pgn:
        board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    # If PGN and final_fen disagree, trust PGN and repair final_fen so bot and next load see correct state
    if game.final_fen and used_pgn:
        try:
            fen_from_final = chess.Board(game.final_fen)
            if fen_from_final.fen() != board.fen():
                print(f"Warning: PGN and final_fen out of sync; using PGN position and repairing final_fen")
                game.final_fen = board.fen()
        except Exception:
            pass
    
    # Determine whose turn it is
    is_white_turn = board.turn == chess.WHITE
    is_current_user_white = game.white_player_id == current_user_id
    
    if is_white_turn != is_current_user_white:
        raise HTTPException(status_code=400, detail="It's not your turn")

    now = datetime.utcnow()
    # Bot games and unlimited games are untimed: skip clock deduction and timeout adjudication.
    is_unlimited_game = (str(getattr(game, "time_control", "") or "").strip().lower() == "unlimited")
    if not getattr(game, "bot_difficulty", None) and not is_unlimited_game:
        # Deduct elapsed time from the clock of the player whose turn it is (they are about to move).
        turn_started = game.last_move_at if (game.total_moves or 0) > 0 else game.started_at
        turn_started = turn_started or game.started_at
        elapsed_ms = int((now - turn_started).total_seconds() * 1000)
        white_time = getattr(game, "white_time_ms", None) or INITIAL_CLOCK_MS
        black_time = getattr(game, "black_time_ms", None) or INITIAL_CLOCK_MS
        if is_white_turn:
            white_time = max(0, white_time - elapsed_ms)
            game.white_time_ms = white_time
        else:
            black_time = max(0, black_time - elapsed_ms)
            game.black_time_ms = black_time

        # Flag on time: if the moving player's clock hit zero, they lose.
        if white_time <= 0 or black_time <= 0:
            if white_time <= 0:
                game.result = "0-1"
                game.winner_id = game.black_player_id
            else:
                game.result = "1-0"
                game.winner_id = game.white_player_id
            game.result_reason = "timeout"
            game.ended_at = now
            if game.pgn and not game.pgn.rstrip().endswith(("1-0", "0-1", "1/2-1/2")):
                game.pgn = (game.pgn.rstrip() + " " + game.result).strip()
            update_ratings_after_game(game, db)
            db.commit()
            db.refresh(game)
            return game

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
        move_obj = chess.Move.from_uci(move_uci)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid move: {move_uci} - {str(e)}")
    if not board.is_legal(move_obj):
        raise HTTPException(
            status_code=400,
            detail=f"Move {move_uci} is not legal in current position (e.g. wrong turn or piece already moved)."
        )
    move = board.push(move_obj)
    
    # Update game state
    game.total_moves += 1
    game.final_fen = board.fen()
    # Any move implicitly declines/invalidates prior draw offer.
    game.draw_offered_by = None
    game.draw_offered_at = None
    
    # Update PGN - rebuild by replaying existing PGN and appending new move
    pgn_board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    pgn_game = chess.pgn.Game()
    pgn_game.setup(pgn_board)
    node = pgn_game
    
    # Replay existing PGN moves if available
    if game.pgn:
        try:
            pgn_io = io.StringIO(game.pgn)
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

    game.last_move_at = datetime.utcnow()

    # Check for game end conditions
    if board.is_checkmate():
        game.result = "1-0" if is_current_user_white else "0-1"
        game.result_reason = "checkmate"
        # For bot games, set winner correctly
        bot_user = get_or_create_bot_user(db)
        if game.white_player_id == bot_user.id or game.black_player_id == bot_user.id:
            # This is a bot game - winner is the human player (current_user_id)
            game.winner_id = current_user_id
        else:
            game.winner_id = current_user_id
        game.ended_at = datetime.now(timezone.utc)
    elif board.is_stalemate() or board.is_insufficient_material() or board.is_seventyfive_moves() or board.is_fivefold_repetition():
        game.result = "1/2-1/2"
        game.result_reason = "draw"
        game.ended_at = datetime.now(timezone.utc)
    
    if game.result:
        update_ratings_after_game(game, db)
    db.commit()
    db.refresh(game)
    
    # Don't make bot move here - let frontend trigger it after showing player's move
    # This ensures the player sees their move first before bot responds
    
    return game


@app.post("/api/games/{game_id}/resign", response_model=GameResponse)
def resign_game(
    game_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resign the current game. Opponent wins."""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game.white_player_id != current_user_id and game.black_player_id != current_user_id:
        raise HTTPException(status_code=403, detail="You are not part of this game")
    if game.result:
        raise HTTPException(status_code=400, detail="Game has already ended")
    is_current_user_white = game.white_player_id == current_user_id
    if is_current_user_white:
        game.result = "0-1"
        game.winner_id = game.black_player_id
    else:
        game.result = "1-0"
        game.winner_id = game.white_player_id
    game.result_reason = "resign"
    game.ended_at = datetime.utcnow()
    game.draw_offered_by = None
    game.draw_offered_at = None
    if game.pgn and not game.pgn.rstrip().endswith(("1-0", "0-1", "1/2-1/2")):
        game.pgn = (game.pgn.rstrip() + " " + game.result).strip()
    update_ratings_after_game(game, db)
    db.commit()
    db.refresh(game)
    return game


@app.post("/api/games/{game_id}/draw", response_model=GameResponse)
def draw_game(
    game_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Offer draw or accept opponent's draw offer."""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game.white_player_id != current_user_id and game.black_player_id != current_user_id:
        raise HTTPException(status_code=403, detail="You are not part of this game")

    if game.result:
        raise HTTPException(status_code=400, detail="Game is already over")

    # If opponent has offered draw, accept and end game as draw.
    if game.draw_offered_by and game.draw_offered_by != current_user_id:
        game.result = "1/2-1/2"
        game.result_reason = "draw"
        game.winner_id = None
        game.ended_at = datetime.now(timezone.utc)
        game.draw_offered_by = None
        game.draw_offered_at = None
        if game.pgn and not game.pgn.rstrip().endswith(("1-0", "0-1", "1/2-1/2")):
            game.pgn = (game.pgn.rstrip() + " 1/2-1/2").strip()
        update_ratings_after_game(game, db)
        db.commit()
        db.refresh(game)
        return game

    # Otherwise create/update draw offer from current user.
    game.draw_offered_by = current_user_id
    game.draw_offered_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(game)
    return game


@app.post("/api/games/{game_id}/draw/reject", response_model=GameResponse)
def reject_draw_offer(
    game_id: int,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject opponent's draw offer and continue game."""
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game.white_player_id != current_user_id and game.black_player_id != current_user_id:
        raise HTTPException(status_code=403, detail="You are not part of this game")

    if game.result:
        raise HTTPException(status_code=400, detail="Game is already over")

    if not game.draw_offered_by:
        raise HTTPException(status_code=400, detail="No active draw offer to reject")

    if game.draw_offered_by == current_user_id:
        raise HTTPException(status_code=400, detail="You cannot reject your own draw offer")

    game.draw_offered_by = None
    game.draw_offered_at = None
    db.commit()
    db.refresh(game)
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
    
    # Create untimed bot game (played on beat-the-bot board, no clock semantics).
    new_game = Game(
        white_player_id=white_player_id,
        black_player_id=black_player_id,
        time_control="unlimited",
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
    db.refresh(game)  # ensure we have latest (e.g. user's move that just committed)
    
    # Check if user is part of this game
    if game.white_player_id != current_user_id and game.black_player_id != current_user_id:
        raise HTTPException(status_code=403, detail="You are not part of this game")
    
    # Check if this is a bot game
    bot_user = get_or_create_bot_user(db)
    if game.white_player_id != bot_user.id and game.black_player_id != bot_user.id:
        raise HTTPException(status_code=400, detail="This is not a bot game")
    
    job = enqueue_bot_move_job(db, game_id=game.id, requested_by=current_user_id, priority=100)
    mark_job_processing(db, job)
    try:
        _make_bot_move_if_needed(game, db, bot_user.id)
        complete_bot_move_job(db, job, success=True)
    except Exception as exc:
        complete_bot_move_job(db, job, success=False, error_message=str(exc))
        raise
    db.refresh(game)
    return game


@app.post("/api/admin/bots/jobs/process")
def process_bot_jobs(
    limit: int = 50,
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Worker-style endpoint to drain pending bot jobs.
    Intended for internal cron/worker calls.
    """
    admin = db.query(User).filter(User.id == current_user_id).first()
    if not admin or admin.role not in [UserRole.admin, "admin"]:
        raise HTTPException(status_code=403, detail="Admin privileges required")

    bot_user = get_or_create_bot_user(db)

    def _exec(game_id: int) -> None:
        game = db.query(Game).filter(Game.id == game_id).first()
        if not game:
            raise RuntimeError(f"Game not found: {game_id}")
        _make_bot_move_if_needed(game, db, bot_user.id)

    result = process_pending_jobs(db, limit=limit, execute_move_for_game=_exec)
    return {
        "processed": result["processed"],
        "failed": result["failed"],
        "limit": max(1, min(500, limit)),
    }

def _make_bot_move_if_needed(game: Game, db: Session, bot_user_id: int):
    """Make bot move if it's bot's turn"""
    import chess
    import chess.pgn
    
    # Check if game has ended
    if game.result:
        print(f"Bot move skipped: Game already ended with result {game.result}")
        return
    
    # Initialize chess board - prefer PGN (same as make_move) so we never play from stale final_fen
    board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    used_pgn = False
    if game.pgn:
        try:
            pgn_io = io.StringIO(game.pgn)
            game_node = chess.pgn.read_game(pgn_io)
            if game_node:
                board = game_node.board()
                for move in game_node.mainline_moves():
                    board.push(move)
                used_pgn = True
        except Exception as e:
            print(f"Warning: PGN parsing failed in bot move, using FEN: {e}")
    if not used_pgn and game.final_fen:
        try:
            board = chess.Board(game.final_fen)
        except Exception:
            board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    elif not used_pgn:
        board = chess.Board(game.starting_fen) if game.starting_fen else chess.Board()
    # If PGN and final_fen disagree, trust PGN and repair final_fen
    if game.final_fen and used_pgn:
        try:
            fen_from_final = chess.Board(game.final_fen)
            if fen_from_final.fen() != board.fen():
                print(f"Warning: Bot using PGN position (final_fen was out of sync); repairing final_fen")
                game.final_fen = board.fen()
        except Exception:
            pass
    
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
    
    runtime_profile = resolve_runtime_profile(db, game)
    bot_rating = runtime_profile.get("target_rating") or get_bot_rating_for_game(
        game.bot_difficulty, getattr(game, "bot_depth", None)
    )
    bot_depth = getattr(game, 'bot_depth', 15)
    if not bot_depth:
        bot_depth = 15
    
    print(
        f"Bot making move: rating={bot_rating}, depth={bot_depth}, "
        f"profile_version={runtime_profile.get('profile_version_id')}, position={board.fen()}"
    )
    
    opening_cfg = runtime_profile.get("config", {}).get("openings", {})
    opening_max_ply = int(opening_cfg.get("max_ply", 8)) if isinstance(opening_cfg, dict) else 8
    opening_move = choose_opening_move(board, runtime_profile.get("bot_id") or "default", max_ply=opening_max_ply)

    if opening_move:
        analysis = {
            "success": True,
            "best_move": opening_move,
            "selected_rank": 1,
            "eval_cp": None,
            "eval_loss_cp": None,
            "decision_meta_json": "{\"policy\": \"opening_book\"}",
        }
    else:
        sf = get_stockfish_service()
        analysis = sf.choose_bot_move(board.fen(), bot_rating, runtime_profile.get("config") or {})
    
    print(f"Stockfish bot-move result: {analysis}")
    
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

    try:
        move_number = (game.total_moves or 0) + 1
        log_bot_move_telemetry(
            db,
            game=game,
            runtime_profile=runtime_profile,
            move_number=move_number,
            selected_move_uci=best_move_uci,
            selected_rank=analysis.get("selected_rank"),
            eval_cp=analysis.get("eval_cp"),
            eval_loss_cp=analysis.get("eval_loss_cp"),
            decision_meta_json=analysis.get("decision_meta_json"),
        )
    except Exception as telemetry_err:
        print(f"Warning: failed to write bot telemetry: {telemetry_err}")
    
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
            pgn_io = io.StringIO(game.pgn)
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

    game.last_move_at = datetime.utcnow()

    # Check for game end conditions
    if board.is_checkmate():
        game.result_reason = "checkmate"
        if is_bot_white:
            game.result = "1-0"
            game.winner_id = bot_user_id
        else:
            game.result = "0-1"
            game.winner_id = bot_user_id
        game.ended_at = datetime.utcnow()
    elif board.is_stalemate() or board.is_insufficient_material() or board.is_seventyfive_moves() or board.is_fivefold_repetition():
        game.result = "1/2-1/2"
        game.result_reason = "draw"
        game.ended_at = datetime.utcnow()

    if game.result:
        update_ratings_after_game(game, db)
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
    # Verify invitee exists and is a student or coach
    invitee = db.query(User).filter(User.id == invite_data.invitee_id).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found")
    
    if invitee.role not in [UserRole.student, UserRole.coach]:
        raise HTTPException(status_code=400, detail="Can only invite students or coaches")
    
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
    selected_time_control = (invite_data.time_control or "unlimited").strip() or "unlimited"
    new_invite = GameInvite(
        inviter_id=current_user_id,
        invitee_id=invite_data.invitee_id,
        time_control=selected_time_control,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
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
    expires_at_utc = to_utc_aware(invite.expires_at)
    if expires_at_utc and expires_at_utc < datetime.now(timezone.utc):
        invite.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Invite has expired")
    
    # Create the game with inviter-selected time control (fallback to unlimited)
    selected_time_control = (invite.time_control or "unlimited")
    base_clock_ms = base_clock_ms_from_time_control(selected_time_control)
    new_game = Game(
        white_player_id=invite.inviter_id,
        black_player_id=invite.invitee_id,
        time_control=selected_time_control,
        white_time_ms=base_clock_ms,
        black_time_ms=base_clock_ms,
    )
    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    
    # Update invite status
    invite.status = "accepted"
    invite.game_id = new_game.id
    invite.responded_at = datetime.now(timezone.utc)
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
    invite.responded_at = datetime.now(timezone.utc)
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


# ==================== STAR WALLET + SHOP ENDPOINTS ====================

class ConvertXpToStarsRequest(BaseModel):
    stars: int


class ShopPurchaseRequest(BaseModel):
    item_key: str


SHOP_CATALOG = [
    {"item_key": "cool_sunglasses", "name": "Cool Sunglasses", "stars_cost": 5, "rarity": "Common"},
    {"item_key": "golden_crown", "name": "Golden Crown", "stars_cost": 8, "rarity": "Rare"},
    {"item_key": "fire_trail", "name": "Fire Trail", "stars_cost": 12, "rarity": "Epic"},
    {"item_key": "space_theme", "name": "Space Theme", "stars_cost": 15, "rarity": "Epic"},
    {"item_key": "castle_theme", "name": "Castle Theme", "stars_cost": 13, "rarity": "Rare"},
    {"item_key": "dragon_pet", "name": "Dragon Pet", "stars_cost": 25, "rarity": "Legendary"},
]
SHOP_CATALOG_BY_KEY = {item["item_key"]: item for item in SHOP_CATALOG}


@app.get("/api/rewards/wallet")
def get_rewards_wallet(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "xp_per_star": XP_PER_STAR,
        "total_xp": user.total_xp,
        "star_balance": user.star_balance,
        "max_convertible_stars": user.total_xp // XP_PER_STAR,
    }


@app.post("/api/rewards/convert-xp-to-stars")
def convert_xp_to_stars(
    payload: ConvertXpToStarsRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.stars <= 0:
        raise HTTPException(status_code=400, detail="stars must be greater than 0")

    xp_cost = payload.stars * XP_PER_STAR
    if user.total_xp < xp_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough XP! You need {xp_cost} XP but only have {user.total_xp}.",
        )

    user.total_xp -= xp_cost
    user.star_balance += payload.stars
    db.commit()
    db.refresh(user)
    return {
        "converted_stars": payload.stars,
        "xp_spent": xp_cost,
        "remaining_xp": user.total_xp,
        "star_balance": user.star_balance,
    }


@app.get("/api/shop/catalog")
def get_shop_catalog(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"items": SHOP_CATALOG, "star_balance": user.star_balance}


@app.post("/api/shop/purchase")
def purchase_shop_item(
    payload: ShopPurchaseRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    item = SHOP_CATALOG_BY_KEY.get(payload.item_key)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    stars_cost = int(item["stars_cost"])
    if user.star_balance < stars_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough stars! You need {stars_cost} stars but only have {user.star_balance}.",
        )

    user.star_balance -= stars_cost
    purchase = ShopPurchase(
        user_id=user.id,
        item_key=item["item_key"],
        item_name=item["name"],
        stars_spent=stars_cost,
        delivery_status="pending",
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    create_notification(
        db,
        user.id,
        "achievement",
        "Shop purchase successful",
        f"Purchased {item['name']} for {stars_cost} stars. Delivery will be coordinated soon.",
        link_url="/dashboard",
    )

    return {
        "purchase_id": purchase.id,
        "item_key": purchase.item_key,
        "item_name": purchase.item_name,
        "stars_spent": purchase.stars_spent,
        "star_balance": user.star_balance,
        "delivery_status": purchase.delivery_status,
        "purchased_at": purchase.purchased_at,
    }


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
        "star_balance": current_user.star_balance,
        "level": current_user.level,
        "rating": current_user.rating
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)