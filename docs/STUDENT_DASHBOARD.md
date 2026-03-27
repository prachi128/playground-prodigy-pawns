# Student Dashboard Documentation

## Overview

The Student Dashboard is a gamified chess learning platform designed for students to practice tactics, track progress, and compete with peers. It provides an engaging, kid-friendly interface with interactive puzzle solving, rating-based level progression, XP usage, and stars economy features.

---

## Functional Overview & Business Value

### Purpose & Goals

The Student Dashboard empowers chess students to:

1. **Track Learning Progress**: Visualize improvement through rating, levels, stars, XP, and statistics
2. **Practice Tactical Skills**: Solve chess puzzles at appropriate difficulty levels
3. **Earn Rewards**: Gain XP from puzzle solving and convert XP to stars for shop rewards
4. **Compete & Compare**: See rankings on leaderboards and compare with peers
5. **Stay Motivated**: Gamification elements keep learning fun and engaging

### Key Problems Solved

#### Problem 1: Lack of Progress Visibility
- **Challenge**: Students can't see their improvement over time
- **Solution**: Comprehensive statistics dashboard showing games played, puzzles solved, win rates, and accuracy
- **Benefit**: Students understand their progress and stay motivated

#### Problem 2: Difficulty Matching
- **Challenge**: Finding puzzles at the right difficulty level
- **Solution**: Difficulty filters (Beginner, Intermediate, Advanced, Expert) with color-coded badges
- **Benefit**: Students can practice at their skill level and gradually progress

#### Problem 3: Lack of Motivation
- **Challenge**: Chess practice can feel repetitive and boring
- **Solution**: Gamification with XP rewards, levels, achievements, and leaderboards
- **Benefit**: Students stay engaged and motivated to practice regularly

#### Problem 4: No Learning Feedback
- **Challenge**: Students don't know if they're improving
- **Solution**: Real-time feedback on puzzle attempts, accuracy tracking, and success rates
- **Benefit**: Students can see their improvement and identify areas to focus on

#### Problem 5: Difficulty Getting Help
- **Challenge**: Students get stuck on puzzles without guidance
- **Solution**: Hint system that provides progressive assistance
- **Benefit**: Students can learn from hints while still earning partial XP

### Core Functionalities

#### 1. Progress Tracking
**What it does**: Displays comprehensive statistics about student performance
**Business Value**: 
- Motivates students through visible progress
- Helps identify strengths and weaknesses
- Encourages regular practice

**User Goals**:
- See how many puzzles they've solved
- Track improvement in accuracy
- Monitor XP and level progression

**Outcomes**:
- Students understand their progress
- Increased motivation to practice
- Better self-assessment of skills

#### 2. Puzzle Solving
**What it does**: Interactive chess puzzle interface with real-time validation
**Business Value**:
- Provides structured tactical practice
- Ensures correct learning through validation
- Tracks learning patterns

**User Goals**:
- Practice chess tactics
- Improve problem-solving skills
- Earn XP and level up

**Outcomes**:
- Improved tactical awareness
- Better chess skills
- Sense of accomplishment

#### 3. Progression & Rewards System
**What it does**: Rewards students with XP, supports star economy, and tracks levels from rating
**Business Value**:
- Increases engagement through gamification
- Provides clear progression milestones
- Encourages continued practice

**User Goals**:
- Earn XP by solving puzzles
- Use XP strategically (hints or star conversion)
- Track rating growth and level progression
- Compete with peers

**Outcomes**:
- Higher engagement rates
- More consistent practice
- Long-term retention

#### 4. Leaderboard Competition
**What it does**: Shows student rankings based on XP or rating
**Business Value**:
- Creates healthy competition
- Motivates students to practice more
- Builds community engagement

**User Goals**:
- See their rank among peers
- Compete for top positions
- Track relative progress

**Outcomes**:
- Increased practice frequency
- Community building
- Sustained motivation

### Use Cases & Scenarios

#### Use Case 1: Daily Practice Session
**Scenario**: A student wants to practice chess for 30 minutes daily

**Steps**:
1. Student logs in and views dashboard
2. Sees current level and XP progress
3. Clicks "Solve Puzzles" button
4. Filters puzzles by difficulty (e.g., Intermediate)
5. Selects a puzzle to solve
6. Solves puzzle correctly and earns XP
7. Sees XP added to progress bar
8. Levels up if enough XP earned
9. Views updated statistics

