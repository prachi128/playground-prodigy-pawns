from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, TypeDecorator
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    student = "student"
    coach = "coach"
    admin = "admin"
    parent = "parent"

class CaseInsensitiveEnum(TypeDecorator):
    """A TypeDecorator that handles case-insensitive enum conversion.
    Stores as VARCHAR in database to allow case-insensitive matching."""
    impl = Enum
    cache_ok = True
    
    def __init__(self, enum_class, *args, **kwargs):
        self.enum_class = enum_class
        # Force VARCHAR storage instead of native enum
        kwargs['native_enum'] = False
        kwargs['create_constraint'] = False
        # Pass enum values to parent Enum
        super().__init__(enum_class, *args, **kwargs)
    
    def process_bind_param(self, value, dialect):
        """Convert enum to lowercase string when writing to database"""
        if value is None:
            return None
        if isinstance(value, self.enum_class):
            return value.value.lower()
        return str(value).lower()
    
    def process_result_value(self, value, dialect):
        """Convert string from database to enum (case-insensitive)"""
        if value is None:
            return None
        if isinstance(value, self.enum_class):
            return value
        # Try to find enum value case-insensitively
        value_str = str(value)
        value_lower = value_str.lower()
        for enum_member in self.enum_class:
            if enum_member.value.lower() == value_lower:
                return enum_member
        # If not found, raise an error
        raise ValueError(f"'{value}' is not a valid {self.enum_class.__name__}. Expected one of: {[e.value for e in self.enum_class]}")

class DifficultyLevel(enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

class GameResult(enum.Enum):
    WIN = "win"
    LOSS = "loss"
    DRAW = "draw"

# User/Student Model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(CaseInsensitiveEnum(UserRole), default=UserRole.student)
    
    # Student specific fields
    age = Column(Integer)
    gender = Column(String, nullable=True)  # 'girl' | 'boy' for students
    avatar_url = Column(String, default="/avatars/default.png")
    total_xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    rating = Column(Integer, default=100)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    games_as_white = relationship("Game", back_populates="white_player", foreign_keys="Game.white_player_id")
    games_as_black = relationship("Game", back_populates="black_player", foreign_keys="Game.black_player_id")
    puzzle_attempts = relationship("PuzzleAttempt", back_populates="user")
    achievements = relationship("UserAchievement", back_populates="user")
    daily_challenges = relationship("DailyChallengeAttempt", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

    # Parent-Student relationships
    children = relationship("ParentStudent", back_populates="parent", foreign_keys="ParentStudent.parent_id")
    parents = relationship("ParentStudent", back_populates="student", foreign_keys="ParentStudent.student_id")
    coached_batches = relationship("Batch", back_populates="coach", foreign_keys="Batch.coach_id")

# Game Model
class Game(Base):
    __tablename__ = "games"
    
    id = Column(Integer, primary_key=True, index=True)
    white_player_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    black_player_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Game details
    pgn = Column(Text)
    result = Column(String(20), nullable=True)  # PGN result: "1-0", "0-1", "1/2-1/2"
    # High-level reason for result: "checkmate", "resign", "timeout", "auto_resign", "draw", etc.
    result_reason = Column(String(32), nullable=True)
    winner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Game metadata
    time_control = Column(String)
    starting_fen = Column(String, default="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
    final_fen = Column(String)
    total_moves = Column(Integer, default=0)
    # Per-player clocks (ms). Each player has 10 minutes; ticks only on their turn.
    white_time_ms = Column(Integer, default=600000)   # 10 * 60 * 1000
    black_time_ms = Column(Integer, default=600000)
    
    # Bot game metadata (optional, only for bot games)
    bot_difficulty = Column(String, nullable=True)
    bot_depth = Column(Integer, nullable=True)
    
    # XP rewards
    xp_awarded_white = Column(Integer, default=0)
    xp_awarded_black = Column(Integer, default=0)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime)
    last_move_at = Column(DateTime, nullable=True)  # when the last move was made (for auto-resign timeout)

    # Relationships
    white_player = relationship("User", back_populates="games_as_white", foreign_keys=[white_player_id])
    black_player = relationship("User", back_populates="games_as_black", foreign_keys=[black_player_id])

# Puzzle Model
class Puzzle(Base):
    __tablename__ = "puzzles"
    
    id = Column(Integer, primary_key=True, index=True)
    lichess_id = Column(String, unique=True, index=True, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    
    # Puzzle data
    fen = Column(String, nullable=False)
    moves = Column(Text, nullable=False)
    difficulty = Column(Enum(DifficultyLevel), default=DifficultyLevel.BEGINNER)
    rating = Column(Integer, default=400)
    
    # Metadata
    theme = Column(String)
    xp_reward = Column(Integer, default=10)
    hints = Column(Text)
    
    # Stats
    attempts_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    attempts = relationship("PuzzleAttempt", back_populates="puzzle")

# Puzzle Attempt Model
class PuzzleAttempt(Base):
    __tablename__ = "puzzle_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    puzzle_id = Column(Integer, ForeignKey("puzzles.id"), nullable=False)
    
    is_solved = Column(Boolean, default=False)
    moves_made = Column(Text)
    time_taken = Column(Integer)
    hints_used = Column(Integer, default=0)
    xp_earned = Column(Integer, default=0)
    
    attempted_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="puzzle_attempts")
    puzzle = relationship("Puzzle", back_populates="attempts")

# Daily Challenge Model
class DailyChallenge(Base):
    __tablename__ = "daily_challenges"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, unique=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    challenge_type = Column(String, nullable=False)
    challenge_data = Column(Text, nullable=False)
    xp_reward = Column(Integer, default=50)
    bonus_xp = Column(Integer, default=20)
    difficulty = Column(Enum(DifficultyLevel), default=DifficultyLevel.INTERMEDIATE)
    time_limit = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    attempts = relationship("DailyChallengeAttempt", back_populates="challenge")

# Daily Challenge Attempt Model
class DailyChallengeAttempt(Base):
    __tablename__ = "daily_challenge_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("daily_challenges.id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    time_taken = Column(Integer)
    xp_earned = Column(Integer, default=0)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="daily_challenges")
    challenge = relationship("DailyChallenge", back_populates="attempts")

# Achievement Model
class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=False)
    icon_url = Column(String)
    criteria_type = Column(String)
    criteria_value = Column(Integer)
    xp_reward = Column(Integer, default=100)
    badge_color = Column(String, default="#FFD700")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user_achievements = relationship("UserAchievement", back_populates="achievement")

