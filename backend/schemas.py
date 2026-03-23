from pydantic import BaseModel, EmailStr, Field, field_serializer, model_validator
from typing import Optional, List, Literal
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    age: Optional[int] = None
    gender: Optional[str] = None  # 'girl' | 'boy' for students
    avatar_url: Optional[str] = None  # e.g. /avatars/girl1.png

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    age: Optional[int]
    gender: Optional[str] = None
    avatar_url: str
    total_xp: int
    level: int
    rating: int
    level_category: Optional[str] = None  # Pawn, Knight, Bishop, Rook, Queen, King (from rating)
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None

# Puzzle Schemas
class PuzzleBase(BaseModel):
    title: str
    description: Optional[str]
    fen: str
    moves: str
    difficulty: str
    theme: Optional[str]
    
class PuzzleCreate(PuzzleBase):
    rating: Optional[int] = 400
    xp_reward: Optional[int] = 10

class PuzzleResponse(PuzzleBase):
    id: int
    rating: int
    xp_reward: int
    attempts_count: Optional[int] = 0  # DB may have NULL for older/imported rows
    success_count: Optional[int] = 0
    created_at: Optional[datetime] = None

    @field_serializer("attempts_count", "success_count")
    def serialize_count(self, v):
        return v if v is not None else 0

    @field_serializer("created_at")
    def serialize_created_at(self, v):
        return v if v is not None else datetime.min

    class Config:
        from_attributes = True

# Puzzle Attempt Schema
class PuzzleAttemptCreate(BaseModel):
    puzzle_id: int
    is_solved: bool
    moves_made: str
    time_taken: int
    hints_used: Optional[int] = 0

class PuzzleAttemptResponse(BaseModel):
    id: int
    puzzle_id: int
    is_solved: bool
    time_taken: int
    xp_earned: int
    attempted_at: datetime
    
    class Config:
        from_attributes = True

# Game Schemas
class GameCreate(BaseModel):
    white_player_id: int
    black_player_id: int
    time_control: str

class GameUpdate(BaseModel):
    pgn: Optional[str]
    result: Optional[str]
    winner_id: Optional[int]
    final_fen: Optional[str]
    total_moves: Optional[int]

class GameResponse(BaseModel):
    id: int
    white_player_id: int
    black_player_id: int
    result: Optional[str]
    result_reason: Optional[str] = None
    time_control: str
    total_moves: int
    started_at: datetime
    ended_at: Optional[datetime]
    last_move_at: Optional[datetime] = None
    white_time_ms: Optional[int] = None
    black_time_ms: Optional[int] = None
    pgn: Optional[str] = None
    starting_fen: Optional[str] = None
    final_fen: Optional[str] = None
    bot_difficulty: Optional[str] = None
    bot_depth: Optional[int] = None
    winner_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class GameMoveCreate(BaseModel):
    from_square: str
    to_square: str
    promotion: Optional[str] = None

# Achievement Schema
class AchievementResponse(BaseModel):
    id: int
    name: str
    description: str
    icon_url: Optional[str]
    xp_reward: int
    badge_color: str
    
    class Config:
        from_attributes = True

# Daily Challenge Schema
class DailyChallengeResponse(BaseModel):
    id: int
    date: datetime
    title: str
    description: Optional[str]
    challenge_type: str
    xp_reward: int
    bonus_xp: int
    difficulty: str
    time_limit: Optional[int]
    
    class Config:
        from_attributes = True

# Leaderboard Schema
class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    full_name: str
    avatar_url: str
    score: int
    level: int
    
    class Config:
        from_attributes = True

# Update Profile Schema
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    age: Optional[int] = None

# Game Invite Schemas
class GameInviteCreate(BaseModel):
    invitee_id: int

class GameInviteResponse(BaseModel):
    id: int
    inviter_id: int
    invitee_id: int
    status: str
    game_id: Optional[int]
    created_at: datetime
    responded_at: Optional[datetime]
    inviter: Optional[UserResponse] = None
    invitee: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True

class GameInviteAccept(BaseModel):
    invite_id: int

# Bot Game Schemas
class BotGameCreate(BaseModel):
    bot_difficulty: str
    bot_depth: int
    player_color: str  # 'white' or 'black'

# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    category: str  # "coach" | "achievement" | "system"
    title: str
    message: str
    read: bool
    link_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationMarkRead(BaseModel):
    read: bool = True


# ==================== PARENT & BATCH SCHEMAS ====================