**Time**: ~5-10 minutes per puzzle
**Outcome**: Consistent practice with visible progress

#### Use Case 2: Improving Accuracy
**Scenario**: A student notices low accuracy rate and wants to improve

**Steps**:
1. Student views dashboard statistics
2. Sees accuracy is 45% (below target)
3. Reviews puzzle attempts to identify patterns
4. Focuses on easier puzzles to build confidence
5. Uses hints when stuck to learn correct solutions
6. Gradually moves to harder puzzles
7. Tracks accuracy improvement over time

**Outcome**: Improved puzzle-solving skills and higher accuracy

#### Use Case 3: Leveling Up
**Scenario**: A student is close to leveling up and wants to reach the next level

**Steps**:
1. Student checks current rating and next target band
2. Identifies the rating needed for next level
3. Practices through puzzles and games
4. Uses hints strategically (XP cost tradeoff)
5. Improves tactical quality and game outcomes
6. Rating increases into the next level band
7. Student sees updated level on dashboard
8. Student reviews XP and stars for reward planning

**Outcome**: Sense of achievement and motivation to continue

#### Use Case 4: Competitive Play
**Scenario**: A student wants to climb the leaderboard

**Steps**:
1. Student views current leaderboard position
2. Identifies whether next rank target is on XP or rating leaderboard
3. Plans puzzle-solving and game session accordingly
4. Focuses on relevant activities (XP gain and/or rating improvement)
5. Solves puzzles efficiently (minimal hints)
6. Checks leaderboard after session
7. Sees improved rank

**Outcome**: Increased engagement and practice time

### Benefits Summary

**For Students**:
- 🎯 **Clear Progress**: Visual feedback on improvement
- 🎮 **Engaging Learning**: Gamification makes practice fun
- 📈 **Skill Development**: Structured tactical practice
- 🏆 **Achievement**: Levels and XP provide sense of accomplishment
- 👥 **Community**: Leaderboards create social engagement

**For Parents/Coaches**:
- 📊 **Progress Visibility**: See student improvement over time
- 🎯 **Goal Setting**: Clear milestones and achievements
- 📈 **Engagement Metrics**: Track practice frequency and success
- 🎓 **Learning Support**: Hint system helps without giving answers
- 💪 **Motivation**: Gamification keeps students practicing

**For Platform**:
- 📈 **Retention**: Gamification increases user engagement
- 🎯 **Learning Outcomes**: Structured practice improves skills
- 👥 **Community**: Leaderboards build social connections
- 📊 **Analytics**: Track student progress and platform health

---

## Main Dashboard (`/dashboard/page.tsx`)

The main dashboard serves as the central hub for students, providing an overview of their progress and quick access to key features.

### Functional Purpose

The main dashboard gives students a **comprehensive view** of their chess learning journey. It answers key questions:
- What level am I?
- How much progress have I made?
- How am I performing overall?
- What should I do next?

This "at-a-glance" view helps students understand their progress, stay motivated, and quickly access practice tools.

### Welcome Header

- **Personalized Greeting**: "Welcome back, {name}! 🎉"
- **Motivational Message**: "Ready to level up your chess skills today?"
- **Purpose**: Creates welcoming, personalized experience
- **Visual**: Large, friendly text with emoji

### Level, Rating, Stars & XP

#### Level Badge Card
- **Display**: Large level number (e.g., "5")
- **Additional Info**: Current rating displayed below level
- **Visual**: Gradient yellow-to-orange-to-pink background with trophy icon
- **Purpose**: Prominently displays student's achievement level
- **Functional Value**: 
  - Shows current skill progression
  - Provides sense of accomplishment
  - Motivates to reach next level

#### XP Progress
- **Component**: `XPBar` component
- **Display**: 
  - Progress bar showing XP in current level
  - Current XP / XP needed for next level
  - Percentage complete
  - Total XP earned
- **Visual**: Gradient progress bar with sparkle icon
- **Purpose**: Shows XP accumulation and resource availability
- **Functional Value**:
  - Clear visualization of earned XP
  - Helps students decide hint usage vs star conversion
  - Motivates continued practice

