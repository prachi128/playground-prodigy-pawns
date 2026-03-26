# Coach Dashboard Documentation

## Overview

The Coach Dashboard is a comprehensive coaching operations system designed for coaches and administrators. It provides tools to create, manage, validate, and track chess puzzles using Stockfish integration, and is expanding toward richer student progress tracking (rating, level, stars, XP), assignment workflows, and bot calibration operations.

---

## Functional Overview & Business Value

### Purpose & Goals

The Coach Dashboard empowers chess coaches and administrators to:

1. **Build a Quality Puzzle Library**: Create and curate chess puzzles that challenge students at appropriate skill levels
2. **Ensure Puzzle Accuracy**: Validate puzzle solutions using Stockfish to guarantee correctness
3. **Track Student Engagement**: Monitor how students interact with puzzles through statistics and success rates
4. **Optimize Learning Experience**: Adjust puzzle difficulty and availability based on student performance data
5. **Save Time**: Automate puzzle creation tasks that would otherwise require manual chess analysis

### Key Problems Solved

#### Problem 1: Manual Puzzle Creation is Time-Consuming
- **Challenge**: Creating puzzles manually requires deep chess knowledge and time-consuming analysis
- **Solution**: Stockfish integration automatically analyzes positions, finds solutions, and suggests difficulty levels
- **Benefit**: Coaches can create puzzles in minutes instead of hours

#### Problem 2: Ensuring Puzzle Correctness
- **Challenge**: Manually created puzzles may have errors or suboptimal solutions
- **Solution**: Real-time validation with Stockfish confirms puzzle solutions are correct
- **Benefit**: Students always receive accurate, high-quality puzzles

#### Problem 3: Difficulty Assessment is Subjective
- **Challenge**: Determining appropriate difficulty levels requires expert judgment
- **Solution**: Automated difficulty detection based on position complexity and evaluation
- **Benefit**: Consistent difficulty ratings across all puzzles

#### Problem 4: Lack of Student Performance Insights
- **Challenge**: Coaches need visibility into how students are performing beyond puzzle outcomes
- **Solution**: Puzzle statistics + student progression metrics (XP now; rating/level/stars targeted for coach-wide visibility)
- **Benefit**: Data-driven decisions for both curriculum and student growth planning

#### Problem 5: Managing Large Puzzle Collections
- **Challenge**: Organizing and maintaining hundreds of puzzles becomes unwieldy
- **Solution**: Centralized management interface with filtering, search, and bulk operations
- **Benefit**: Easy organization and maintenance of puzzle library

### Core Functionalities

#### 1. Puzzle Creation
**What it does**: Allows coaches to create new chess puzzles from FEN positions
**Business Value**: 
- Rapidly expand puzzle library
- Create custom puzzles for specific learning objectives
- Generate puzzles from interesting game positions

**User Goals**:
- Create puzzles that match curriculum needs
- Build puzzles around specific tactical themes
- Generate puzzles at appropriate difficulty levels

**Outcomes**:
- Coaches can create puzzles in under 2 minutes
- All puzzles are automatically validated for correctness
- Puzzles are immediately available to students (if activated)

#### 2. Puzzle Management
**What it does**: Provides tools to view, filter, and organize all puzzles in the system
**Business Value**:
- Maintain organized puzzle library
- Quickly identify puzzles that need attention
- Control which puzzles students can access

**User Goals**:
- Find specific puzzles quickly
- Review puzzle performance metrics
- Organize puzzles by status (active/inactive)

**Outcomes**:
- Coaches can manage hundreds of puzzles efficiently
- Clear visibility into puzzle usage and success rates
- Easy activation/deactivation of puzzles

#### 3. Puzzle Validation & Revalidation
**What it does**: Verifies puzzle solutions are correct using Stockfish analysis
**Business Value**:
- Ensures puzzle quality and accuracy
- Identifies puzzles that may need updates
- Maintains trust in puzzle library

**User Goals**:
- Verify existing puzzles are still correct
- Identify puzzles with incorrect solutions
- Get suggestions for puzzle improvements

**Outcomes**:
- All puzzles maintain high quality standards
- Incorrect puzzles are quickly identified
- Coaches receive actionable feedback for improvements

#### 4. Performance Analytics
**What it does**: Tracks and displays student engagement and success metrics
**Business Value**:
- Understand student learning patterns
- Identify which puzzles are too easy or too hard
- Make data-driven curriculum decisions

**User Goals**:
- See overall student engagement levels
- Identify puzzles with low success rates
- Understand difficulty distribution

**Outcomes**:
- Coaches can optimize puzzle selection
- Data supports curriculum adjustments
- Better student learning outcomes

#### 5. Student Progress Metrics (Platform Direction)
**What it does**: Aligns coaching analytics with platform progression systems.

**Current state**:
- XP is visible and used in puzzle reward/hint flows.
- Rating and level are available in platform data, where:
  - level is driven by rating bands,
  - XP is separate from level progression.
