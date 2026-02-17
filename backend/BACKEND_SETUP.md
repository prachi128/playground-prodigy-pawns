# Backend Setup Instructions

## 📦 Files to Copy to Your Backend Directory

Copy these files from the outputs to your `backend` folder:

1. `auth.py` - Authentication utilities
2. `schemas.py` - Pydantic validation schemas
3. `main_with_auth.py` - Complete FastAPI app with auth (rename to `main.py`)
4. `seed_data.py` - Database seeder
5. `requirements.txt` - Python dependencies
6. Keep your existing `models.py` and `.env`

## 🚀 Installation Steps

### 1. Install New Dependencies

```bash
cd backend
venv\Scripts\activate
pip install python-jose[cryptography] passlib[bcrypt] pydantic[email] --break-system-packages
```

### 2. Add SECRET_KEY to .env

Add this line to your `.env` file:

```
SECRET_KEY=your-super-secret-key-make-it-long-and-random-at-least-32-characters
```

You can generate a random key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Replace main.py

Rename your current `main.py` to `main_old.py` (backup), then rename `main_with_auth.py` to `main.py`:

```bash
# In your backend directory
move main.py main_old.py
move main_with_auth.py main.py
```

### 4. Start the Server

```bash
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### 5. Seed the Database

In a new terminal (keep the server running):

```bash
cd backend
venv\Scripts\activate
python seed_data.py
```

This will create:
- ✅ 5 test users (4 students + 1 admin)
- ✅ 7 chess puzzles (beginner to expert)
- ✅ 6 achievements
- ✅ 1 daily challenge

## 🧪 Test the API

### Visit the Interactive Docs
Open: http://127.0.0.1:8000/docs

### Test Login

1. Click on "POST /api/auth/login"
2. Click "Try it out"
3. Use these credentials:

```json
{
  "email": "alice@prodigypawns.com",
  "password": "password123"
}
```

4. You should get back an access token!

### Test Protected Endpoint

1. Copy the access_token from login response
2. Click the "Authorize" button (🔒) at the top
3. Enter: `Bearer YOUR_TOKEN_HERE`
4. Click "Authorize"
5. Now try "GET /api/auth/me" - it should return Alice's profile!

## 👥 Test Accounts

| Name | Email | Username | Password | Level | XP |
|------|-------|----------|----------|-------|-----|
| Alice Wonder | alice@prodigypawns.com | alice_chess | password123 | 3 | 250 |
| Bob Builder | bob@prodigypawns.com | bob_knight | password123 | 2 | 180 |
| Charlie Brown | charlie@prodigypawns.com | charlie_pawn | password123 | 4 | 320 |
| Diana Prince | diana@prodigypawns.com | diana_queen | password123 | 5 | 450 |
| Admin User | admin@prodigypawns.com | admin | admin123 | 10 | 1000 |

## 📋 Available Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/me` - Get current user (protected)

### Users
- `GET /api/users/{user_id}` - Get user by ID
- `PUT /api/users/me` - Update profile (protected)
- `GET /api/users/me/stats` - Get user statistics (protected)

### Puzzles
- `GET /api/puzzles` - List puzzles (filter by difficulty/theme)
- `GET /api/puzzles/{puzzle_id}` - Get specific puzzle
- `POST /api/puzzles/{puzzle_id}/attempt` - Submit solution (protected)

### Games
- `GET /api/games` - List games (filter by user)

### Achievements
- `GET /api/achievements` - List all achievements

### Daily Challenge
- `GET /api/daily-challenge` - Get today's challenge

### Leaderboard
- `GET /api/leaderboard` - Get rankings (by XP or rating)

## 🔒 Authentication Flow

1. **Signup/Login** → Get JWT token
2. **Store token** in frontend (localStorage or cookies)
3. **Send token** in Authorization header: `Bearer YOUR_TOKEN`
4. **Access protected routes** with the token

## 🎯 Next Steps

Now that authentication is working, you can:

1. ✅ Build the Next.js frontend
2. ✅ Create login/signup pages
3. ✅ Implement protected routes
4. ✅ Build the dashboard
5. ✅ Create puzzle interface

Ready to start on the frontend? Let me know! 🚀
