# Prodigy Pawns Student Portal - Project Structure

## 🎨 Design Philosophy
- **Kid-Friendly**: Bright colors, large buttons, playful animations
- **Gamified**: XP points, levels, achievements, rewards
- **Engaging**: Interactive elements, progress bars, celebrations
- **Intuitive**: Simple navigation, clear feedback

## 📁 Backend Structure (FastAPI)

```
my-backend/
├── main.py                 # Main FastAPI application
├── models.py              # Database models
├── .env                   # Environment variables
├── requirements.txt       # Python dependencies
├── routers/
│   ├── auth.py           # Authentication routes
│   ├── users.py          # User management
│   ├── games.py          # Game endpoints
│   ├── puzzles.py        # Puzzle endpoints
│   ├── challenges.py     # Daily challenges
│   └── leaderboard.py    # Leaderboard endpoints
├── services/
│   ├── auth_service.py   # Authentication logic
│   ├── xp_service.py     # XP calculation and leveling
│   ├── game_service.py   # Game logic
│   └── puzzle_service.py # Puzzle validation
└── utils/
    ├── security.py       # Password hashing, JWT
    └── database.py       # Database connection
```

## 📁 Frontend Structure (Next.js)

```
my-frontend/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── login/
│   │   └── page.tsx           # Login page
│   ├── dashboard/
│   │   └── page.tsx           # Student dashboard
│   ├── play/
│   │   └── page.tsx           # Play games
│   ├── puzzles/
│   │   ├── page.tsx           # Puzzle list
│   │   └── [id]/page.tsx      # Individual puzzle
│   ├── puzzle-racer/
│   │   └── page.tsx           # Puzzle race mode
│   ├── challenges/
│   │   └── page.tsx           # Daily challenges
│   ├── leaderboard/
│   │   └── page.tsx           # Leaderboard
│   └── profile/
│       └── page.tsx           # User profile
├── components/
│   ├── ui/                    # Shadcn UI components
│   ├── chess/
│   │   ├── ChessBoard.tsx    # Interactive chess board
│   │   ├── PieceSelector.tsx
│   │   └── MoveHistory.tsx
│   ├── puzzles/
│   │   ├── PuzzleCard.tsx
│   │   ├── PuzzleTimer.tsx
│   │   └── HintButton.tsx
│   ├── dashboard/
│   │   ├── XPBar.tsx         # XP progress bar
│   │   ├── LevelBadge.tsx
│   │   ├── StatsCard.tsx
│   │   └── RecentActivity.tsx
│   ├── leaderboard/
│   │   ├── LeaderboardTable.tsx
│   │   └── UserRankCard.tsx
│   └── common/
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       ├── LoadingSpinner.tsx
│       └── Avatar.tsx
├── lib/
│   ├── api.ts                # API client
│   ├── auth.ts              # Auth utilities
│   └── utils.ts             # Helper functions
├── hooks/
│   ├── useUser.ts           # User state hook
│   ├── useAuth.ts           # Authentication hook
│   └── useChessboard.ts     # Chess logic hook
├── styles/
│   └── globals.css          # Global styles
└── public/
    ├── avatars/             # Student avatars
    ├── achievements/        # Achievement badges
    └── sounds/              # Sound effects
```

## 🎮 Key Features

### 1. Dashboard
- Welcome message with student's name
- XP progress bar showing progress to next level
- Current level and rank
- Quick stats (games played, puzzles solved, achievements)
- Daily challenge widget
- Recent activity feed

### 2. Play Games
- Find opponent (matchmaking by rating)
- Play vs Computer (different difficulty levels)
- Time controls (3+0, 5+0, 10+0, 15+10)
- Real-time gameplay using Socket.io or WebSockets
- Move validation and legal move highlighting
- XP rewards based on game outcome

### 3. Puzzles
- Browse puzzles by difficulty
- Puzzle categories (tactics, endgames, checkmate)
- Hint system (costs XP or reduces reward)
- Timer for speed solving
- Solution explanation after completion
- XP rewards on successful solve

### 4. Puzzle Racer
- Competitive timed puzzle solving
- Race against the clock
- Multiple puzzles in sequence
- Leaderboard for fastest times
- Bonus XP for high scores

### 5. Daily Challenges
- New challenge every day
- Special XP rewards
- Streak bonuses
- Challenge history

### 6. Leaderboard
- Global rankings
- Weekly/Monthly/All-time views
- Filter by age group
- Friend comparisons

### 7. Profile & Achievements
- Customizable avatar
- Display achievements/badges
- Game history
- Statistics and graphs
- XP and level progression

## 🎨 Color Scheme (Kid-Friendly)

```css
Primary Colors:
- Purple: #8B5CF6 (Magical, playful)
- Blue: #3B82F6 (Trust, calm)
- Green: #10B981 (Success, growth)
- Yellow: #FBBF24 (Energy, fun)
- Orange: #F97316 (Excitement)
- Pink: #EC4899 (Friendly, warm)

Backgrounds:
- Light: #F9FAFB
- Card: #FFFFFF
- Dark mode: #1F2937

Text:
- Primary: #111827
- Secondary: #6B7280
- Muted: #9CA3AF
```

## 🏗️ Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Relational database
- **python-chess**: Chess logic and validation
- **JWT**: Authentication tokens
- **WebSockets**: Real-time game communication

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Shadcn/ui**: UI components
- **chess.js**: Chess logic
- **react-chessboard**: Chess board component
- **Framer Motion**: Animations
- **Zustand**: State management
- **Socket.io-client**: Real-time communication

## 📦 Additional Dependencies

### Backend
```txt
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
python-dotenv
python-jose[cryptography]
passlib[bcrypt]
python-multipart
python-chess
websockets
```

### Frontend
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "chess.js": "^1.0.0",
    "react-chessboard": "^4.0.0",
    "framer-motion": "^10.0.0",
    "zustand": "^4.0.0",
    "socket.io-client": "^4.0.0",
    "axios": "^1.0.0",
    "@radix-ui/react-*": "Various Radix UI primitives"
  }
}
```

## 🚀 Development Phases

### Phase 1: Foundation (Week 1-2)
- Setup backend and database
- User authentication
- Basic dashboard
- Simple chess board display

### Phase 2: Core Features (Week 3-4)
- Game playing functionality
- Puzzle system
- XP and leveling system
- Basic leaderboard

### Phase 3: Gamification (Week 5-6)
- Achievements system
- Daily challenges
- Puzzle racer
- Sound effects and animations

### Phase 4: Polish (Week 7-8)
- UI/UX improvements
- Mobile responsiveness
- Performance optimization
- Testing and bug fixes

### Phase 5: Launch (Week 9-10)
- Deploy backend (Railway, Render, or AWS)
- Deploy frontend (Vercel)
- User testing
- Documentation