- Stars are now part of the rewards economy (1 star = 200 XP), but coach-facing visibility is still limited.

**Target coaching value**:
- Coaches should review all progression signals together to guide student plans:
  - rating trend,
  - level progression,
  - star economy behavior,
  - XP accumulation/spend patterns.

#### 6. Automated Puzzle Generation
**What it does**: Automatically generates puzzle solutions, difficulty, theme, and XP rewards
**Business Value**:
- Reduces manual work significantly
- Ensures consistency across puzzles
- Speeds up puzzle creation workflow

**User Goals**:
- Create puzzles without deep chess analysis
- Get consistent difficulty ratings
- Automatically assign appropriate XP rewards

**Outcomes**:
- Faster puzzle creation process
- Consistent puzzle quality
- Reduced chance of errors

### Use Cases & Scenarios

#### Use Case 1: Creating a New Puzzle Collection
**Scenario**: A coach wants to create 20 puzzles focused on knight forks for intermediate students

**Steps**:
1. Coach finds interesting positions with knight fork opportunities
2. Uses puzzle creation interface to input FEN positions
3. Stockfish automatically analyzes and validates each position
4. System suggests "INTERMEDIATE" difficulty and detects "FORK" theme
5. Coach reviews and creates puzzles
6. Puzzles are automatically activated and available to students

**Time Saved**: ~40 minutes (would take ~1 hour manually, now takes ~20 minutes)

#### Use Case 2: Reviewing Puzzle Performance
**Scenario**: A coach notices students are struggling with certain puzzles

**Steps**:
1. Coach navigates to Manage Puzzles page
2. Reviews success rate column in puzzle table
3. Identifies puzzles with success rates below 30%
4. Clicks revalidate button to check if solutions are still correct
5. If valid, coach may adjust difficulty or add hints
6. If invalid, coach updates puzzle with correct solution

**Outcome**: Improved student experience and learning outcomes

#### Use Case 3: Maintaining Puzzle Quality
**Scenario**: A coach wants to ensure all active puzzles are still correct after a system update

**Steps**:
1. Coach filters to show only active puzzles
2. Uses bulk revalidation (or individual revalidation)
3. Reviews validation results
4. Updates any puzzles flagged as incorrect
5. Deactivates puzzles that can't be fixed

**Outcome**: High-quality puzzle library maintained with minimal effort

#### Use Case 4: Curriculum Planning
**Scenario**: A coach needs to plan puzzle assignments for next month

**Steps**:
1. Coach reviews difficulty distribution statistics
2. Identifies gaps in puzzle library (e.g., not enough beginner puzzles)
3. Creates new puzzles to fill gaps
4. Reviews success rates to ensure appropriate difficulty
5. Activates puzzles for upcoming curriculum

**Outcome**: Well-balanced puzzle library that supports curriculum goals

### Benefits Summary

**For Coaches**:
- ⏱️ **Time Savings**: Create puzzles 3x faster with automation
- ✅ **Quality Assurance**: All puzzles validated for correctness
- 📊 **Data-Driven Decisions**: Performance metrics guide puzzle selection
- 🎯 **Consistency**: Automated difficulty and theme detection
- 🔄 **Easy Maintenance**: Simple tools to update and manage puzzles

**For Students**:
- 🎓 **Quality Learning**: Access to validated, high-quality puzzles
- 📈 **Appropriate Challenge**: Puzzles matched to skill level
- 🎮 **Engaging Experience**: Well-organized puzzle library
- 🏆 **Fair Rewards**: Consistent XP rewards based on difficulty

**For Administrators**:
- 📊 **Visibility**: Clear view of platform usage and engagement
- 🔒 **Control**: Manage puzzle availability and quality
- 📈 **Scalability**: Easy to expand puzzle library
- 💰 **Efficiency**: Reduced manual work and maintenance costs

---

## Main Dashboard (`/coach/page.tsx`)

The main dashboard serves as the central hub for coaches, providing an overview of puzzle statistics and quick access to key features.

### Functional Purpose

The main dashboard gives coaches a **quick overview** of their puzzle library's health and student engagement. It answers key questions:
- How many puzzles do I have available?
- Are students actively using the puzzles?
- What's the overall success rate?
- How are puzzles distributed across difficulty levels?

This "at-a-glance" view helps coaches make quick decisions about whether to create more puzzles, adjust difficulty levels, or investigate specific puzzle performance.

### Quick Actions Section

Two prominent action cards provide immediate access to core functionality:

1. **Create New Puzzle**
   - **Route**: `/coach/puzzles/create`
   - **Description**: Opens the puzzle creation interface
   - **Features**: Uses Stockfish to validate and auto-generate puzzle solutions
   - **Visual**: Gradient purple-to-primary button with Plus icon

2. **Manage Puzzles**
   - **Route**: `/coach/puzzles`
   - **Description**: Opens the puzzle management interface
   - **Features**: Edit, delete, or revalidate existing puzzles
   - **Visual**: White card with Target icon

### Statistics Cards

