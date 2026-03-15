# How to Download Lichess Puzzles

Lichess has a massive database of **3+ million** free, verified chess puzzles!

## 🎯 Option 1: Download the Full Database (Recommended)

### Step 1: Download the CSV File
**URL:** https://database.lichess.org/lichess_db_puzzle.csv.zst

This is a compressed file (~250MB compressed, ~2GB uncompressed)

### Step 2: Decompress the File
The file is compressed with Zstandard (.zst format)

**On Windows:**
```powershell
# Install zstd
winget install zstd

# Decompress
zstd -d lichess_db_puzzle.csv.zst
```

**On Mac/Linux:**
```bash
# Install zstd
brew install zstd  # Mac
sudo apt install zstd  # Ubuntu/Debian

# Decompress
zstd -d lichess_db_puzzle.csv.zst
```

### Step 3: CSV Format
The uncompressed CSV contains columns:
```
PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
```

**Example row:**
```
00001,r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24,e7e6 h6h7 e6e1 h7h8 e1e8,1534,74,92,11673,crushing hangingPiece long middlegame,https://lichess.org/yyznGmXs,Italian_Game Italian_Game_Classical_Variation
```

### Step 4: Import Specific Puzzles
You don't need all 3 million! Filter by:
- **Rating**: Difficulty (800-2800)
- **Themes**: fork, pin, skewer, mate, etc.
- **Popularity**: Most played puzzles

## 🎯 Option 2: Use Lichess API (Smaller Sets)

### Get Puzzles by Theme
```bash
curl "https://lichess.org/api/puzzle/daily" > daily_puzzle.json
```

### Get Specific Puzzle
```bash
curl "https://lichess.org/api/puzzle/{puzzleId}" > puzzle.json
```

**Example:**
```bash
curl "https://lichess.org/api/puzzle/zytyJ" > puzzle.json
```

**Response:**
```json
{
  "game": {
    "id": "yyznGmXs",
    "pgn": "..."
  },
  "puzzle": {
    "id": "00001",
    "rating": 1534,
    "plays": 11673,
    "solution": ["e7e6", "h6h7", "e6e1"],
    "themes": ["hangingPiece", "long", "middlegame"]
  }
}
```

## 🎯 Option 3: Python Script to Import Selected Puzzles

I'll create a script for you!

```python
import csv
import psycopg2

# Connect to your database
conn = psycopg2.connect(
    dbname="mydb",
    user="postgres",
    password="your_password",
    host="localhost"
)
cur = conn.cursor()

# Read Lichess puzzles CSV
with open('lichess_db_puzzle.csv', 'r') as f:
    reader = csv.DictReader(f)
    
    count = 0
    for row in reader:
        # Filter criteria
        rating = int(row['Rating'])
        themes = row['Themes'].split()
        
        # Import only beginner-friendly puzzles (rating 800-1400)
        if 800 <= rating <= 1400 and 'mate' in themes:
            # Map rating to difficulty
            if rating < 1000:
                difficulty = 'BEGINNER'
                xp = 10
            elif rating < 1200:
                difficulty = 'INTERMEDIATE'
                xp = 25
            else:
                difficulty = 'ADVANCED'
                xp = 40
            
            # Get first theme as main theme
            theme = themes[0] if themes else 'tactics'
            
            # Insert into database
            cur.execute("""
                INSERT INTO puzzles (
                    title, description, fen, moves, 
                    difficulty, rating, theme, xp_reward, is_active
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                f"Lichess Puzzle #{row['PuzzleId']}",
                f"Tactical puzzle - {theme}",
                row['FEN'],
                row['Moves'],
                difficulty,
                rating,
                theme,
                xp,
                True
            ))
            
            count += 1
            if count >= 100:  # Import only 100 puzzles
                break
    
    conn.commit()
    print(f"Imported {count} puzzles!")

cur.close()
conn.close()
```

## 🎯 Option 4: Quick Import Script (Best for You!)

### Step 1: Download Sample Puzzles
I'll create a pre-filtered set for you with SQL inserts:

**Themes to focus on for beginners:**
- `mate` - Checkmate puzzles
- `mateIn1` - One-move checkmates
- `mateIn2` - Two-move checkmates
- `fork` - Knight/Queen forks
- `pin` - Pinning pieces
- `skewer` - Skewer tactics
- `discoveredAttack` - Discovered attacks

### Step 2: Use My Import Script
I'll create a Python script that:
1. Downloads puzzles from Lichess
2. Filters by difficulty
3. Generates SQL INSERT statements
4. You just run the SQL!

Want me to create this script for you?

## 📊 Recommended Import Strategy

For your chess learning app, I suggest:

**Beginner (Rating 800-1200):**
- 50 puzzles: `mateIn1`, `mateIn2`
- Theme: Simple checkmates

**Intermediate (Rating 1200-1600):**
- 50 puzzles: `fork`, `pin`, `discoveredAttack`
- Theme: Basic tactics

**Advanced (Rating 1600-2000):**
- 30 puzzles: `sacrifice`, `attackingF2F7`, `exposedKing`
- Theme: Complex tactics

**Expert (Rating 2000+):**
- 20 puzzles: `endgame`, `advantage`, `middlegame`
- Theme: Positional

**Total: 150 high-quality, verified puzzles!**

## 🚀 Next Steps

Which option do you prefer?

1. **I download & filter puzzles for you** - I'll create a ready-to-use SQL file
2. **Python script** - I'll create a script you run once
3. **Manual CSV import** - You download and import yourself

Let me know and I'll create the exact tool you need! 🎯
