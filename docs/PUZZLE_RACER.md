# Puzzle Racer — Complete Documentation

## Overview

Puzzle Racer is a multiplayer timed puzzle-solving race mode. Students compete to solve as many chess puzzles as they can within a fixed time limit. Each correctly solved puzzle advances their car on a visual race track.

**Route:** `/puzzles/racer`  
**Frontend:** `frontend/app/(student)/puzzles/racer/page.tsx`  
**Backend:** `backend/main.py` (in-memory room endpoints)  
**Schemas:** `backend/schemas.py` (`PuzzleRaceRoomState`, `PuzzleRaceRoomCreate`, `PuzzleRaceCarSelect`, `PuzzleRaceNameSet`)  
**API client:** `frontend/lib/api.ts` (`puzzleRacerRoomsAPI`)

---

## Constants

| Constant | Value | Description |
|---|---|---|
| `RACE_DURATION_SECONDS` | 150 (2 min 30 sec) | Total race time after countdown |
| `COUNTDOWN_SECONDS` | 10 | Pre-race countdown |
| `TRACK_MAX_SCORE` | 15 | Score at which car reaches the finish line visually |
| `PUZZLE_RACER_TOTAL_CARS` | 7 | Number of available car emojis |
| `CAR_EMOJIS` | `['🏎️', '🚗', '🚙', '🚕', '🚌', '🛵', '🚲']` | Car options |

---

## Game Phases

The race progresses through four phases:

### 1. Lobby (`phase: 'lobby'`)
- Room is created or joined
- Players see a non-interactive chessboard, the race track with all participants, and the right-side panel
- Host sees "Start Race" button (disabled until at least 2 players join)
- Guests see "Join Race" button, then "Joined! Waiting for host…"
- Players can customize their racer name and choose their car
- Invite link is displayed and copyable

### 2. Countdown (`phase: 'countdown'`)
- Full-screen blurred overlay with a large countdown number (10 → 1)
- All participant names and cars shown in badges
- Audio beeps play: tick sound for each number, "go" sound at the end
- Text changes: "Focus…" → "Almost…" → "GO!"
- Puzzle pool is loaded and shuffled during this phase

### 3. Racing (`phase: 'racing'`)
- Timer counts down from 2:30
- Interactive chessboard shows the current puzzle
- Board auto-orients so the side to move is at the bottom
- "White to move" / "Black to move" label shown in the Current Puzzle panel
- Race track shows all participants with animated cars
- Current player always appears at the top of the track
- Right panel shows: timer, current puzzle info, skip/exit buttons, racer name, car selector

### 4. Ended (`phase: 'ended'`)
- Triggered when timer reaches zero or all puzzles are exhausted
- Shows final standings sorted by score with medal emojis (🥇🥈🥉)
- Displays total puzzles solved and XP earned
- "Play again" and "Back to Puzzles" buttons

---

## Puzzle Rules

### Correct Move
- Each move is checked **immediately** against the puzzle solution
- If the move matches the expected solution move at that position, it is accepted
- If the puzzle has multiple solution moves and all are played correctly, the puzzle is **solved**
- On solve: **score +1**, car advances on track with nitro boost animation, XP awarded in background, next puzzle loads **instantly**

### Wrong Move
- If any move does not match the expected solution move, the puzzle is **failed**
- A failed attempt is recorded to the backend (fire-and-forget)
- **No score is awarded**
- Next puzzle loads **instantly** — no delay, no retry, no toast

### Skip Puzzle
- Student clicks "⏭️ Skip puzzle" button
- The puzzle ID is added to a skip list so it won't reappear
- A failed attempt is recorded to the backend (fire-and-forget)
- **No score is awarded**
- Next puzzle loads instantly
- Toast: "Skipped! Moving to next puzzle."

### Move Validation Details
- Moves are compared as coordinate strings (e.g. `e2e4`)
- Check (`+`) and promotion (`=`) characters in solution notation are stripped before comparison
- All promotions default to queen (`promotion: 'q'`)
- Illegal moves (rejected by chess.js) are silently ignored — the piece snaps back