### Statistics Cards

Four key metric cards display important performance statistics:

#### 1. Games Played Card
- **Icon**: Gamepad2 (purple theme)
- **Main Metric**: Total games played
- **Sub-metric**: Number of wins
- **Color Scheme**: Purple border and text
- **Functional Purpose**: 
  - Shows overall activity level
  - Tracks competitive play engagement
  - Displays win count for motivation

#### 2. Win Rate Card
- **Icon**: Trophy (yellow theme)
- **Main Metric**: Win rate percentage
- **Sub-metric**: "Keep it up!" encouragement message
- **Color Scheme**: Yellow border and text
- **Functional Purpose**:
  - Shows competitive performance
  - Indicates improvement over time
  - Provides motivation through success rate

#### 3. Puzzles Solved Card
- **Icon**: Puzzle (blue theme)
- **Main Metric**: Total puzzles solved successfully
- **Sub-metric**: Total puzzle attempts
- **Color Scheme**: Blue border and text
- **Functional Purpose**:
  - Tracks practice activity
  - Shows dedication to learning
  - Displays attempt count for context

#### 4. Accuracy Card
- **Icon**: Target (green theme)
- **Main Metric**: Puzzle solving accuracy percentage
- **Sub-metric**: "Puzzle solving" label
- **Color Scheme**: Green border and text
- **Functional Purpose**:
  - Shows skill level and improvement
  - Indicates learning effectiveness
  - Helps identify areas for improvement

### Quick Actions

Two prominent action buttons provide immediate access to core features:

#### 1. Solve Puzzles Button
- **Route**: `/puzzles`
- **Description**: "Practice tactics and earn XP! 🧩"
- **Visual**: Blue gradient background with puzzle icon
- **Hover Effect**: Scale animation and border color change
- **Functional Purpose**: 
  - Quick access to puzzle library
  - Encourages practice
  - Clear call-to-action

#### 2. Leaderboard Button
- **Route**: `/leaderboard`
- **Description**: "See where you rank! 🏆"
- **Visual**: Yellow-to-orange gradient with trophy icon
- **Hover Effect**: Scale animation and border color change
- **Functional Purpose**:
  - Quick access to competitive rankings
  - Motivates through competition
  - Shows social engagement

### Authentication & Access Control

- **Required**: Authenticated user (student role)
- **Unauthorized Access**: Redirects to `/login`
- **Loading States**: Shows spinner with "Loading your dashboard..." message
- **Background**: Gradient from primary-50 via purple-50 to blue-50

---

## Puzzles List Page (`/puzzles/page.tsx`)

A grid-based interface for browsing and selecting puzzles to solve.

### Functional Purpose

The puzzles list page enables students to **discover and select puzzles** that match their skill level and interests. It transforms puzzle selection from a tedious task into an engaging browsing experience.

### Header Section

- **Title**: "Chess Puzzles 🧩"
- **Description**: "Solve puzzles and earn XP!"
- **Purpose**: Clear indication of page purpose and motivation

### Difficulty Filter System

Five filter buttons allow students to view puzzles by difficulty:

1. **All** - Shows all available puzzles (default)
2. **Beginner** - Easy puzzles for new players
3. **Intermediate** - Moderate difficulty puzzles
4. **Advanced** - Challenging puzzles for skilled players
5. **Expert** - Very difficult puzzles for advanced players

**Visual States**:
- **Active Filter**: Purple background (`#9333ea`), white text, purple border
- **Inactive Filter**: White background, gray text, gray border

**Functional Purpose**:
- Helps students find appropriate difficulty level
- Prevents frustration from puzzles that are too hard
- Allows gradual progression through difficulty levels

### Puzzle Cards Grid

Each puzzle is displayed as an interactive card with:

#### Card Components

1. **Title & Description**
   - Puzzle title with theme emoji
   - Brief description of the puzzle
   - Clickable to navigate to puzzle page

2. **XP Reward Badge**
   - XP amount shown for puzzle reward
   - Yellow color scheme
   - Prominently displayed in top-right

3. **Difficulty Badge**
   - Color-coded badge (uses `getDifficultyColor()` utility)
   - Capitalized difficulty level
   - Rounded pill styling with border

