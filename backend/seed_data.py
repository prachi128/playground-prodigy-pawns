from sqlalchemy.orm import Session
from models import User, Puzzle, Achievement, DailyChallenge, UserRole, DifficultyLevel
from auth import get_password_hash
from datetime import datetime, date
import json

def seed_database(db: Session):
    """Seed the database with sample data"""
    
    print("🌱 Starting database seeding...")
    
    # Check if data already exists
    existing_users = db.query(User).count()
    if existing_users > 0:
        print(f"⚠️  Database already has {existing_users} users. Skipping seeding.")
        return
    
    # ==================== CREATE SAMPLE USERS ====================
    print("👥 Creating sample users...")
    
    users_data = [
        {
            "email": "alice@prodigypawns.com",
            "username": "alice_chess",
            "full_name": "Alice Wonder",
            "password": "password123",
            "age": 10,
            "total_xp": 250,
            "level": 3,
            "rating": 650,
            "avatar_url": "/avatars/girl1.png"
        },
        {
            "email": "bob@prodigypawns.com",
            "username": "bob_knight",
            "full_name": "Bob Builder",
            "password": "password123",
            "age": 12,
            "total_xp": 180,
            "level": 2,
            "rating": 580,
            "avatar_url": "/avatars/boy1.png"
        },
        {
            "email": "charlie@prodigypawns.com",
            "username": "charlie_pawn",
            "full_name": "Charlie Brown",
            "password": "password123",
            "age": 9,
            "total_xp": 320,
            "level": 4,
            "rating": 720,
            "avatar_url": "/avatars/boy2.png"
        },
        {
            "email": "diana@prodigypawns.com",
            "username": "diana_queen",
            "full_name": "Diana Prince",
            "password": "password123",
            "age": 11,
            "total_xp": 450,
            "level": 5,
            "rating": 850,
            "avatar_url": "/avatars/girl2.png"
        },
        {
            "email": "admin@prodigypawns.com",
            "username": "admin",
            "full_name": "Admin User",
            "password": "admin123",
            "age": 30,
            "total_xp": 1000,
            "level": 10,
            "rating": 1200,
            "role": UserRole.admin,
            "avatar_url": "/avatars/admin.png"
        }
    ]
    
    created_users = []
    for user_data in users_data:
        role = user_data.pop("role", UserRole.student)
        password = user_data.pop("password")
        user = User(
            **user_data,
            hashed_password=get_password_hash(password),
            role=role
        )
        db.add(user)
        created_users.append(user)
    
    db.commit()
    print(f"✅ Created {len(created_users)} users")
    
    # ==================== CREATE SAMPLE PUZZLES ====================
    print("🧩 Creating sample puzzles...")
    
    puzzles_data = [
        {
            "title": "Beginner Fork",
            "description": "Find the knight fork that wins material",
            "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
            "moves": "Nxe5 Nxe5",
            "difficulty": DifficultyLevel.BEGINNER,
            "rating": 400,
            "theme": "fork",
            "xp_reward": 10,
            "hints": json.dumps([
                "Look for a knight move that attacks two pieces",
                "The knight can capture on e5"
            ])
        },
        {
            "title": "Back Rank Mate",
            "description": "Deliver checkmate on the back rank",
            "fen": "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
            "moves": "Re8#",
            "difficulty": DifficultyLevel.BEGINNER,
            "rating": 450,
            "theme": "checkmate",
            "xp_reward": 15,
            "hints": json.dumps([
                "The king has no escape squares",
                "Move your rook to the 8th rank"
            ])
        },
        {
            "title": "Pin the Knight",
            "description": "Use a pin to win material",
            "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
            "moves": "Bxf7+ Kxf7 Nxe5+ Nxe5",
            "difficulty": DifficultyLevel.INTERMEDIATE,
            "rating": 650,
            "theme": "pin",
            "xp_reward": 20,
            "hints": json.dumps([
                "The knight on f6 is defending e5",
                "A check will remove the defender"
            ])
        },
        {
            "title": "Queen and Rook Mate",
            "description": "Coordinate queen and rook for checkmate",
            "fen": "6k1/5ppp/8/8/8/2Q5/5PPP/4R1K1 w - - 0 1",
            "moves": "Re8#",
            "difficulty": DifficultyLevel.INTERMEDIATE,
            "rating": 700,
            "theme": "checkmate",
            "xp_reward": 25,
            "hints": json.dumps([
                "The queen controls escape squares",
                "The rook can deliver mate"
            ])
        },
        {
            "title": "Advanced Tactics",
            "description": "Find the winning combination",
            "fen": "r2qkb1r/ppp2ppp/2np1n2/4p1B1/2B1P3/2N2N2/PPPP1PPP/R2QK2R w KQkq - 0 7",
            "moves": "Bxf7+ Kxf7 Nxe5+ Nxe5 Qd5+",
            "difficulty": DifficultyLevel.ADVANCED,
            "rating": 900,
            "theme": "combination",
            "xp_reward": 35,
            "hints": json.dumps([
                "Start with a sacrifice",
                "The king will be exposed"
            ])
        },
        {
            "title": "Endgame Precision",
            "description": "Win the king and pawn endgame",
            "fen": "8/8/8/3k4/3P4/3K4/8/8 w - - 0 1",
            "moves": "Kc3 Kc6 Kc4 Kd6 Kd5",
            "difficulty": DifficultyLevel.ADVANCED,
            "rating": 950,
            "theme": "endgame",
            "xp_reward": 40,
            "hints": json.dumps([
                "Control the key squares",
                "Use opposition"
            ])
        },
        {
            "title": "Smothered Mate Pattern",
            "description": "Execute a classic smothered mate",
            "fen": "r1bqk2r/ppp2Npp/1bnp4/4p3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 7",
            "moves": "Qa5+ b4 Qxb4",
            "difficulty": DifficultyLevel.EXPERT,
            "rating": 1100,
            "theme": "checkmate",
            "xp_reward": 50,
            "hints": json.dumps([
                "The knight on f7 is powerful",
                "Look for a queen sacrifice"
            ])
        }
    ]
    
    created_puzzles = []
    for puzzle_data in puzzles_data:
        puzzle = Puzzle(**puzzle_data)
        db.add(puzzle)
        created_puzzles.append(puzzle)
    
    db.commit()
    print(f"✅ Created {len(created_puzzles)} puzzles")
    
    # ==================== CREATE ACHIEVEMENTS ====================
    print("🏆 Creating achievements...")
    
    achievements_data = [
        {
            "name": "First Steps",
            "description": "Complete your first puzzle",
            "icon_url": "/achievements/first_puzzle.png",
            "criteria_type": "puzzles_solved",
            "criteria_value": 1,
            "xp_reward": 50,
            "badge_color": "#10B981"
        },
        {
            "name": "Puzzle Master",
            "description": "Solve 50 puzzles",
            "icon_url": "/achievements/puzzle_master.png",
            "criteria_type": "puzzles_solved",
            "criteria_value": 50,
            "xp_reward": 200,
            "badge_color": "#8B5CF6"
        },
        {
            "name": "First Victory",
            "description": "Win your first game",
            "icon_url": "/achievements/first_win.png",
            "criteria_type": "games_won",
            "criteria_value": 1,
            "xp_reward": 100,
            "badge_color": "#FBBF24"
        },
        {
            "name": "Champion",
            "description": "Win 25 games",
            "icon_url": "/achievements/champion.png",
            "criteria_type": "games_won",
            "criteria_value": 25,
            "xp_reward": 500,
            "badge_color": "#F97316"
        },
        {
            "name": "XP Hunter",
            "description": "Earn 1000 XP",
            "icon_url": "/achievements/xp_hunter.png",
            "criteria_type": "xp_earned",
            "criteria_value": 1000,
            "xp_reward": 150,
            "badge_color": "#EC4899"
        },
        {
            "name": "Daily Dedication",
            "description": "Complete 7 daily challenges in a row",
            "icon_url": "/achievements/daily_dedication.png",
            "criteria_type": "daily_streak",
            "criteria_value": 7,
            "xp_reward": 300,
            "badge_color": "#3B82F6"
        }
    ]
    
    created_achievements = []
    for achievement_data in achievements_data:
        achievement = Achievement(**achievement_data)
        db.add(achievement)
        created_achievements.append(achievement)
    
    db.commit()
    print(f"✅ Created {len(created_achievements)} achievements")
    
    # ==================== CREATE DAILY CHALLENGE ====================
    print("📅 Creating today's daily challenge...")
    
    today = date.today()
    daily_challenge = DailyChallenge(
        date=datetime.combine(today, datetime.min.time()),
        title="Knight Tactics Challenge",
        description="Solve 3 knight-related puzzles in under 5 minutes",
        challenge_type="puzzle",
        challenge_data=json.dumps({
            "puzzle_ids": [1, 2, 3],
            "time_limit": 300,
            "min_accuracy": 100
        }),
        xp_reward=100,
        bonus_xp=50,
        difficulty=DifficultyLevel.INTERMEDIATE,
        time_limit=300
    )
    
    db.add(daily_challenge)
    db.commit()
    print("✅ Created daily challenge")
    
    print("\n🎉 Database seeding completed successfully!")
    print("\n📝 Test Accounts:")
    print("=" * 50)
    for user_data in users_data:
        print(f"Email: {user_data['email']}")
        print(f"Username: {user_data['username']}")
        print(f"Password: password123 (or admin123 for admin)")
        print("-" * 50)

if __name__ == "__main__":
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from dotenv import load_dotenv
    import os
    from urllib.parse import quote_plus
    
    # Load environment variables
    load_dotenv()
    
    # Get database credentials
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    
    # URL-encode the password
    encoded_password = quote_plus(DB_PASSWORD)
    
    # Create database URL
    DATABASE_URL = f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    
    # Create engine and session
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Seed the database
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
