from dotenv import load_dotenv
import os

# Load environment variables FIRST before anything else
load_dotenv()

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from models import User
from database import get_db

# Security configurations
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production-make-it-long-and-random")
ALGORITHM = "HS256"
# Short-lived access token (Cookie-Based Session Auth)
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
COOKIE_ACCESS_TOKEN = "access_token"
COOKIE_REFRESH_TOKEN = "refresh_token"

# Debug: Print SECRET_KEY info on import
print(f"🔑 AUTH.PY - SECRET_KEY loaded: {bool(SECRET_KEY)}")
print(f"🔑 AUTH.PY - SECRET_KEY length: {len(SECRET_KEY)}")
print(f"🔑 AUTH.PY - SECRET_KEY preview: {SECRET_KEY[:20]}...")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password - truncate to 72 bytes for bcrypt compatibility"""
    # Bcrypt has a 72 byte limit, so truncate if needed
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a short-lived JWT access token (for HttpOnly cookie)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    if "sub" in to_encode and not isinstance(to_encode["sub"], str):
        to_encode["sub"] = str(to_encode["sub"])
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    """Create a long-lived JWT refresh token (for HttpOnly cookie)."""
    to_encode = data.copy()
    to_encode.update({
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
    })
    if "sub" in to_encode and not isinstance(to_encode["sub"], str):
        to_encode["sub"] = str(to_encode["sub"])
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_refresh_token(token: str) -> Optional[int]:
    """Decode refresh token and return user_id (sub). Returns None if invalid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (JWTError, ValueError):
        return None


def get_token_from_cookie_or_bearer(
    request: Request,
    token_from_bearer: Optional[str] = Depends(oauth2_scheme),
) -> str:
    """Get access token from cookie (preferred) or Authorization Bearer header. Raises 401 if missing."""
    # FastAPI automatically injects Request when it's a parameter
    token = request.cookies.get(COOKIE_ACCESS_TOKEN)
    if token:
        return token
    if token_from_bearer:
        return token_from_bearer
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    request: Request,
    token_from_bearer: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Get current user from JWT - token from cookie or Authorization header. Returns user_id."""
    # Get token from cookie or bearer header
    token = request.cookies.get(COOKIE_ACCESS_TOKEN)
    if not token:
        token = token_from_bearer
    if not token:
        # Debug: log available cookies
        print(f"🔍 No token found. Cookies: {list(request.cookies.keys())}")
        print(f"🔍 Bearer token present: {bool(token_from_bearer)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") == "refresh":
            raise credentials_exception
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is deactivated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user_id
    except JWTError:
        raise credentials_exception
    except ValueError:
        raise credentials_exception

def authenticate_user(db: Session, email: str, password: str):
    """Authenticate a user by email and password"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if user.is_active is False:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user