4. **Theme Badge** (if available)
   - Blue badge showing tactical theme
   - Examples: Fork, Pin, Back Rank Mate, etc.
   - Helps students identify puzzle types

5. **Rating & Success Rate**
   - Puzzle rating displayed
   - Success rate: "{success_count}/{attempts_count} solved"
   - Helps students gauge puzzle difficulty

6. **Solve Button**
   - Gradient purple-to-primary button
   - "Solve Puzzle →" text
   - Navigates to puzzle solving page

#### Card Interactions

- **Hover Effect**: Scale transform and border color change
- **Click**: Navigates to puzzle detail/solving page
- **Visual Feedback**: Clear indication of interactivity

### Empty State

- **Icon**: Puzzle icon
- **Message**: "No puzzles found"
- **Purpose**: Clear feedback when no puzzles match filters

---

## Puzzle Solving Page (`/puzzles/[id]/page.tsx`)

An interactive, full-featured puzzle solving interface with real-time validation and feedback.

### Functional Purpose

The puzzle solving page provides a **complete learning experience** where students can:
- Practice tactical skills
- Receive immediate feedback
- Learn from mistakes
- Track their progress
- Earn rewards for success

### Layout Structure

**Left Section (2 columns)**: Interactive chessboard
**Right Section (1 column)**: Information panel with controls

### Header Section

- **Back Button**: Returns to puzzles list
- **Puzzle Title**: Displays puzzle title with theme emoji
- **Description**: Brief puzzle description
- **XP Badge**: Shows XP reward amount

### Chessboard Section

#### Interactive Chessboard
- **Component**: `react-chessboard` library
- **Features**:
  - Drag-and-drop piece movement
  - Real-time position updates
  - Move validation (prevents illegal moves)
  - Visual feedback on moves
- **Styling**:
  - Purple dark squares, light purple light squares
  - Rounded corners
  - Box shadow for depth
  - Max width: 350px, centered

#### Move Validation
- **Real-time Check**: Validates moves as they're made
- **Illegal Move Prevention**: Blocks invalid moves
- **Solution Tracking**: Compares moves to puzzle solution
- **Completion Detection**: Automatically detects when puzzle is solved

### Information Panel

#### Status Card (shown after attempt)
- **Success State**:
  - Green background with checkmark icon
  - "Correct! Well done! 🎉" message
  - "Next Puzzle" button to continue
- **Failure State**:
  - Red background with X icon
  - "Not quite! Try again" message
  - Encourages retry

#### Puzzle Info Card
- **Difficulty Badge**: Color-coded difficulty level
- **Theme Badge**: Tactical theme (if available)
- **Rating**: Puzzle rating number
- **Success Rate**: Percentage of successful solves
- **Purpose**: Provides context about puzzle difficulty

#### Action Buttons

1. **Hint Button**
   - Yellow background with lightbulb icon
   - Label: "Hint (-2 XP)"
   - **Functionality**:
     - Shows next move hint
     - Reduces XP reward by 2 points
     - Helps students learn without giving full answer
   - **Disabled**: When puzzle is already solved/attempted
   - **Functional Value**:
     - Provides learning support
     - Encourages independent thinking (costs XP)
     - Helps students progress when stuck

2. **Reset Button**
   - Gray background with rotate icon
   - Label: "Reset"
   - **Functionality**:
     - Resets puzzle to starting position
     - Clears moves made
     - Resets timer and hints
   - **Disabled**: When puzzle is already solved/attempted
   - **Functional Value**:
     - Allows multiple attempts
     - Enables practice without penalty
     - Helps students learn from mistakes

#### Progress Card
- **Moves Made**: Count of moves attempted
- **Hints Used**: Number of hints requested
- **Time**: Elapsed time in seconds
- **Purpose**: Tracks solving performance

### Puzzle Solving Flow

#### Step 1: Load Puzzle
1. Student selects puzzle from list
2. Puzzle loads with FEN position
3. Chessboard displays starting position
4. Timer starts automatically

#### Step 2: Make Moves
1. Student drags pieces to make moves
2. System validates each move
3. Moves are tracked and compared to solution
4. Progress is displayed in real-time

