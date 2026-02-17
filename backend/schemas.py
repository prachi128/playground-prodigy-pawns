from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    age: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    age: Optional[int]
    avatar_url: str
    total_xp: int
    level: int
    rating: int
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
    attempts_count: int
    success_count: int
    created_at: datetime
    
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
    time_control: str
    total_moves: int
    started_at: datetime
    ended_at: Optional[datetime]
    
    class Config:
        from_attributes = True

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
