from dotenv import load_dotenv
import os

# Load environment variables FIRST before anything else
load_dotenv()

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from models import User

# Security configurations
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production-make-it-long-and-random")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Debug: Print SECRET_KEY info on import
print(f"🔑 AUTH.PY - SECRET_KEY loaded: {bool(SECRET_KEY)}")
print(f"🔑 AUTH.PY - SECRET_KEY length: {len(SECRET_KEY)}")
print(f"🔑 AUTH.PY - SECRET_KEY preview: {SECRET_KEY[:20]}...")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

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
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Convert sub to string if it's not already (JWT spec requires string)
    if "sub" in to_encode and not isinstance(to_encode["sub"], str):
        to_encode["sub"] = str(to_encode["sub"])
    
    print(f"🔨 Creating token with data: {to_encode}")
    print(f"🔑 Using SECRET_KEY: {SECRET_KEY[:20]}...")
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    print(f"✅ Token created: {encoded_jwt[:50]}...")
    
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user from JWT token - returns user_id only"""
    print(f"🔍 Validating token: {token[:50]}...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        print(f"🔑 Using SECRET_KEY: {SECRET_KEY[:20]}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"✅ Token decoded successfully: {payload}")
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            print("❌ No 'sub' in token payload")
            raise credentials_exception
        # Convert string back to int
        user_id = int(user_id_str)
        print(f"✅ User ID from token: {user_id}")
        return user_id
    except JWTError as e:
        print(f"❌ JWT Error: {e}")
        raise credentials_exception
    except ValueError as e:
        print(f"❌ Invalid user_id format: {e}")
        raise credentials_exception

def authenticate_user(db: Session, email: str, password: str):
    """Authenticate a user by email and password"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user