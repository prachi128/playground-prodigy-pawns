"""
Find and end ongoing game(s) between two users (e.g. alice and diana).
Usage (from backend directory, with venv active):
  python end_game_between_users.py alice_chess diana_queen
  python end_game_between_users.py   # defaults to alice_chess, diana_queen
"""
import sys
from datetime import datetime, timezone

from database import SessionLocal
from models import Game, User

# Inlined from main to avoid importing auth (Windows console encoding with emoji)
_RATING_THRESHOLDS = [300, 500, 700, 900, 1100, 1300, 1500, 1700, 1900, 2100, 2300, 2500, 2700, 2900]


def level_from_rating(rating: int) -> int:
    r = max(100, rating)
    level = 1
    for t in _RATING_THRESHOLDS:
        if r >= t:
            level += 1
        else:
            break
    return min(level, 15)


def update_ratings_after_game(game: Game, db) -> None:
    if not game.result:
        return
    white = db.query(User).filter(User.id == game.white_player_id).first()
    black = db.query(User).filter(User.id == game.black_player_id).first()
    if not white or not black:
        return
    if white.username == "__BOT__" or black.username == "__BOT__":
        return
    res = str(game.result or "")
    score_white = 0.5 if res == "1/2-1/2" else (1.0 if res == "1-0" else 0.0)
    rw, rb = white.rating or 100, black.rating or 100
    K, min_rating = 32, 100
    expected_white = 1.0 / (1.0 + 10.0 ** ((rb - rw) / 400.0))
    delta_white = K * (score_white - expected_white)
    white.rating = max(min_rating, round((white.rating or 100) + delta_white))
    white.level = level_from_rating(white.rating)
    black.rating = max(min_rating, round((black.rating or 100) - delta_white))
    black.level = level_from_rating(black.rating)


def main():
    u1_username = (sys.argv[1] if len(sys.argv) > 1 else "alice_chess").strip().lower()
    u2_username = (sys.argv[2] if len(sys.argv) > 2 else "diana_queen").strip().lower()

    db = SessionLocal()
    try:
        u1 = db.query(User).filter(User.username == u1_username).first()
        u2 = db.query(User).filter(User.username == u2_username).first()
        if not u1:
            print(f"User not found: {u1_username}")
            return 1
        if not u2:
            print(f"User not found: {u2_username}")
            return 1

        # Ongoing = no result and no ended_at
        games = (
            db.query(Game)
            .filter(
                (
                    ((Game.white_player_id == u1.id) & (Game.black_player_id == u2.id))
                    | ((Game.white_player_id == u2.id) & (Game.black_player_id == u1.id))
                ),
                Game.result.is_(None),
                Game.ended_at.is_(None),
            )
            .all()
        )

        if not games:
            print(f"No ongoing game found between {u1_username} and {u2_username}.")
            return 0

        for g in games:
            g.result = "1/2-1/2"
            g.ended_at = datetime.now(timezone.utc)
            if g.pgn and not g.pgn.rstrip().endswith(("1-0", "0-1", "1/2-1/2")):
                g.pgn = (g.pgn.rstrip() + " " + g.result).strip()
            update_ratings_after_game(g, db)
            db.commit()
            print(f"Ended game id={g.id} ({u1_username} vs {u2_username}) as draw.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
