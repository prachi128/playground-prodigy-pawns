"""
Import Lichess puzzle CSV files into the Prodigy Pawns database.

Usage examples:
  python import_lichess_puzzles.py --csv "..\\lichess_puzzles\\fork.csv" --limit 5000
  python import_lichess_puzzles.py --csv "..\\lichess_puzzles\\fork.csv" --csv "..\\lichess_puzzles\\pin.csv"
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Iterable, List, Set

import chess
from sqlalchemy.orm import Session

from database import SessionLocal
from models import DifficultyLevel, Puzzle, PuzzleTheme


DEFAULT_MAX_RATING = 10_000  # uncapped expert by default
DEFAULT_MIN_RATING = 400
DEFAULT_MAX_RD = 95
DEFAULT_MIN_PLAYS = 100
DEFAULT_MIN_POPULARITY = 70


def difficulty_for_rating(rating: int) -> DifficultyLevel:
    if rating <= 999:
        return DifficultyLevel.BEGINNER
    if rating <= 1400:
        return DifficultyLevel.INTERMEDIATE
    if rating <= 1800:
        return DifficultyLevel.ADVANCED
    return DifficultyLevel.EXPERT


def xp_for_difficulty(difficulty: DifficultyLevel) -> int:
    if difficulty == DifficultyLevel.BEGINNER:
        return 10
    if difficulty == DifficultyLevel.INTERMEDIATE:
        return 20
    if difficulty == DifficultyLevel.ADVANCED:
        return 30
    return 40


def normalize_and_validate_moves(fen: str, moves: str) -> str:
    board = chess.Board(fen)
    normalized: List[str] = []
    for token in (moves or "").strip().split():
        if not token:
            continue
        if len(token) >= 4 and token[0] in "abcdefgh" and token[2] in "abcdefgh":
            move = chess.Move.from_uci(token.lower())
            if move not in board.legal_moves:
                raise ValueError(f"illegal uci move: {token}")
            board.push(move)
            normalized.append(move.uci())
            continue
        san = board.parse_san(token)
        board.push(san)
        normalized.append(san.uci())
    return " ".join(normalized)


def parse_themes(raw_themes: str) -> List[str]:
    return [t.strip() for t in (raw_themes or "").split() if t.strip()]


def upsert_puzzle(
    db: Session,
    row: dict,
    update_existing: bool,
) -> str:
    lichess_id = row["PuzzleId"].strip()
    rating = int(row["Rating"])
    difficulty = difficulty_for_rating(rating)
    fen = row["FEN"].strip()
    moves = normalize_and_validate_moves(fen, row["Moves"])
    themes = parse_themes(row.get("Themes", ""))

    title = f"Lichess Puzzle #{lichess_id}"
    description = f"Lichess tactical puzzle - {' '.join(themes[:4])}".strip()
    theme_text = " ".join(themes)
    xp_reward = xp_for_difficulty(difficulty)

    puzzle = db.query(Puzzle).filter(Puzzle.lichess_id == lichess_id).first()
    if puzzle is None:
        puzzle = Puzzle(
            lichess_id=lichess_id,
            title=title,
            description=description,
            fen=fen,
            moves=moves,
            difficulty=difficulty,
            rating=rating,
            theme=theme_text,
            xp_reward=xp_reward,
            is_active=True,
        )
        db.add(puzzle)
        db.flush()
        existing_themes: Set[str] = set()
        status = "inserted"
    else:
        existing_themes = {pt.theme_key for pt in puzzle.themes}
        status = "existing"
        if update_existing:
            puzzle.title = title
            puzzle.description = description
            puzzle.fen = fen
            puzzle.moves = moves
            puzzle.difficulty = difficulty
            puzzle.rating = rating
            puzzle.theme = theme_text
            puzzle.xp_reward = xp_reward
            puzzle.is_active = True
            status = "updated"

    for t in themes:
        if t not in existing_themes:
            db.add(PuzzleTheme(puzzle_id=puzzle.id, theme_key=t))
            existing_themes.add(t)
    return status


def iter_rows(paths: Iterable[Path]):
    for path in paths:
        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield path, row


def main() -> None:
    parser = argparse.ArgumentParser(description="Import Lichess puzzles from CSV files")
    parser.add_argument("--csv", action="append", required=True, help="Path to a CSV file (can be repeated)")
    parser.add_argument("--min-rating", type=int, default=DEFAULT_MIN_RATING)
    parser.add_argument("--max-rating", type=int, default=DEFAULT_MAX_RATING)
    parser.add_argument("--max-rd", type=int, default=DEFAULT_MAX_RD)
    parser.add_argument("--min-plays", type=int, default=DEFAULT_MIN_PLAYS)
    parser.add_argument("--min-popularity", type=int, default=DEFAULT_MIN_POPULARITY)
    parser.add_argument("--limit", type=int, default=0, help="Max rows to import (0 = unlimited)")
    parser.add_argument("--commit-every", type=int, default=500)
    parser.add_argument("--update-existing", action="store_true")
    args = parser.parse_args()

    paths = [Path(p).resolve() for p in args.csv]
    for p in paths:
        if not p.exists():
            raise FileNotFoundError(f"CSV not found: {p}")

    db = SessionLocal()
    inserted = 0
    updated = 0
    existing = 0
    skipped_filters = 0
    skipped_invalid = 0
    processed = 0

    try:
        for src_path, row in iter_rows(paths):
            processed += 1
            if args.limit and (inserted + updated) >= args.limit:
                break

            try:
                rating = int(row["Rating"])
                rd = int(row["RatingDeviation"])
                plays = int(row["NbPlays"])
                popularity = int(row["Popularity"])
            except Exception:
                skipped_invalid += 1
                continue

            if (
                rating < args.min_rating
                or rating > args.max_rating
                or rd > args.max_rd
                or plays < args.min_plays
                or popularity < args.min_popularity
            ):
                skipped_filters += 1
                continue

            try:
                result = upsert_puzzle(db, row, args.update_existing)
            except Exception:
                skipped_invalid += 1
                continue

            if result == "inserted":
                inserted += 1
            elif result == "updated":
                updated += 1
            else:
                existing += 1

            if (inserted + updated) % args.commit_every == 0:
                db.commit()
                print(
                    f"[progress] processed={processed} inserted={inserted} updated={updated} "
                    f"existing={existing} skipped_filters={skipped_filters} skipped_invalid={skipped_invalid}"
                )

        db.commit()
    finally:
        db.close()

    print("\nImport complete:")
    print(f"  Processed:        {processed}")
    print(f"  Inserted:         {inserted}")
    print(f"  Updated:          {updated}")
    print(f"  Existing:         {existing}")
    print(f"  Skipped (filter): {skipped_filters}")
    print(f"  Skipped (invalid):{skipped_invalid}")


if __name__ == "__main__":
    main()