### Puzzle Pool
- Loaded once at race start via `GET /api/puzzles?difficulty=beginner&skip=0&limit=20`
- **Hardcoded to beginner difficulty** — no adaptive selection
- Shuffled randomly on each client (Fisher-Yates shuffle)
- Pool wraps around if student solves/fails all puzzles
- Skipped puzzles are permanently excluded within a race
- If all puzzles in the pool are skipped, the race ends early

---

## Multiplayer Room System

### Room State (Backend — In-Memory)

Rooms are stored in `_puzzle_race_rooms: Dict[str, Dict]` (not persisted to DB).

Each room contains:

| Field | Type | Description |
|---|---|---|
| `id` | `str` | Room ID (format: `{userId}-{timestamp}`) |
| `host_user_id` | `int` | User ID of the room creator |
| `status` | `str` | `"waiting"` → `"racing"` → `"finished"` |
| `created_at` | `datetime` | Room creation timestamp |
| `participants` | `Set[int]` | Set of user IDs in the room |
| `countdown_start_at` | `datetime?` | When host clicked start |
| `car_assignments` | `Dict[int, int]` | Maps user ID → car emoji index |
| `racer_names` | `Dict[int, str]` | Maps user ID → custom display name |

### Room Lifecycle

1. **Host navigates to `/puzzles/racer`** (no `?room=` param)
   - `POST /api/puzzle-racer/rooms` creates a new room
   - Host is added as participant with a random car
   - URL updated to `?room={roomId}` for shareability

2. **Guest opens the invite link** (`?room={roomId}`)
   - `GET /api/puzzle-racer/rooms/{roomId}` loads existing room
   - Guest sees "Join Race" button
   - On click: `POST /api/puzzle-racer/rooms/{roomId}/join` adds them as participant with a random available car

3. **Host clicks "Start Race"**
   - `POST /api/puzzle-racer/rooms/{roomId}/start` sets status to `"racing"`
   - Both host and guests detect this via polling and bootstrap the race locally

4. **During race**
   - Room state polled every 1 second by all clients
   - Puzzle solving is fully client-side (no move sync between players)
   - Score is tracked locally per client (no server-side score)

### Polling
- All clients poll `GET /api/puzzle-racer/rooms/{roomId}` every 1 second
- This syncs: participant list, car assignments, racer names, room status
- Polling runs continuously from room join until page unmount

---

## Unique Car System

### How It Works
- 7 car emojis are available: 🏎️ 🚗 🚙 🚕 🚌 🛵 🚲
- Each car can only be owned by one player at a time within a room
- **On room create:** host gets a random car
- **On room join:** new participant gets a random car from the remaining available ones
- **"Choose your car" grid:** only shows cars not taken by other players
- **Car change:** calls `POST /api/puzzle-racer/rooms/{roomId}/select-car` with `{ car_index: N }`
- Backend rejects with `409` if car is already taken
- Car changes are blocked during an active race (`status: "racing"`)
- If all 7 cars are taken (7+ players), fallback to random assignment (duplicates possible)

### Relevant Code
- Backend helper: `_pick_random_available_car(room)` in `main.py`
- Frontend filtering: `Object.entries(carAssignments).some(...)` in the car grid
- Car display: `getParticipantCarEmoji(participant, carAssignments, fallbackIdx)`

---

## Racer Name System

### How It Works
- Each player has an editable "Your racer name" input (max 16 characters)
- Initialized from the user's profile first name
- Synced to the backend via `POST /api/puzzle-racer/rooms/{roomId}/set-name` with `{ name: "..." }`
- **Debounced at 400ms** — waits for the user to stop typing before sending
- Initial name is sent on first load when room ID is available
- Other players see the custom name via room state polling (1s interval)
- Name resolution priority: `racer_names[id]` → profile name → `"Player N"` fallback

### Name Display Locations
- Race track lanes (player label)
- Countdown overlay (participant badges)
- End screen (final standings)

---

## Race Track UI

### Layout
- White container below the chessboard
- Red/white F1-style curb edges at top and bottom
- One lane per participant