Four key metric cards display important puzzle statistics. These metrics help coaches understand:
- **Library size**: How extensive is the puzzle collection?
- **Student engagement**: Are students actively solving puzzles?
- **Learning effectiveness**: Are puzzles appropriately challenging?
- **Availability**: How many puzzles are currently accessible?

Each card provides actionable insights that inform puzzle creation and management decisions.

#### 1. Total Puzzles Card
- **Icon**: Target (purple theme)
- **Main Metric**: Total number of puzzles in the system
- **Sub-metrics**: 
  - Active puzzles count
  - Inactive puzzles count
- **Color Scheme**: Purple border and text

#### 2. Total Attempts Card
- **Icon**: Users (blue theme)
- **Main Metric**: Total number of student attempts across all puzzles
- **Sub-metrics**: 
  - Total successful attempts
- **Color Scheme**: Blue border and text

#### 3. Success Rate Card
- **Icon**: TrendingUp (green theme)
- **Main Metric**: Overall success rate percentage
- **Calculation**: `(total_success / total_attempts) * 100`
- **Sub-metrics**: Overall performance indicator
- **Color Scheme**: Green border and text

#### 4. Active Puzzles Card
- **Icon**: Trophy (yellow theme)
- **Main Metric**: Number of currently active puzzles
- **Sub-metrics**: Puzzles available to students
- **Color Scheme**: Yellow border and text

### Difficulty Distribution Section

A dedicated section displays the distribution of puzzles across difficulty levels:

- **Layout**: Grid display (2 columns on mobile, 4 columns on desktop)
- **Display Format**: 
  - Large number showing count
  - Difficulty level label (capitalized)
- **Difficulty Levels**: Beginner, Intermediate, Advanced, Expert
- **Visual**: White card with gray border, individual difficulty boxes with gray background

### Authentication & Access Control

- **Required Role**: `coach` or `admin`
- **Unauthorized Access**: Redirects to `/login` or `/dashboard` with error toast
- **Loading States**: Shows spinner with "Loading dashboard..." message
- **Background**: Gradient from primary-50 via purple-50 to blue-50

---

## Puzzle Management Page (`/coach/puzzles/page.tsx`)

A comprehensive table-based interface for managing all puzzles in the system.

### Functional Purpose

The puzzle management page is the **operational center** for maintaining the puzzle library. It enables coaches to:
- **Find specific puzzles** quickly using filters
- **Assess puzzle performance** through success rate metrics
- **Maintain puzzle quality** through revalidation
- **Control student access** by activating/deactivating puzzles
- **Identify issues** such as puzzles with incorrect solutions or poor performance

This page transforms puzzle management from a tedious task into an efficient workflow, allowing coaches to maintain hundreds of puzzles with minimal effort.

### Header Section

- **Title**: "📝 Manage Puzzles"
- **Description**: "Edit, delete, or revalidate puzzles"
- **Action Button**: "Create New" button linking to `/coach/puzzles/create`
  - Gradient purple-to-primary styling
  - Plus icon

### Filter System

Three filter buttons allow coaches to view different subsets of puzzles. This filtering capability addresses common workflow needs:

- **"All Puzzles"**: Complete overview for inventory management
- **"Active"**: Focus on puzzles currently available to students (default view)
- **"Inactive"**: Review deactivated puzzles that may need updates or reactivation

Filters help coaches quickly focus on the puzzles that matter for their current task, whether that's reviewing active content, auditing the full library, or identifying puzzles to reactivate.

1. **All Puzzles** - Shows all puzzles regardless of status
2. **Active** - Shows only active puzzles (default filter)
3. **Inactive** - Shows only inactive puzzles

**Visual States**:
- **Active Filter**: Purple background (`#9333ea`), white text, purple border
- **Inactive Filter**: White background, gray text, gray border

### Puzzles Table

A comprehensive table displaying puzzle information with the following columns:

#### Table Columns

1. **ID**
   - Format: `#{puzzle.id}`
   - Bold gray text

2. **Title**
   - Clickable link to puzzle detail page (`/coach/puzzles/{id}`)
   - Displays puzzle title (bold primary color)
   - Shows truncated description below title
   - Hover effect: Primary background color
   - Max width: 384px (truncated)

3. **Difficulty**
   - Color-coded badge with border
   - Capitalized text
   - Uses `getDifficultyColor()` utility function
   - Styling: Rounded pill with border-2

4. **Theme**
   - Capitalized theme name
   - Shows "—" if no theme assigned

5. **XP**
   - Format: `{xp_reward} XP`
   - Bold yellow text

6. **Success**
   - Format: `{success_count}/{attempts_count}`
   - Shows percentage in parentheses if attempts > 0
   - Calculation: `(success_count / attempts_count) * 100`

7. **Status**
   - **Active**: Green checkmark icon + "Active" text (green)
   - **Inactive**: Red X icon + "Inactive" text (red)
   - Bold font