# User Achievement
class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    earned_at = Column(DateTime, default=datetime.utcnow)
    is_displayed = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")

# Puzzle Race Model
class PuzzleRace(Base):
    __tablename__ = "puzzle_races"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    puzzle_count = Column(Integer, default=5)
    time_limit = Column(Integer, default=300)
    difficulty = Column(Enum(DifficultyLevel))
    puzzle_ids = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    race_attempts = relationship("PuzzleRaceAttempt", back_populates="race")

# Puzzle Race Attempt Model
class PuzzleRaceAttempt(Base):
    __tablename__ = "puzzle_race_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    race_id = Column(Integer, ForeignKey("puzzle_races.id"), nullable=False)
    puzzles_solved = Column(Integer, default=0)
    time_taken = Column(Integer)
    score = Column(Integer, default=0)
    xp_earned = Column(Integer, default=0)
    puzzle_results = Column(Text)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    race = relationship("PuzzleRace", back_populates="race_attempts")

# Notification Model (in-app bell dropdown)
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    category = Column(String(32), nullable=False)  # "coach" | "achievement" | "system"
    title = Column(String(256), nullable=False)
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False)
    link_url = Column(String(512), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")

# Game Invite Model
class GameInvite(Base):
    __tablename__ = "game_invites"
    
    id = Column(Integer, primary_key=True, index=True)
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invitee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Invite status: pending, accepted, rejected, expired
    status = Column(String, default="pending")
    
    # Game details (set when invite is accepted)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    inviter = relationship("User", foreign_keys=[inviter_id])
    invitee = relationship("User", foreign_keys=[invitee_id])
    game = relationship("Game", foreign_keys=[game_id])


# Parent-Student Link Model
class ParentStudent(Base):
    __tablename__ = "parent_students"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    parent = relationship("User", back_populates="children", foreign_keys=[parent_id])
    student = relationship("User", back_populates="parents", foreign_keys=[student_id])


# Batch/Group Model
class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    schedule = Column(String)  # e.g., "Mon/Wed/Fri 4-5PM"
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    monthly_fee = Column(Integer, default=0)  # in cents
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    coach = relationship("User", back_populates="coached_batches", foreign_keys=[coach_id])
    students = relationship("StudentBatch", back_populates="batch")
    class_sessions = relationship("ClassSession", back_populates="batch")
    announcements = relationship("Announcement", back_populates="batch")
    payments = relationship("Payment", back_populates="batch")


# Student-Batch Assignment Model
class StudentBatch(Base):
    __tablename__ = "student_batches"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    payment_status = Column(String, default="pending")  # paid, pending, overdue
    joined_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    batch = relationship("Batch", back_populates="students")


# Class Session Model
class ClassSession(Base):
    __tablename__ = "class_sessions"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    topic = Column(String)
    meeting_link = Column(String)
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    batch = relationship("Batch", back_populates="class_sessions")
    creator = relationship("User", foreign_keys=[created_by])


# Announcement Model
class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True)  # null = global
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    batch = relationship("Batch", back_populates="announcements")
    creator = relationship("User", foreign_keys=[created_by])