### Lane Composition
- **Player name** (left): current player in amber, others in dark gray
- **Track lane** (center): dark tarmac-textured road with:
  - Animated road texture (scrolling stripes during race)
  - Animated dashed center line
  - Checkered finish marker strip on the right edge
  - Car emoji that moves based on score (`score / TRACK_MAX_SCORE * 100%`)
- **Score** (right): numeric score display

### Sorting
- Current player ("you") always appears at the top
- Other players sorted by score (highest first)

### Animations
- Road texture scrolls during racing phase (`puzzleRacerRoadFlow`)
- Center dashes scroll during racing phase (`puzzleRacerCenterDashFlow`)
- **Nitro burst** on correct solve: car scales up with a cyan glow for 750ms (`puzzleRacerNitroBurst`)
- Countdown numbers pulse with `puzzleRacerCountdownPulse`

---

## Backend API Endpoints

### `POST /api/puzzle-racer/rooms`
Create a new puzzle racer room.
- **Auth:** required
- **Body:** `{ difficulty?: string, puzzle_count?: number }` (currently unused by frontend)
- **Returns:** `PuzzleRaceRoomState`

### `GET /api/puzzle-racer/rooms/{room_id}`
Get current room state (used for polling).
- **Auth:** required
- **Returns:** `PuzzleRaceRoomState`

### `POST /api/puzzle-racer/rooms/{room_id}/join`
Join an existing room. Auto-assigns a random available car.
- **Auth:** required
- **Returns:** `PuzzleRaceRoomState`
- **Error:** `404` if room not found, `409` if race is ongoing (only lobby joining allowed)

### `POST /api/puzzle-racer/rooms/{room_id}/leave`
Remove a non-host participant from the room (car, name, score all cleared).
- **Auth:** required
- **Returns:** `{ ok: true }`
- Host calls are no-ops (host cannot leave their own room)

### `POST /api/puzzle-racer/rooms/{room_id}/start`
Start the race. Only the host can call this.
- **Auth:** required
- **Returns:** `PuzzleRaceRoomState`
- **Error:** `403` if not host, `404` if room not found

### `POST /api/puzzle-racer/rooms/{room_id}/select-car`
Change the current user's car.
- **Auth:** required
- **Body:** `{ car_index: number }` (0–6)
- **Returns:** `PuzzleRaceRoomState`
- **Errors:** `400` if racing or invalid index, `403` if not in room, `409` if car taken

### `POST /api/puzzle-racer/rooms/{room_id}/set-name`
Set custom display name.
- **Auth:** required
- **Body:** `{ name: string }` (trimmed to 16 chars)
- **Returns:** `PuzzleRaceRoomState`
- **Errors:** `400` if empty, `403` if not in room

---

## Data Model (Pydantic Schemas)

```python
class PuzzleRaceRoomState(BaseModel):
    id: str
    host_user_id: int
    status: Literal["waiting", "countdown", "racing", "finished"]
    created_at: datetime
    participants: List[int]
    countdown_start_at: Optional[datetime] = None
    car_assignments: dict[int, int] = {}
    racer_names: dict[int, str] = {}

class PuzzleRaceRoomCreate(BaseModel):
    difficulty: Optional[str] = "beginner"
    puzzle_count: Optional[int] = 20

class PuzzleRaceCarSelect(BaseModel):
    car_index: int

class PuzzleRaceNameSet(BaseModel):
    name: str
```

---

## Frontend State

### Key State Variables