8. **Actions**
   - Two action buttons per puzzle:
     - **Revalidate Button** (RefreshCw icon)
       - Blue background (bg-blue-100)
       - Hover: bg-blue-200
       - Tooltip: "Revalidate with Stockfish"
       - Calls `handleRevalidate(puzzle.id)`
     - **Delete Button** (Trash2 icon)
       - Red background (bg-red-100)
       - Hover: bg-red-200
       - Tooltip: "Deactivate puzzle"
       - Disabled if puzzle is inactive
       - Opens confirmation dialog

### Table Styling

- **Header**: Gradient purple-to-primary background with white text
- **Rows**: Alternating white and gray-50 backgrounds
- **Hover Effect**: Gray background on row hover
- **Borders**: 2px gray-100 borders between rows
- **Empty State**: Centered "No puzzles found" message

### Revalidation Feature

**Functional Purpose**: Ensures puzzle solutions remain correct over time. This is critical because:
- Chess theory evolves, and better moves may be discovered
- System updates might affect puzzle validation
- Coaches need confidence that students are learning correct solutions

**When to Use**:
- After system updates or Stockfish upgrades
- When puzzles show unexpectedly low success rates
- As part of regular quality assurance checks
- Before reactivating inactive puzzles

When a coach clicks the revalidate button:

1. **API Call**: `coachAPI.revalidatePuzzle(puzzle.id)`
2. **Success Response**:
   - If valid: Green toast "✓ Puzzle #{id} solution is correct!"
   - If invalid: Red toast with best move suggestion
3. **Error Handling**: Red toast with error message (5 second duration)

### Delete/Deactivate Feature

**Functional Purpose**: Provides controlled puzzle lifecycle management. Rather than permanently deleting puzzles (which would lose historical data), puzzles are deactivated. This allows:

- **Preserve history**: Keep records of all puzzles for analytics
- **Reversible actions**: Reactivate puzzles if needed
- **Student protection**: Immediately remove problematic puzzles from student access
- **Data integrity**: Maintain attempt and success statistics

**When to Deactivate**:
- Puzzle solution is incorrect and can't be easily fixed
- Puzzle is too easy or too hard for target audience
- Puzzle contains inappropriate content
- Replacing with improved version

When a coach clicks the delete button:

1. **Confirmation Dialog**: Opens `ConfirmDialog` component
2. **Dialog Content**:
   - Title: "Deactivate Puzzle"
   - Message: "Are you sure you want to deactivate "{puzzleTitle}"? Students will no longer be able to access this puzzle."
   - Confirm Button: "Deactivate" (danger styling)
   - Cancel Button: "Cancel"
3. **On Confirm**:
   - API Call: `coachAPI.deletePuzzle(puzzle.id)`
   - Success: Green toast "Puzzle deactivated successfully"
   - Refresh: Reloads puzzle list
4. **Soft Delete**: Puzzles are marked as `is_active = False`, not permanently deleted

### Statistics Summary

Three summary cards at the bottom of the page:

1. **Total Puzzles**: Shows total count (primary color)
2. **Active Puzzles**: Shows active count (green color)
3. **Inactive Puzzles**: Shows inactive count (red color)

Each card displays:
- Small gray label text
- Large bold number
- White background with gray border

---

## Puzzle Creation Page (`/coach/puzzles/create/page.tsx`)

An interactive two-column interface for creating new puzzles with real-time Stockfish analysis.

### Functional Purpose

The puzzle creation page transforms puzzle creation from a **complex, time-consuming task** into a **simple, guided process**. It enables coaches to:

- **Create puzzles from any position**: Paste a FEN or use the interactive board
- **Get instant validation**: Know immediately if a position is valid and solvable
- **Receive expert analysis**: Stockfish provides best moves, difficulty, and theme suggestions
- **Preview before creating**: See the position on an interactive board
- **Test positions**: Try different moves to understand the puzzle better

The page eliminates the need for coaches to manually analyze positions, calculate difficulty, or verify solutions - all handled automatically by Stockfish integration.

### Layout Structure

**Left Column**: Form inputs and analysis results
**Right Column**: Interactive chessboard preview

### Left Column - Form Section

#### Puzzle Details Card

White card with gray border containing form fields:

1. **Title Field** (Required)
   - Label: "Title *"
   - Placeholder: "e.g., Knight Fork Tactic"
   - Input type: Text
   - Styling: Full width, gray border, primary focus border

2. **Description Field** (Optional)
   - Label: "Description"
   - Placeholder: "Brief description of the puzzle..."
   - Input type: Textarea (3 rows)
   - Styling: Full width, gray border, primary focus border, no resize

3. **FEN Position Field** (Required)
   - Label: "FEN Position *"
   - Placeholder: Standard starting position FEN
   - Input type: Textarea (3 rows)
   - Styling: Monospace font, smaller text size
   - Helper: "Use Sample FEN" button below field
     - Sets sample FEN: `r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4`
     - Sets sample title: "Sample Tactical Position"
     - Sets sample description: "Find the best move in this tactical position"

#### Analyze Button