# Parent Signup
class ParentSignup(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    child_emails: List[str]  # emails of existing student accounts to link


class CoachSignup(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str = Field(..., min_length=6)
    invite_token: str


# Batch Schemas
class BatchCreate(BaseModel):
    name: str
    description: Optional[str] = None
    schedule: Optional[str] = None
    monthly_fee: float = 0

class BatchUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    schedule: Optional[str] = None
    monthly_fee: Optional[float] = None
    is_active: Optional[bool] = None

class BatchResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    schedule: Optional[str]
    coach_id: int
    monthly_fee: float
    is_active: bool
    created_at: datetime
    student_count: Optional[int] = 0

    class Config:
        from_attributes = True


# Class Session Schemas
class ClassSessionCreate(BaseModel):
    date: datetime
    duration_minutes: int = 60
    topic: Optional[str] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None

class ClassSessionResponse(BaseModel):
    id: int
    batch_id: int
    date: datetime
    duration_minutes: int
    topic: Optional[str]
    meeting_link: Optional[str]
    notes: Optional[str]
    created_at: datetime
    batch_name: Optional[str] = None

    class Config:
        from_attributes = True


# Announcement Schemas
class AnnouncementCreate(BaseModel):
    title: str
    message: str

class AnnouncementResponse(BaseModel):
    id: int
    batch_id: Optional[int]
    title: str
    message: str
    created_by: int
    created_at: datetime
    batch_name: Optional[str] = None
    coach_name: Optional[str] = None

    class Config:
        from_attributes = True


# Payment Schemas
class PaymentCheckoutCreate(BaseModel):
    student_id: int
    batch_id: int
    billing_month: str  # "YYYY-MM"

class PaymentResponse(BaseModel):
    id: int
    parent_id: int
    student_id: int
    batch_id: int
    amount: float
    currency: str
    billing_month: str
    status: str
    paid_at: Optional[datetime]
    created_at: datetime
    student_name: Optional[str] = None
    batch_name: Optional[str] = None

    class Config:
        from_attributes = True


# Child info visible to parent
class ChildResponse(BaseModel):
    id: int
    full_name: str
    username: str
    avatar_url: str
    rating: int
    level: int
    level_category: Optional[str] = None
    total_xp: int
    batch_name: Optional[str] = None
    batch_id: Optional[int] = None
    payment_status: Optional[str] = None

    class Config:
        from_attributes = True


# Student Batch Management
class StudentBatchAdd(BaseModel):
    student_id: int

class StudentBatchResponse(BaseModel):
    student_id: int
    student_name: str
    student_username: str
    batch_id: int
    payment_status: str
    joined_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


# ==================== PUZZLE RACER (MULTIPLAYER ROOM) SCHEMAS ====================

class PuzzleRaceRoomState(BaseModel):
    id: str
    host_user_id: int
    status: Literal["waiting", "countdown", "racing", "finished"]
    created_at: datetime
    participants: List[int]
    countdown_start_at: Optional[datetime] = None
    race_end_at: Optional[datetime] = None
    car_assignments: dict[int, int] = {}
    racer_names: dict[int, str] = {}
    scores: dict[int, int] = {}


class PuzzleRaceRoomCreate(BaseModel):
    difficulty: Optional[str] = "beginner"
    puzzle_count: Optional[int] = 20


class PuzzleRaceRoomJoin(BaseModel):
    pass


class PuzzleRaceRoomStart(BaseModel):
    pass


class PuzzleRaceCarSelect(BaseModel):
    car_index: int


class PuzzleRaceNameSet(BaseModel):
    name: str

# ─────────────────────────────────────────────────────────────
# Assignment Engine Schemas  (append to the bottom of schemas.py)
# ─────────────────────────────────────────────────────────────


# ── Request schemas ──────────────────────────────────────────

class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    puzzle_ids: List[int]           # ordered list of puzzle IDs
    batch_id: Optional[int] = None
    student_id: Optional[int] = None
    due_date: Optional[datetime] = None

    @model_validator(mode="after")
    def check_target(self) -> "AssignmentCreate":
        if self.batch_id is None and self.student_id is None:
            raise ValueError("Either batch_id or student_id must be provided")
        return self


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    is_active: Optional[bool] = None


# ── Small nested schemas ─────────────────────────────────────

class AssignmentPuzzleInfo(BaseModel):
    puzzle_id: int
    position: int
    title: str
    difficulty: str
    xp_reward: int

    class Config:
        from_attributes = True


class StudentProgress(BaseModel):
    student_id: int
    username: str
    full_name: str
    puzzles_completed: int
    total_puzzles: int
    completion_pct: float           # 0-100
    is_complete: bool
    last_completed_at: Optional[datetime] = None


# ── Response schemas ─────────────────────────────────────────

class AssignmentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    coach_id: int
    batch_id: Optional[int]
    batch_name: Optional[str]       # resolved from batch
    student_id: Optional[int]
    student_name: Optional[str]     # resolved from student
    due_date: Optional[datetime]
    is_active: bool
    created_at: datetime
    puzzle_count: int
    puzzles: List[AssignmentPuzzleInfo] = []

    class Config:
        from_attributes = True


class AssignmentProgressResponse(BaseModel):
    assignment_id: int
    title: str
    total_puzzles: int
    total_students: int
    overall_completion_pct: float
    students: List[StudentProgress]

    class Config:
        from_attributes = True


# ── Student-facing schema (what a student sees) ──────────────

class StudentAssignmentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    puzzle_count: int
    puzzles_completed: int
    completion_pct: float
    is_complete: bool
    is_overdue: bool

    class Config:
        from_attributes = True


class StudentAssignmentPuzzleRow(BaseModel):
    puzzle_id: int
    position: int
    title: str
    difficulty: str
    xp_reward: int
    completed: bool


class StudentAssignmentDetailResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    puzzles: List[StudentAssignmentPuzzleRow] = []

    class Config:
        from_attributes = True