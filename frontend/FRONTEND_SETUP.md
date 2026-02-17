# Prodigy Pawns - Next.js Frontend Setup Guide

## 📦 Step 1: Install Dependencies

In your `my-frontend` directory, install the required packages:

```bash
npm install axios zustand react-hot-toast lucide-react
npm install @radix-ui/react-avatar @radix-ui/react-progress @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install class-variance-authority clsx tailwind-merge
npm install chess.js react-chessboard
```

## 🎨 Step 2: Update Tailwind Config

Replace your `tailwind.config.ts` with the kid-friendly color scheme.

## 📁 Step 3: Project Structure

```
my-frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing/Home page
│   ├── login/
│   │   └── page.tsx        # Login page
│   ├── signup/
│   │   └── page.tsx        # Signup page
│   ├── dashboard/
│   │   └── page.tsx        # Student dashboard (protected)
│   ├── puzzles/
│   │   └── page.tsx        # Puzzles list (protected)
│   └── leaderboard/
│       └── page.tsx        # Leaderboard (protected)
├── components/
│   ├── ui/                 # Shadcn UI components
│   ├── Navbar.tsx          # Navigation bar
│   ├── XPBar.tsx           # XP progress bar
│   ├── LevelBadge.tsx      # Level display
│   ├── StatsCard.tsx       # Dashboard stats
│   └── ProtectedRoute.tsx  # Auth wrapper
├── lib/
│   ├── api.ts              # API client
│   ├── utils.ts            # Utilities
│   └── store.ts            # Zustand store
└── styles/
    └── globals.css         # Global styles
```

## 🎯 Key Features

1. **Authentication Flow**
   - Login/Signup pages
   - JWT token storage
   - Protected routes
   - Auto-redirect

2. **Dashboard**
   - XP progress bar
   - Level badge
   - Quick stats
   - Daily challenge widget

3. **Puzzle System**
   - Browse puzzles by difficulty
   - Interactive chess board
   - Solve and earn XP

4. **Leaderboard**
   - Top students by XP
   - Rankings display

## 🚀 Getting Started

1. Copy all files to their respective locations
2. Install dependencies
3. Start the dev server: `npm run dev`
4. Visit: `http://localhost:3000`

## 🎨 Color Scheme (Kid-Friendly)

- Primary Purple: #8B5CF6
- Success Green: #10B981
- Warning Yellow: #FBBF24
- Danger Red: #EF4444
- Info Blue: #3B82F6

The UI is designed to be:
- ✨ Colorful and engaging
- 🎮 Gamified (XP, levels, badges)
- 👶 Kid-friendly
- 📱 Mobile responsive