- **Label**: "Analyze with Stockfish"
- **Icon**: Brain icon
- **Function**: Calls `coachAPI.autoSolve(fen)`
- **Styling**: 
  - Gradient blue background
  - White text, bold font
  - Disabled when analyzing or FEN is empty
  - Loading state: Spinner + "Analyzing..." text
- **On Success**: 
  - Sets analysis state
  - Shows green toast "Position analyzed! ✓"
- **On Error**: Shows red toast with error message

#### Stockfish Analysis Results Card

Displayed after successful analysis (gradient purple-to-blue background):

1. **Best Move Section**
   - Label: "Best Move"
   - Display: Large monospace font, primary color, bold
   - Shows: `analysis.best_move`

2. **Suggested Difficulty Section**
   - Label: "Suggested Difficulty"
   - Display: Purple badge with border
   - Shows: Capitalized difficulty level

3. **Evaluation Section**
   - Label: "Evaluation"
   - **If Mate**: Shows "Mate in {number}" (green, bold)
   - **If Centipawns**: Shows evaluation in pawns (e.g., "+1.50")
   - **If Equal**: Shows "Equal"

4. **Top 3 Moves Section**
   - Label: "Top 3 Moves"
   - Display: List of moves with evaluations
   - Format: `{Move} - {Centipawn/100}`
   - Shows top 3 moves from Stockfish analysis

#### Create Puzzle Button

- **Label**: "Create Puzzle"
- **Icon**: Zap icon
- **Function**: Calls `coachAPI.createPuzzle()`
- **Styling**: 
  - Gradient primary-to-purple background
  - White text, bold font, large padding
  - Disabled when creating, title empty, or FEN empty
  - Loading state: Spinner + "Creating Puzzle..." text
- **On Success**: 
  - Green toast with puzzle ID
  - Redirects to `/coach/puzzles`
- **On Error**: Shows red toast with error message

### Right Column - Chessboard Preview

#### Board Preview Card

Sticky positioning (stays visible while scrolling):

1. **Title**: "📋 Board Preview"

2. **Chessboard Component**
   - Uses `react-chessboard` library
   - **If Valid FEN**:
     - Displays interactive board
     - Custom styling: Purple dark squares, light purple light squares
     - Rounded corners (12px)
     - Box shadow
     - Max width: 400px, centered
     - **Interactive**: Allows piece dragging (calls `onDrop` function)
   - **If Invalid/Missing FEN**:
     - Gray placeholder box
     - Message: "Invalid FEN position" or "Enter a FEN position"
     - Instructions below message

3. **Validation Status Box** (shown after analysis)
   - Green gradient background
   - Message: "✓ Position Validated"
   - Details: "Stockfish confirmed this is a valid puzzle with solution: {best_move}"
   - Monospace font for move notation

#### Interactive Board Features

- **Piece Movement**: Coaches can drag pieces to test positions
- **Move Validation**: Checks if moves are legal
- **FEN Update**: Automatically updates FEN field when pieces are moved
- **Best Move Feedback**: Shows success toast if move matches Stockfish's best move

### Navigation

- **Back Link**: "← Back to Coach Dashboard" at top
- **Route**: Links to `/coach`
- **Styling**: Primary color, hover effect, small font

---

## Backend API Endpoints (`coach_endpoints.py`)

All endpoints are prefixed with `/api/coach` and require coach/admin authentication.

### Authentication Middleware

**Function**: `require_coach(user_id, db)`
- **Dependency**: Uses `get_current_user` and `get_db`
- **Check**: Verifies user role is `coach` or `admin`
- **Error**: Returns 403 Forbidden if unauthorized

### Endpoints

#### 1. Create Puzzle
- **Method**: `POST`
- **Route**: `/api/coach/puzzles`
- **Request Body**: `CoachPuzzleCreate`
  ```python
  {
    "title": str,
    "description": Optional[str],
    "fen": str,
    "difficulty": Optional[str],  # Auto-generated if not provided
    "theme": Optional[str],       # Auto-detected if not provided
    "xp_reward": Optional[int]    # Auto-calculated if not provided
  }
  ```
- **Process**:
  1. Analyzes FEN position with Stockfish (depth=20)
  2. Validates FEN is legal
  3. Extracts best move as solution
  4. Auto-generates difficulty if not provided
  5. Auto-detects theme if not provided
  6. Calculates XP reward based on difficulty:
     - BEGINNER: 10 XP
     - INTERMEDIATE: 25 XP
     - ADVANCED: 40 XP
     - EXPERT: 50 XP
  7. Calculates rating based on difficulty:
     - BEGINNER: 400
     - INTERMEDIATE: 700
     - ADVANCED: 1000
     - EXPERT: 1200
  8. Creates puzzle with `is_active=True`
- **Response**: `PuzzleWithAnalysis` model
- **Errors**: 
  - 400: Invalid FEN position
  - 403: Unauthorized

