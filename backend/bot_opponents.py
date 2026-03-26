# Named bot ids (match frontend lib/bot-opponents.ts) -> display rating used for strength.
BOT_RATING_BY_ID: dict[str, int] = {
    "martin": 400,
    "elena": 550,
    "mika": 700,
    "ravi": 950,
    "nova": 1100,
    "diego": 1250,
    "astra": 1450,
    "irina": 1600,
    "viktor": 1750,
    "noor": 1950,
    "zeno": 2100,
}

# Legacy bot_difficulty values from older clients
LEGACY_RATING_BY_DIFFICULTY: dict[str, int] = {
    "beginner": 400,
    "intermediate": 900,
    "advanced": 1450,
    "expert": 2000,
}


def get_bot_rating_for_game(bot_difficulty: str | None, bot_depth: int | None = None) -> int:
    """
    Resolve approximate Elo used to weaken engine play.
    Falls back to a depth-based guess if id is unknown.
    """
    if not bot_difficulty:
        return 1200
    key = bot_difficulty.strip().lower()
    if key in BOT_RATING_BY_ID:
        return BOT_RATING_BY_ID[key]
    if key in LEGACY_RATING_BY_DIFFICULTY:
        return LEGACY_RATING_BY_DIFFICULTY[key]
    # Unknown id: map legacy depth (4–22) to a rough rating band
    if bot_depth is not None and bot_depth > 0:
        return max(400, min(2400, 350 + bot_depth * 85))
    return 1200
