# Bot Chess Guide — How Bots Work (Coach Reference)

This document explains how chess bots are implemented in Prodigy Pawns so coaches can understand difficulty levels and behavior.

---

## Overview

- All bots use the **Stockfish** chess engine (open-source, very strong).
- Difficulty is controlled by **search depth**: how many moves ahead the engine analyzes.
- Each difficulty has a **name**, **avatar**, and **estimated rating** for UI and communication.

---

## Difficulty Levels

| Difficulty   | Bot Name     | Search Depth | Estimated Rating | Description |
|-------------|--------------|--------------|------------------|-------------|
| **Beginner**   | Pawny ♟️     | 5            | ~400             | Good for learning; makes occasional mistakes. |
| **Intermediate** | Knighty ♞  | 10           | ~800             | Solid opponent for practice. |
| **Advanced**   | Rookie ♜    | 15           | ~1200            | Strong; challenges experienced players. |
| **Expert**     | Queen Chess ♛ | 20         | ~1800            | Very strong; for advanced players. |

- **Depth** = number of half-moves (plies) the engine searches.
- **Higher depth** → stronger play, slower response.
- **Lower depth** → weaker play, faster response.

---

## How the Bot Makes a Move

1. Player makes a move → game state (FEN, PGN) is updated.
2. Backend checks if it’s the bot’s turn.
3. **Stockfish** is called with the current position (FEN) and the game’s **bot_depth**.
4. Stockfish returns the **best move** (UCI format).
5. That move is applied to the board; PGN and FEN are updated.
6. Frontend shows the bot’s move (with a short delay so the player sees their move first).

### Code Flow (Backend)

```
1. Get current board position (FEN)
2. Call Stockfish: analyze_position(fen, depth=bot_depth)
3. Stockfish returns best move (UCI, e.g. "e2e4")
4. Apply move to board; update game (PGN, final_fen, total_moves)
5. If game ended (checkmate, draw), set result and winner
```

---

## Technical Details

### Database

- **Games** table stores:
  - `bot_difficulty`: string (e.g. `"beginner"`, `"intermediate"`).
  - `bot_depth`: integer (e.g. `5`, `10`, `15`, `20`).
- One special **bot user** (`username = "__BOT__"`) is used for all bot games; `white_player_id` or `black_player_id` points to this user when it’s a bot game.

### API

- **Create bot game:** `POST /api/games/bot`  
  Body: `{ "bot_difficulty": "beginner" | "intermediate" | "advanced" | "expert", "bot_depth": 5|10|15|20, "player_color": "white" | "black" }`
- **Get bot move:** `POST /api/games/{game_id}/bot-move`  
  Called by the frontend after the player moves (with a delay) so the bot responds only when it’s the bot’s turn.

### Fallback

- If Stockfish fails or returns no move, the backend picks a **random legal move** so the game can continue.

---

## Summary for Coaches

- **Yes, difficulty levels are different:** Beginner (depth 5) is much easier than Expert (depth 20).
- All levels use the same engine (Stockfish); only the search depth changes.
- Difficulty and depth are saved per game, so the bot’s strength stays consistent for that game.
- Students see different “bot personalities” (Pawny, Knighty, Rookie, Queen Chess) that map to these four levels.

---

*Last updated for Prodigy Pawns bot implementation.*



How the bots work
Engine: Stockfish
The bots use Stockfish, a strong open-source chess engine. Stockfish analyzes positions and suggests moves.
Difficulty levels
There are 4 difficulty levels, each with a different search depth:
Difficulty	Bot Name	Search Depth	Estimated Rating	Description
Beginner	Pawny ♟️	Depth 5	~400	Good for learning; makes occasional mistakes
Intermediate	Knighty ♞	Depth 10	~800	Solid opponent for practice
Advanced	Rookie ♜	Depth 15	~1200	Strong; challenges experienced players
Expert	Queen Chess ♛	Depth 20	~1800	Very strong; for advanced players
How search depth affects difficulty
Depth = how many moves ahead Stockfish analyzes
Higher depth = stronger play, but slower
Lower depth = faster, but weaker
Example:
Depth 5: Analyzes ~5 moves ahead
Depth 20: Analyzes ~20 moves ahead
How bot moves are made
Player makes a move → game state updates
Bot checks if it's the bot's turn
Stockfish analyzes the current position at the selected depth
Stockfish returns the best move
Bot plays that move
Board updates to show the bot's move
Code flow
# When bot needs to move:1. Get current board position (FEN)2. Call Stockfish: analyze_position(fen, depth=difficulty_depth)3. Stockfish returns best move4. Apply move to board5. Update game state (PGN, FEN, move count)
Features
Consistent strength per difficulty
Uses the same engine (Stockfish) across all levels
Difficulty is controlled by search depth
Fallback: if Stockfish fails, picks a random legal move
Visual representation
Each bot has:
Unique name and avatar
Color theme
Estimated rating
Tagline
The difficulty is stored in the database (bot_difficulty and bot_depth) so the bot maintains the same strength throughout the game.
In short: all bots use Stockfish; difficulty is controlled by search depth. Higher depth = stronger play.