#### 2. Get All Puzzles
- **Method**: `GET`
- **Route**: `/api/coach/puzzles`
- **Query Parameters**:
  - `skip`: int (default: 0) - Pagination offset
  - `limit`: int (default: 50) - Results per page
  - `include_inactive`: bool (default: True) - Include inactive puzzles
- **Response**: List of `PuzzleWithAnalysis` models
- **Access**: Coach/admin only

#### 3. Get Single Puzzle
- **Method**: `GET`
- **Route**: `/api/coach/puzzles/{puzzle_id}`
- **Response**: `PuzzleWithAnalysis` model
- **Errors**: 
  - 404: Puzzle not found
  - 403: Unauthorized

#### 4. Update Puzzle
- **Method**: `PUT`
- **Route**: `/api/coach/puzzles/{puzzle_id}`
- **Request Body**: `CoachPuzzleUpdate` (all fields optional)
  ```python
  {
    "title": Optional[str],
    "description": Optional[str],
    "fen": Optional[str],
    "moves": Optional[str],
    "difficulty": Optional[str],
    "theme": Optional[str],
    "xp_reward": Optional[int],
    "is_active": Optional[bool]
  }
  ```
- **Process**:
  - If FEN is changed: Re-validates with Stockfish
  - Updates provided fields
  - If difficulty not provided and FEN changed: Re-calculates difficulty
- **Response**: Updated `PuzzleWithAnalysis` model
- **Errors**: 
  - 404: Puzzle not found
  - 400: Invalid FEN (if FEN changed)
  - 403: Unauthorized

#### 5. Delete Puzzle (Deactivate)
- **Method**: `DELETE`
- **Route**: `/api/coach/puzzles/{puzzle_id}`
- **Process**: 
  - Soft delete: Sets `is_active = False`
  - Does not permanently delete from database
- **Response**: 
  ```json
  {
    "message": "Puzzle deactivated successfully",
    "puzzle_id": int
  }
  ```
- **Errors**: 
  - 404: Puzzle not found
  - 403: Unauthorized

#### 6. Revalidate Puzzle
- **Method**: `POST`
- **Route**: `/api/coach/puzzles/{puzzle_id}/revalidate`
- **Process**:
  1. Parses puzzle solution moves (handles single move or space-separated)
  2. Validates puzzle with Stockfish
  3. Gets updated difficulty suggestion
  4. Detects tactic theme
  5. Compares current solution with Stockfish's best move
- **Response**:
  ```json
  {
    "puzzle_id": int,
    "current_solution": str,
    "is_valid": bool,
    "best_move": str,
    "suggested_difficulty": str,
    "detected_theme": str,
    "message": str,
    "recommendation": str
  }
  ```
- **Error Response** (if validation fails):
  ```json
  {
    "puzzle_id": int,
    "error": str,
    "is_valid": false
  }
  ```
- **Errors**: 
  - 404: Puzzle not found
  - 403: Unauthorized

#### 7. Get Coach Statistics
- **Method**: `GET`
- **Route**: `/api/coach/stats`
- **Response**:
  ```json
  {
    "total_puzzles": int,
    "active_puzzles": int,
    "inactive_puzzles": int,
    "difficulty_distribution": {
      "BEGINNER": int,
      "INTERMEDIATE": int,
      "ADVANCED": int,
      "EXPERT": int
    },
    "total_attempts": int,
    "total_success": int,
    "overall_success_rate": float
  }
  ```
- **Calculations**:
  - `inactive_puzzles` = `total_puzzles` - `active_puzzles`
  - `overall_success_rate` = `(total_success / total_attempts) * 100` (0 if no attempts)
- **Access**: Coach/admin only

### Response Models

#### PuzzleWithAnalysis
```python
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
  "created_at": datetime,
  "is_active": bool
}
```

---

## Security & Access Control

### Authentication Requirements

- **All Routes**: Require valid JWT token
- **Role Check**: User must have `coach` or `admin` role
- **Middleware**: `require_coach()` dependency on all endpoints

### Frontend Protection

- **Route Guards**: 
  - Checks `isAuthenticated` from auth store
  - Checks `user.role` is `coach` or `admin`
- **Unauthorized Access**:
  - Shows error toast: "Access denied. Coach privileges required."
  - Redirects to `/login` (if not authenticated) or `/dashboard` (if wrong role)
- **Loading States**: Shows spinner while checking authentication

### Backend Protection

- **Dependency Injection**: `require_coach()` on all endpoints
- **Database Check**: Verifies user exists and has correct role
- **HTTP Status**: Returns 403 Forbidden for unauthorized access

---

## Key Features

### 1. Stockfish Integration

- **Position Analysis**: Validates FEN positions for legality
- **Solution Generation**: Automatically finds best move
- **Difficulty Detection**: Suggests appropriate difficulty level
- **Theme Detection**: Identifies tactical themes (fork, pin, etc.)
- **Revalidation**: Allows checking existing puzzles for correctness
- **Depth**: Uses depth=20 for accurate analysis

### 2. Auto-Generation Features

When creating puzzles, the system can automatically generate:

