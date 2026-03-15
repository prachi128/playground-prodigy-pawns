# Understanding FEN (Forsyth-Edwards Notation)

## What is FEN?

**FEN = Forsyth-Edwards Notation**

FEN is a standard text notation used to describe a particular chess position in a compact, single-line format. It was created by David Forsyth in the 19th century and later extended by Steven J. Edwards.

## Why Use FEN?

- 📝 **Compact**: Entire chess position in one line of text
- 🔄 **Universal**: All chess software understands FEN
- 💾 **Storage**: Easy to store and share positions
- 🎯 **Precision**: Captures every detail of the position

## FEN Structure

A complete FEN string has **6 fields** separated by spaces:

```
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
│────────────────────────────────────────│ │ │    │ │ │
│         Field 1: Piece Placement       │ │ │    │ │ │
│                                         │ │ │    │ │ │
                           Field 2: Active Color ─┘ │ │    │ │ │
                                 Field 3: Castling ─┘ │    │ │ │
                            Field 4: En Passant Square ─┘    │ │ │
                             Field 5: Halfmove Clock ────────┘ │ │
                              Field 6: Fullmove Number ────────┘ │
```

### Field 1: Piece Placement (Board Layout)

Describes the position of all pieces on the board, from rank 8 (top) to rank 1 (bottom).

**Piece Codes:**
- **Uppercase** = White pieces
  - `K` = King
  - `Q` = Queen
  - `R` = Rook
  - `B` = Bishop
  - `N` = Knight
  - `P` = Pawn

- **Lowercase** = Black pieces
  - `k` = King
  - `q` = Queen
  - `r` = Rook
  - `b` = Bishop
  - `n` = Knight
  - `p` = Pawn

- **Numbers** = Consecutive empty squares (1-8)
- **/** = Separates ranks (rows)

**Example:** `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR`

This represents:
```
8  r n b q k b n r   (Black's back rank)
7  p p p p p p p p   (Black's pawns)
6  . . . . . . . .   (Empty)
5  . . . . . . . .   (Empty)
4  . . . . . . . .   (Empty)
3  . . . . . . . .   (Empty)
2  P P P P P P P P   (White's pawns)
1  R N B Q K B N R   (White's back rank)
   a b c d e f g h
```

### Field 2: Active Color

Who's turn it is to move:
- `w` = White to move
- `b` = Black to move

### Field 3: Castling Availability

Which castling rights are still available:
- `K` = White can castle kingside (O-O)
- `Q` = White can castle queenside (O-O-O)
- `k` = Black can castle kingside
- `q` = Black can castle queenside
- `-` = No castling rights available

**Examples:**
- `KQkq` = Both sides can castle both ways
- `Kk` = Only kingside castling available
- `-` = No one can castle

### Field 4: En Passant Target Square

If a pawn just moved two squares forward, this field shows the square where an enemy pawn could capture it en passant.

- Shows the square **behind** the pawn that just moved
- Format: `e3`, `d6`, etc.
- `-` if no en passant is possible

**Example:** After `e2-e4`, this field would be `e3`

### Field 5: Halfmove Clock

Number of halfmoves (ply) since the last pawn move or capture. Used for the **50-move rule**.

- `0` = Just had a pawn move or capture
- Increments by 1 each move
- Resets to 0 on pawn moves or captures

### Field 6: Fullmove Number

The number of completed turns in the game.
- Starts at `1`
- Increments after Black's move
- Never decreases

## Complete FEN Examples

### Example 1: Starting Position
```
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
```

**Translation:**
- Board: Standard starting position
- To move: White
- Castling: All castling rights available
- En passant: None
- Halfmove clock: 0 (game just started)
- Move number: 1

### Example 2: After 1.e4
```
rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1
```

**Translation:**
- Board: White pawn on e4
- To move: Black
- Castling: All rights still available
- En passant: e3 (White just played e2-e4)
- Halfmove clock: 0 (pawn just moved)
- Move number: Still move 1 (Black hasn't moved yet)

### Example 3: Knight Fork Position
```
r1bqk2r/ppp2ppp/2n5/3np3/1b1P4/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 7
```

**Translation:**
- Board: Mid-game tactical position
- To move: White
- Castling: Both sides can castle both ways
- En passant: None
- Halfmove clock: 0
- Move number: 7

### Example 4: Endgame Position
```
8/5pk1/6p1/8/8/6P1/5PK1/3R4 w - - 0 1
```

**Translation:**
- Board: Rook endgame with kings and pawns
- To move: White
- Castling: No castling rights (indicated by `-`)
- En passant: None
- Halfmove clock: 0
- Move number: 1

## Common FEN Mistakes

### ❌ Wrong Number of Squares per Rank
Each rank must have exactly 8 squares (pieces + empty squares).

**Wrong:** `rnbqkbnr/pppppp/8/...` (only 6 squares on rank 7)
**Right:** `rnbqkbnr/pppppppp/8/...` (8 squares)

### ❌ Forgetting Slashes
Slashes separate ranks and are required.

**Wrong:** `rnbqkbnrpppppppp88888888PPPPPPPPRNBQKBNR`
**Right:** `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR`

### ❌ Wrong Order
FEN describes the board from rank 8 down to rank 1 (top to bottom from White's perspective).

### ❌ Missing Fields
All 6 fields are required, even if some are just `-` or `0`.

**Wrong:** `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR`
**Right:** `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`

## Using FEN in Chess Programming

### Setting a Position from FEN
```python
from stockfish import Stockfish

stockfish = Stockfish()
fen = "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4"
stockfish.set_fen_position(fen)
```

### Getting FEN from a Position
```python
current_fen = stockfish.get_fen_position()
print(current_fen)
```

### In JavaScript (chess.js)
```javascript
import { Chess } from 'chess.js';

const chess = new Chess();
chess.load('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4');
```

## FEN Visualization Tools

Want to see what a FEN looks like on a board?

- **Lichess**: https://lichess.org/editor
- **Chess.com**: https://www.chess.com/analysis
- **FEN Viewer**: Paste any FEN to see the position

## Quick Reference

| Component | Values | Example |
|-----------|--------|---------|
| Piece Placement | `KQRBNPkqrbnp1-8/` | `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR` |
| Active Color | `w` or `b` | `w` |
| Castling | `KQkq` or `-` | `KQkq` |
| En Passant | Square or `-` | `e3` or `-` |
| Halfmove Clock | `0` to `∞` | `0` |
| Fullmove Number | `1` to `∞` | `1` |

## Summary

- **FEN** = Complete chess position in one line
- **6 fields** separated by spaces
- **Standard notation** understood by all chess software
- **Essential** for chess programming, puzzles, and analysis
- **Compact** but contains all position information

Now you can read, write, and understand any chess position in FEN notation! ♟️
