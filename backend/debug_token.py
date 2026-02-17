from dotenv import load_dotenv
import os
from jose import jwt, JWTError
from datetime import datetime

load_dotenv()

# Your token from login
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImV4cCI6MTc3MTc3Njk2MX0.s3LLXNluBn5bEUEy5sJ6DUKWz_A18aoqyQ2_8l5zpDM"

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

print("=" * 60)
print("TOKEN DEBUG")
print("=" * 60)
print(f"Token: {TOKEN[:50]}...")
print(f"SECRET_KEY loaded: {bool(SECRET_KEY)}")
print(f"SECRET_KEY: {SECRET_KEY[:20]}..." if SECRET_KEY else "NOT SET")
print()

# Try to decode without verification first
try:
    unverified = jwt.decode(TOKEN, options={"verify_signature": False})
    print("✅ Token structure is valid")
    print(f"Payload (unverified): {unverified}")
    
    # Check expiration
    exp = unverified.get("exp")
    if exp:
        exp_datetime = datetime.fromtimestamp(exp)
        now = datetime.utcnow()
        print(f"Expires at: {exp_datetime}")
        print(f"Current time: {now}")
        print(f"Is expired: {now > exp_datetime}")
    print()
except Exception as e:
    print(f"❌ Token structure invalid: {e}")
    print()

# Try to decode with verification
try:
    verified = jwt.decode(TOKEN, SECRET_KEY, algorithms=[ALGORITHM])
    print("✅ Token signature is VALID")
    print(f"Payload (verified): {verified}")
except JWTError as e:
    print(f"❌ Token signature verification FAILED: {e}")
    print()
    print("This means either:")
    print("  1. The SECRET_KEY used to create the token is different")
    print("  2. The token has been tampered with")
    print("  3. The token is expired")

print("=" * 60)