- **Solution**: Best move from Stockfish analysis
- **Difficulty**: Based on position complexity and evaluation
- **Theme**: Detected from tactical patterns
- **XP Reward**: Calculated from difficulty level
- **Rating**: Assigned based on difficulty

### 3. Real-Time Validation

- **FEN Validation**: Checks position legality in real-time
- **Board Preview**: Updates as FEN changes
- **Move Testing**: Coaches can test moves on interactive board
- **Best Move Feedback**: Confirms when test move matches Stockfish analysis

### 4. Visual Feedback

- **Color-Coded Difficulty**: Different colors for each difficulty level
- **Status Indicators**: Green for active, red for inactive
- **Success Rates**: Visual percentage displays
- **Loading States**: Spinners and disabled states during operations
- **Toast Notifications**: Success/error messages for all actions

### 5. Interactive Chessboard

- **Drag & Drop**: Move pieces to test positions
- **FEN Sync**: Automatically updates FEN field when pieces moved
- **Move Validation**: Prevents illegal moves
- **Visual Feedback**: Confirms when test move matches best move

### 6. Comprehensive Statistics

- **Dashboard Overview**: Key metrics at a glance
- **Puzzle Metrics**: Total, active, inactive counts
- **Performance Metrics**: Attempts, success rate
- **Distribution Analysis**: Difficulty breakdown
- **Real-Time Updates**: Statistics refresh after changes

---

## File Structure

### Frontend Files

```
frontend/
├── app/
│   ├── coach/
│   │   ├── page.tsx                    # Main dashboard
│   │   └── puzzles/
│   │       ├── page.tsx                # Manage puzzles
│   │       └── create/
│   │           └── page.tsx            # Create puzzle
├── lib/
│   ├── api.ts                          # API client (coachAPI)
│   └── utils.ts                        # Utility functions (getDifficultyColor)
└── components/
    └── ConfirmDialog.tsx               # Delete confirmation dialog
```

### Backend Files

```
backend/
├── coach_endpoints.py                  # Coach API endpoints
├── stockfish_service.py                # Stockfish integration
├── models.py                           # Database models (Puzzle, User)
├── auth.py                             # Authentication (get_current_user)
└── database.py                         # Database connection (get_db)
```

---

## Functional Workflows & Decision-Making

### How Coaches Use the Dashboard

The dashboard supports several common coaching workflows:

#### Workflow 1: Building a New Curriculum
**Goal**: Create a set of puzzles for a specific learning objective

**Process**:
1. Review difficulty distribution to identify gaps
2. Create puzzles targeting specific themes (e.g., "back rank mate")
3. Use Stockfish to ensure appropriate difficulty levels
4. Activate puzzles when curriculum is ready
5. Monitor success rates to validate difficulty appropriateness

**Success Criteria**: Students can progress through puzzles with ~60-70% success rate

#### Workflow 2: Quality Assurance
**Goal**: Ensure all active puzzles are correct and appropriate

**Process**:
1. Filter to active puzzles
2. Review success rates (flag puzzles <30% or >90%)
3. Revalidate puzzles with unusual metrics
4. Update or deactivate problematic puzzles
5. Document changes for future reference

**Success Criteria**: All active puzzles validated and performing within expected ranges

#### Workflow 3: Responding to Student Feedback
**Goal**: Address student complaints about puzzle difficulty or correctness

**Process**:
1. Identify specific puzzle from student feedback
2. Review puzzle details and success rate
3. Revalidate solution with Stockfish
4. If incorrect: Update solution or deactivate
5. If too hard/easy: Adjust difficulty or add hints
6. Communicate changes to students

**Success Criteria**: Student concerns addressed, puzzle quality improved

#### Workflow 4: Expanding Puzzle Library
**Goal**: Add new puzzles to keep content fresh and engaging

**Process**:
1. Identify interesting positions from games or studies
2. Use creation interface to quickly generate puzzles
3. Review Stockfish analysis for quality
4. Batch create multiple puzzles
5. Activate puzzles in phases to maintain engagement

**Success Criteria**: Library grows sustainably with quality content

### Decision-Making Framework

The dashboard provides data to support key decisions:

#### When to Create More Puzzles
- **Indicator**: Low active puzzle count relative to student base
- **Action**: Create puzzles in underrepresented difficulty levels
- **Metric**: Aim for 10-15 puzzles per difficulty level

#### When to Adjust Difficulty
- **Indicator**: Success rate <30% (too hard) or >90% (too easy)
- **Action**: Revalidate and consider difficulty adjustment
- **Metric**: Target 50-70% success rate for optimal learning

#### When to Deactivate Puzzles
- **Indicator**: Success rate <20% or validation fails
- **Action**: Deactivate and review for updates
- **Metric**: Maintain >95% validation success rate

#### When to Reactivate Puzzles
- **Indicator**: Updated puzzle with correct solution
- **Action**: Reactivate after validation confirms correctness
- **Metric**: All reactivated puzzles must pass validation