| State | Type | Description |
|---|---|---|
| `phase` | `'lobby' \| 'countdown' \| 'racing' \| 'ended'` | Current game phase |
| `puzzlePool` | `Puzzle[]` | Shuffled array of puzzles for this race |
| `poolIndex` | `number` | Current position in the puzzle pool |
| `countdown` | `number` | Countdown seconds remaining |
| `timeLeft` | `number` | Race seconds remaining |
| `puzzlesSolved` | `number` | Total correct solves in this race |
| `totalXP` | `number` | Total XP earned in this race |
| `currentPuzzle` | `Puzzle \| null` | Active puzzle being displayed |
| `game` | `Chess \| null` | chess.js instance for the current puzzle |
| `movesMade` | `string[]` | Moves played on the current puzzle |
| `participants` | `RacerParticipant[]` | All players with names, scores, car info |
| `roomState` | `PuzzleRaceRoomState \| null` | Latest room state from backend |
| `isHost` | `boolean` | Whether current user created the room |
| `hasJoinedRoom` | `boolean` | Whether current user is a participant |
| `raceOngoing` | `boolean` | True when non-participant visits a racing room (shows waiting screen) |
| `selectedCarIndex` | `number` (derived) | Current user's car index from `car_assignments` |
| `racerDisplayName` | `string` | Editable racer name |
| `isNitroBoostActive` | `boolean` | Whether nitro animation is playing |

### Refs
| Ref | Purpose |
|---|---|
| `timerRef` | Race countdown interval |
| `countdownRef` | Pre-race countdown interval |
| `startTimeRef` | Timestamp when current puzzle started (for time tracking) |
| `roomInitRef` | Prevents double room init |
| `skippedPuzzleIdsRef` | Set of puzzle IDs skipped in this race |
| `nitroTimeoutRef` | Auto-clear nitro boost after 750ms |
| `countdownSoundRef` | Web Audio API context for beep sounds |
| `racerDisplayNameRef` | Latest racer name (read from effects without dep array issues) |
| `nameDebounceRef` | Debounce timer for sending name to backend |

---

## XP and Scoring

- **Score:** +1 per correctly solved puzzle (local, not synced to backend)
- **XP:** Awarded by the backend when `POST /api/puzzles/{id}/attempt` returns with `is_solved: true`. The `xp_earned` value is added to the local total and the user's global `total_xp` in the auth store.
- **Wrong move:** `is_solved: false` attempt recorded. No score, no XP.
- **Skip:** `is_solved: false` attempt recorded with empty moves. No score, no XP.

---

## End Screen

Displayed when `phase === 'ended'` (timer reaches zero or all puzzles exhausted).

Shows:
- **Final standings** — all participants sorted by score, with medal emojis for top 3
- **Puzzles solved** — count of correct solves
- **XP earned** — total XP accumulated during the race
- **Play again** — resets to lobby phase (clears puzzle pool, keeps room)
- **Back to Puzzles** — navigates to `/puzzles`

---

## Non-Host Leave & Rejoin Rules

- **During a race:** If a non-host player navigates away or closes the page, an unmount effect calls `POST /leave` to remove them from the room. Their car, name, and score are cleared server-side.
- **Returning during an ongoing race:** If the removed player revisits the room link while the race is still ongoing, they see a "Race is Ongoing — please wait" screen. They cannot rejoin mid-race.
- **After the race ends:** Once the room transitions to `waiting` (host clicked "Re-join Match"), the waiting screen dismisses and the player sees the lobby with a "Join Race" button.
- **Host is persistent:** The host is never removed from a racing room. If the host disconnects and returns, they resync into the ongoing race.

---

## Known Limitations / Future Considerations

1. **Puzzle difficulty is hardcoded to `"beginner"`** — the `PuzzleRaceRoomCreate` schema has `difficulty` and `puzzle_count` fields but they are unused by the frontend.
2. **Puzzle pool is limited to 20** — the default `PUZZLES_PAGE_SIZE` is 20. Each client fetches independently.
3. **Scores are synced via polling** — each correct solve calls `POST /update-score`, and other clients read `latest.scores` during polling to update non-local players' track positions.
4. **Room state is in-memory** — rooms are lost on server restart. Not persisted to database.
5. **No room cleanup** — old rooms accumulate in `_puzzle_race_rooms` dict indefinitely.
6. **Puzzle order differs per client** — each client shuffles independently, so players solve puzzles in different orders.
7. **"Play again" does not create a new room** — it resets local state but uses the same room. The `raceBootstrapped` flag is not reset, so re-racing may not work correctly without a page reload.