#### Step 3: Submit Solution
1. When solution is complete, system validates
2. If correct:
   - Success message displayed
   - XP awarded (reduced by hints used)
   - User XP and level updated
   - Toast notification shows XP earned
3. If incorrect:
   - Error message displayed
   - Student can try again
   - No XP awarded

#### Step 4: Continue Learning
1. Student can click "Next Puzzle" to continue
2. Or return to puzzle list
3. Progress is saved automatically

### XP Calculation

- **Base XP**: Puzzle's `xp_reward` value
- **Hint Penalty**: -2 XP per hint used
- **Minimum XP**: 5 XP minimum (even with hints)
- **Formula**: `max(5, base_xp - (hints_used * 2))`

### Rating / Level / Stars Rules

- **Level Source**: Level is derived from **rating bands**, not XP.
- **XP Role**: XP is used for puzzle rewards and hint costs.
- **Stars Economy**: `1 star = 250 XP`.
- **Star Shop**: Students can spend stars on shop items; purchases are tracked.

---

## Backend API Endpoints

All endpoints are prefixed with `/api` and require authentication for protected routes.

### Authentication Endpoints

#### 1. Get Current User Stats
- **Method**: `GET`
- **Route**: `/api/users/me/stats`
- **Authentication**: Required
- **Response**:
  ```json
  {
    "games_played": int,
    "games_won": int,
    "win_rate": float,
    "puzzles_solved": int,
    "puzzle_attempts": int,
    "puzzle_accuracy": float,
    "total_xp": int,
    "star_balance": int,
    "level": int,
    "rating": int
  }
  ```
- **Calculations**:
  - `win_rate` = `(games_won / games_played) * 100` (0 if no games)
  - `puzzle_accuracy` = `(puzzles_solved / puzzle_attempts) * 100` (0 if no attempts)
  - `level` is derived from rating bands (backend-controlled)

### Puzzle Endpoints

#### 1. Get All Puzzles
- **Method**: `GET`
- **Route**: `/api/puzzles`
- **Query Parameters**:
  - `difficulty`: Optional string (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT)
  - `theme`: Optional string (filter by tactical theme)
  - `skip`: Optional int (pagination offset)
  - `limit`: Optional int (results per page)
- **Response**: List of `Puzzle` objects
- **Filtering**: Only returns active puzzles (`is_active = True`)

#### 2. Get Single Puzzle
- **Method**: `GET`
- **Route**: `/api/puzzles/{puzzle_id}`
- **Response**: Single `Puzzle` object
- **Errors**: 
  - 404: Puzzle not found