---

## Usage Workflow

### Creating a New Puzzle

1. Navigate to Coach Dashboard (`/coach`)
2. Click "Create New Puzzle" button
3. Enter puzzle title (required)
4. Optionally enter description
5. Enter or paste FEN position (required)
6. Click "Analyze with Stockfish" button
7. Review Stockfish analysis results:
   - Best move
   - Suggested difficulty
   - Evaluation
   - Top moves
8. Optionally test moves on interactive board
9. Click "Create Puzzle" button
10. Puzzle is created with auto-generated:
    - Solution (best move)
    - Difficulty (if not provided)
    - Theme (if not provided)
    - XP reward
11. Redirected to puzzle management page

### Managing Puzzles

1. Navigate to Coach Dashboard (`/coach`)
2. Click "Manage Puzzles" button
3. Use filters to view:
   - All puzzles
   - Active puzzles (default)
   - Inactive puzzles
4. View puzzle details in table:
   - ID, title, difficulty, theme, XP, success rate, status
5. Perform actions:
   - **Revalidate**: Click refresh icon to check puzzle solution
   - **Delete**: Click trash icon to deactivate puzzle
   - **View Details**: Click puzzle title to view/edit details
6. Review summary statistics at bottom

### Revalidating a Puzzle

1. Navigate to Manage Puzzles page
2. Find puzzle in table
3. Click revalidate button (refresh icon)
4. Wait for Stockfish analysis
5. Review result:
   - **If Valid**: Green toast confirms solution is correct
   - **If Invalid**: Red toast shows suggested best move
6. If invalid, update puzzle with correct solution

### Deactivating a Puzzle

1. Navigate to Manage Puzzles page
2. Find active puzzle in table
3. Click delete button (trash icon)
4. Confirm deactivation in dialog
5. Puzzle is marked as inactive
6. Students can no longer access puzzle
7. Puzzle remains in database for historical data

---

## Technical Details

### Stockfish Service Integration

The coach dashboard relies heavily on the Stockfish service for:

- **Position Analysis**: `analyze_position(fen, depth=20)`
- **Puzzle Validation**: `validate_puzzle(fen, moves)`
- **Difficulty Suggestion**: `suggest_difficulty(fen)`
- **Theme Detection**: `detect_tactic_theme(fen, moves)`
- **Auto-Solving**: `autoSolve(fen)` (frontend API wrapper)

### API Client Structure

The frontend uses `coachAPI` object with methods:

- `getStats()` - Fetch dashboard statistics
- `getAllPuzzles(includeInactive)` - Get all puzzles
- `createPuzzle(data)` - Create new puzzle
- `revalidatePuzzle(id)` - Revalidate puzzle solution
- `deletePuzzle(id)` - Deactivate puzzle
- `autoSolve(fen)` - Analyze position with Stockfish

### State Management

- **Authentication**: Uses `useAuthStore` from `@/lib/store`
- **Loading States**: Local component state (`isLoading`, `isAnalyzing`, `isCreating`)
- **Data State**: Local state for puzzles, stats, analysis results
- **Dialog State**: Local state for confirmation dialogs

### Error Handling

- **API Errors**: Caught and displayed as toast notifications
- **Validation Errors**: Shown inline or as toasts
- **Network Errors**: Generic error messages with console logging
- **Authentication Errors**: Redirects to login or dashboard

---

## Future Scope

Planned high-impact improvements for the coach panel:

1. **Unified Student Progress Board**  
   Coaches should track rating, levels, stars and XP everything, currently only XP is being tracked.

2. **Rating + Level Cohort Analytics**  
   Batch-wise and class-wise trend charts for rating movement and level transitions.

3. **Stars Economy Visibility**  
   Coach view for XP-to-star conversion activity, shop purchases, and reward behavior.

4. **Assignment Outcome Intelligence**  
   Correlate assignments with puzzle accuracy, rating changes, and completion quality.

5. **Intervention Alerts**  
   Flag students with sudden rating drops, low puzzle accuracy streaks, or stalled progress.

6. **Curriculum Coverage Heatmaps**  
   Show tactical theme coverage across batches and identify under-trained themes.

7. **Bot Progression Coaching**  
   Recommend bot opponents per student based on current rating and recent puzzle/game trends.

8. **Bulk Puzzle Operations**  
   Multi-select revalidate, activate/deactivate, retag, and assignment mapping.

9. **Advanced Search and Filters**  
   Query by theme, difficulty, success rate band, recency, and assignment usage.

10. **Versioned Puzzle Change Log**  
   Track puzzle edits, who changed what, and post-change performance impact.

---

## Conclusion

The Coach Dashboard provides a comprehensive solution for managing chess puzzles in the Prodigy Pawns platform. With integrated Stockfish analysis, automated puzzle generation, and intuitive management tools, coaches can efficiently create and maintain a high-quality puzzle library for their students.

The system emphasizes ease of use, visual feedback, and automated validation to ensure puzzle quality while minimizing manual work for coaches.
