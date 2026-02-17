from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")

print("=" * 50)
print("Environment Check")
print("=" * 50)
print(f"SECRET_KEY exists: {bool(SECRET_KEY)}")
print(f"SECRET_KEY length: {len(SECRET_KEY) if SECRET_KEY else 0}")
if SECRET_KEY:
    print(f"SECRET_KEY preview: {SECRET_KEY[:20]}...")
else:
    print("⚠️ SECRET_KEY is not set!")
print("=" * 50)