#### 3. Submit Puzzle Attempt
- **Method**: `POST`
- **Route**: `/api/puzzles/{puzzle_id}/attempt`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "is_solved": bool,
    "moves_made": str,  // Space-separated moves in UCI format
    "time_taken": int,  // Seconds
    "hints_used": int   // Number of hints used
  }
  ```
- **Process**:
  1. Validates puzzle exists
  2. Calculates XP earned (if solved):
     - Base: puzzle's `xp_reward`
     - Penalty: -2 XP per hint
     - Minimum: 5 XP
  3. Updates user XP (level remains rating-derived)
  4. Updates puzzle statistics:
     - Increments `attempts_count`
     - Increments `success_count` if solved
  5. Creates `PuzzleAttempt` record
- **Response**: `PuzzleAttemptResponse` with `xp_earned` field
- **Errors**:
  - 404: Puzzle or user not found
  - 401: Unauthorized

### Response Models

#### Puzzle
```json
{
  "id": int,
  "title": str,
  "description": Optional[str],
  "fen": str,
  "moves": str,
  "difficulty": str,
  "rating": int,
  "theme": Optional[str],
  "xp_reward": int,
  "attempts_count": int,
  "success_count": int,
  "created_at": str,
  "is_active": bool
}
```

#### UserStats
```json
{
  "games_played": int,
  "games_won": int,
  "win_rate": float,
  "puzzles_solved": int,
  "puzzle_attempts": int,
  "puzzle_accuracy": float,
  "total_xp": int,
  "star_balance": int,
  "level": int,
  "rating": int
}
```

---

## Components

### XPBar Component (`components/XPBar.tsx`)

#### Functional Purpose
Visualizes student XP accumulation through an animated progress bar.

#### Features
- **Progress Calculation**: Shows XP within current level (0-100)
- **Visual Display**: 
  - Gradient progress bar (yellow-to-orange-to-pink)
  - Percentage display
  - Current XP / Required XP
  - XP remaining to next level
- **Visual Effects**:
  - Smooth animation on progress change
  - Shine effect overlay
  - Sparkle icon
  - Progress dots indicator

#### Props
- `totalXP`: Total XP earned by student
- `currentLevel`: Current level number (display context)

#### Note
- XP bar is a visual progress element.
- Source-of-truth leveling logic is rating-based in backend.

### StatsCard Component (`components/StatsCard.tsx`)

#### Functional Purpose
Displays individual statistics in a visually appealing card format.

#### Features
- **Flexible Display**: Supports various stat types
- **Color Themes**: Purple, blue, green, yellow, pink
- **Visual Elements**:
  - Large number display
  - Title label
  - Optional subtitle
  - Icon with gradient background
- **Hover Effects**: Scale and shadow animations

#### Props
- `title`: Stat label (e.g., "Games Played")
- `value`: Stat value (number or string)
- `subtitle`: Optional additional info
- `icon`: Lucide icon component
- `color`: Color theme

---

## Security & Access Control

### Authentication Requirements

- **Protected Routes**: Dashboard, puzzles, and puzzle solving require authentication
- **Token Storage**: JWT tokens stored in localStorage
- **Auto-Redirect**: Unauthenticated users redirected to `/login`
- **Token Refresh**: Automatic token validation on page load

### Frontend Protection

- **Route Guards**: 
  - Checks `isAuthenticated` from auth store
  - Loads user from localStorage on mount
- **Unauthorized Access**:
  - Redirects to `/login` if not authenticated
  - Shows loading spinner during auth check
- **API Calls**: 
  - Automatically includes JWT token in Authorization header
  - Handles 401 errors by clearing tokens and redirecting

### Backend Protection

- **Protected Endpoints**: Require valid JWT token
- **User Validation**: Verifies user exists and is active
- **XP Updates**: Only updates user's own XP
- **Attempt Tracking**: Links attempts to authenticated user

---

## Key Features

### 1. Gamification System

- **XP Rewards**: Earn points for solving puzzles
- **Level Progression**: Level up every 100 XP
- **Visual Progress**: Progress bars and badges
- **Achievement Tracking**: Statistics show accomplishments
- **Motivation**: Clear goals and milestones

### 2. Adaptive Difficulty

- **Difficulty Filters**: Students choose appropriate level
- **Rating System**: Puzzles have ratings for matching
- **Success Rate Display**: Shows puzzle difficulty through solve rates
- **Progressive Challenge**: Students can advance through difficulties

### 3. Learning Support

- **Hint System**: Provides assistance without giving full answer
- **Reset Function**: Allows multiple attempts
- **Immediate Feedback**: Real-time validation of moves
- **Error Learning**: Students learn from incorrect attempts

### 4. Progress Tracking

- **Comprehensive Statistics**: Games, puzzles, accuracy, win rate
- **Visual Dashboards**: Easy-to-understand progress displays
- **Historical Data**: Track improvement over time
- **Goal Setting**: Clear milestones (levels, XP thresholds)

### 5. Social Engagement

- **Leaderboards**: Compare with peers (via leaderboard page)
- **Rankings**: See relative position
- **Competition**: Motivates through comparison
- **Community**: Builds sense of belonging

### 6. User Experience

- **Kid-Friendly Design**: Bright colors, large buttons, playful animations
- **Intuitive Navigation**: Clear paths to all features
- **Responsive Design**: Works on various screen sizes
- **Fast Feedback**: Immediate responses to actions

---

## File Structure

### Frontend Files

```
frontend/
├── app/
│   ├── dashboard/
│   │   └── page.tsx                    # Main dashboard
│   ├── puzzles/
│   │   ├── page.tsx                    # Puzzles list
│   │   └── [id]/
│   │       └── page.tsx                # Puzzle solving
│   └── leaderboard/
│       └── page.tsx                    # Leaderboard (referenced)
├── components/
│   ├── XPBar.tsx                       # XP progress bar
│   ├── StatsCard.tsx                   # Statistics card
│   └── Navbar.tsx                      # Navigation bar
├── lib/
│   ├── api.ts                          # API client
│   ├── store.ts                         # Zustand auth store
│   └── utils.ts                        # Utility functions
└── styles/
    └── globals.css                     # Global styles