# Payment Model
class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    amount = Column(Integer, nullable=False)  # in cents
    currency = Column(String, default="usd")
    billing_month = Column(String, nullable=False)  # "YYYY-MM"
    status = Column(String, default="pending")  # pending, completed, failed
    stripe_checkout_session_id = Column(String, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    parent = relationship("User", foreign_keys=[parent_id])
    student = relationship("User", foreign_keys=[student_id])
    batch = relationship("Batch", back_populates="payments")

# ─────────────────────────────────────────────────────────────
# Assignment Engine Models  (append to the bottom of models.py)
# ─────────────────────────────────────────────────────────────

class Assignment(Base):
    __tablename__ = "assignments"

    id          = Column(Integer, primary_key=True, index=True)
    coach_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    title       = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)

    # Target: batch OR individual student (at least one must be set)
    batch_id    = Column(Integer, ForeignKey("batches.id"),  nullable=True)
    student_id  = Column(Integer, ForeignKey("users.id"),    nullable=True)

    due_date    = Column(DateTime, nullable=True)
    is_active   = Column(Boolean, default=True, nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    coach       = relationship("User",  foreign_keys=[coach_id])
    batch       = relationship("Batch", foreign_keys=[batch_id])
    student     = relationship("User",  foreign_keys=[student_id])
    puzzles     = relationship("AssignmentPuzzle",    back_populates="assignment",
                               cascade="all, delete-orphan", order_by="AssignmentPuzzle.position")
    completions = relationship("AssignmentCompletion", back_populates="assignment",
                               cascade="all, delete-orphan")


class AssignmentPuzzle(Base):
    __tablename__ = "assignment_puzzles"

    id            = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    puzzle_id     = Column(Integer, ForeignKey("puzzles.id"),     nullable=False)
    position      = Column(Integer, default=0, nullable=False)

    # Relationships
    assignment = relationship("Assignment", back_populates="puzzles")
    puzzle     = relationship("Puzzle")


class AssignmentCompletion(Base):
    __tablename__ = "assignment_completions"

    id            = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id    = Column(Integer, ForeignKey("users.id"),       nullable=False)
    puzzle_id     = Column(Integer, ForeignKey("puzzles.id"),     nullable=False)
    completed_at  = Column(DateTime, default=datetime.utcnow,    nullable=False)

    # Relationships
    assignment = relationship("Assignment", back_populates="completions")
    student    = relationship("User",   foreign_keys=[student_id])
    puzzle     = relationship("Puzzle", foreign_keys=[puzzle_id])