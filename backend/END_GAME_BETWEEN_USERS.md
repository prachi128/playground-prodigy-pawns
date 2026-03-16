# Ending a Game Between Two Users

If two users have an **ongoing** game (no result, not ended) and you need to end it—for example to clear test data or unstick a stuck game—use the script `end_game_between_users.py`.

## What the script does

- Finds all **ongoing** games between the two given users (by username).
- Ends each game as a **draw** (`1/2-1/2`).
- Sets `ended_at` and updates both players’ Elo ratings and levels.

## Prerequisites

- Run from the **backend** directory.
- Use the project’s Python environment (e.g. activate the backend `venv` so that `database`, `models`, etc. are available).

## Command

From the backend directory, with your venv activated:

```bash
# End all ongoing games between two users (use their usernames)
python end_game_between_users.py <username1> <username2>
```

### Examples

```bash
# End all ongoing games between alice_chess and diana_queen
python end_game_between_users.py alice_chess diana_queen

# With default test users (alice_chess and diana_queen) if you omit arguments
python end_game_between_users.py
```

### Windows (PowerShell)

If you don’t have the venv in your path, call the venv’s Python explicitly:

```powershell
cd backend
.\venv\Scripts\python.exe end_game_between_users.py alice_chess diana_queen
```

## Output

- **No ongoing game:**  
  `No ongoing game found between <user1> and <user2>.`
- **Game(s) ended:**  
  For each game: `Ended game id=<id> (<user1> vs <user2>) as draw.`

## How to find usernames

Usernames are the login handles (e.g. `alice_chess`, `diana_queen`). You can get them from:

- Your seed data or test accounts.
- The database `users` table, column `username`.

## Notes

- Only **ongoing** games are affected (no `result`, no `ended_at`). Finished games are left as-is.
- All such games between the two users are ended as a draw and ratings are updated.
- The script uses the same DB connection as the app (via `database.py` and `.env`).