```

### Backend Files

```
backend/
├── main.py                             # Main API (puzzle endpoints)
├── models.py                           # Database models
├── auth.py                             # Authentication
└── database.py                         # Database connection
```

---

## Usage Workflow

### Daily Practice Session

1. Student logs in
2. Views dashboard with current stats
3. Clicks "Solve Puzzles" button
4. Filters puzzles by difficulty
5. Selects a puzzle card
6. Solves puzzle on interactive board
7. Receives feedback and XP reward
8. Views updated statistics
9. Continues with next puzzle or reviews progress

### Improving Skills

1. Student reviews accuracy statistic on dashboard
2. Identifies difficulty level with low accuracy
3. Focuses on puzzles at that difficulty
4. Uses hints when stuck to learn
5. Tracks improvement over time
6. Gradually moves to harder puzzles
7. Monitors accuracy improvement

### Leveling Up

1. Student views XP progress bar
2. Calculates XP needed for next level
3. Selects appropriate puzzles to solve
4. Solves puzzles efficiently (minimal hints)
5. Earns XP and levels up
6. Views new level badge
7. Sets goal for next level

---

## Technical Details

### State Management

- **Authentication**: Uses `useAuthStore` from Zustand
- **User Data**: Stored in localStorage and Zustand store
- **Component State**: Local React state for UI interactions
- **API State**: Fetched data stored in component state

### XP Calculation Logic

```javascript
// Base XP from puzzle
let xpEarned = puzzle.xp_reward;

// Reduce for hints (2 XP per hint)
xpEarned = Math.max(5, xpEarned - (hintsUsed * 2));

// Update user XP
user.total_xp += xpEarned;
```

### Stars Conversion and Shop Logic

```javascript
// Convert XP to stars
// 1 star = 250 XP
if (user.total_xp >= starsToConvert * 250) {
  user.total_xp -= starsToConvert * 250;
  user.star_balance += starsToConvert;
}

// Shop purchase
if (user.star_balance >= item.stars_cost) {
  user.star_balance -= item.stars_cost;
  // purchase row recorded in backend
}
```

### Puzzle Validation

- **Move Format**: UCI format (e.g., "e2e4")
- **Solution Comparison**: Compares student moves to puzzle solution
- **Validation**: Real-time validation prevents illegal moves
- **Completion**: Detects when solution is complete

### Error Handling

- **API Errors**: Displayed as toast notifications
- **Network Errors**: Generic error messages with retry options
- **Validation Errors**: Inline feedback on chessboard
- **Authentication Errors**: Automatic redirect to login

---

## Future Scope

Planned high-impact improvements for the student dashboard:

1. **Unified Progress Panel**: Show rating, level, stars, and XP in one consolidated progress widget.
2. **Star Shop Expansion**: Add richer reward catalog, item history, and delivery-status tracking.
3. **Smart XP Guidance**: Suggest when to spend XP on hints vs convert to stars.
4. **Personalized Bot Ladder**: Recommend next bot opponent based on rating trend and puzzle performance.
5. **Daily/Weekly Missions**: Structured goals that reward both XP and stars.
6. **Streak + Consistency Rewards**: Bonus incentives for regular practice and completion streaks.
7. **Learning Path Engine**: Auto-curated puzzle sequences by weakness/theme.
8. **Progress Insights**: Student-friendly charts for rating movement and accuracy trends.
9. **Parent/Coach Feedback Loop**: Surface actionable milestones to parents/coaches from student behavior.
10. **Achievement System v2**: Tiered badges mapped to tactics, consistency, and competitive progress.

---

## Conclusion

The Student Dashboard provides a comprehensive, gamified chess learning experience that motivates students through visible progress, rewards, and competition. With intuitive interfaces, adaptive difficulty, and learning support features, students can effectively practice tactics while staying engaged and motivated.

The system emphasizes user experience, clear feedback, and progressive learning to ensure students not only improve their chess skills but also enjoy the learning process.
