"""
Build MatchSample rows for bot calibration from real DB data.

Primary source: finished rows in ``games`` where one player is ``__BOT__``.
Optional fallback: ``bot_movetelemetry`` proxy (eval loss) when requested.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from bot_calibration import MatchSample
from bot_opponents import get_bot_rating_for_game
from models import BotMoveTelemetry, BotProfile, BotProfileVersion, Game, User

BOT_USERNAME = "__BOT__"


def resolve_bot_user_id(db: Session) -> Optional[int]:
    uid = db.query(User.id).filter(User.username == BOT_USERNAME).scalar()
    return int(uid) if uid is not None else None


def game_result_to_bot_score(result: Optional[str], bot_plays_white: bool) -> Optional[float]:
    """Map PGN-style result to score from the bot's perspective (1 / 0.5 / 0)."""
    if not result or result == "*":
        return None
    r = result.strip()
    if r == "1/2-1/2":
        return 0.5
    if r == "1-0":
        return 1.0 if bot_plays_white else 0.0
    if r == "0-1":
        return 0.0 if bot_plays_white else 1.0
    return None


def _telemetry_game_ids_for_version(db: Session, profile_version_id: int) -> List[int]:
    rows = (
        db.query(BotMoveTelemetry.game_id)
        .filter(BotMoveTelemetry.profile_version_id == profile_version_id)
        .distinct()
        .all()
    )
    return [int(r[0]) for r in rows]


def match_samples_from_finished_bot_games(
    db: Session,
    *,
    bot_user_id: int,
    profile_version_id: Optional[int],
    games_scope: str,
    limit: int,
) -> Tuple[List[MatchSample], Dict[str, int]]:
    """
    ``games_scope``:
    - ``persona``: all finished bot games for this profile's ``bot_id`` (``Game.bot_difficulty``).
    - ``profile_version``: only games that have telemetry tagged with ``profile_version_id``.
    """
    q = db.query(Game).filter(
        Game.ended_at.isnot(None),
        Game.result.isnot(None),
        Game.bot_difficulty.isnot(None),
        (Game.white_player_id == bot_user_id) | (Game.black_player_id == bot_user_id),
    )

    profile: Optional[BotProfile] = None
    if profile_version_id is not None:
        version = db.query(BotProfileVersion).filter(BotProfileVersion.id == profile_version_id).first()
        if version:
            profile = db.query(BotProfile).filter(BotProfile.id == version.profile_id).first()

    if profile is not None:
        q = q.filter(func.lower(Game.bot_difficulty) == profile.bot_id.lower())

    if games_scope == "profile_version" and profile_version_id is not None:
        gids = _telemetry_game_ids_for_version(db, profile_version_id)
        if not gids:
            return [], {"games_matched": 0, "games_skipped_bad_result": 0}
        q = q.filter(Game.id.in_(gids))
    elif games_scope == "profile_version":
        return [], {"games_matched": 0, "games_skipped_bad_result": 0}

    rows = q.order_by(Game.ended_at.desc()).limit(max(1, min(50_000, limit))).all()

    human_ids = set()
    for g in rows:
        hid = g.black_player_id if g.white_player_id == bot_user_id else g.white_player_id
        human_ids.add(hid)

    users_by_id = {u.id: u for u in db.query(User).filter(User.id.in_(human_ids)).all()} if human_ids else {}

    samples: List[MatchSample] = []
    skipped = 0
    for g in rows:
        bot_white = g.white_player_id == bot_user_id
        score = game_result_to_bot_score(g.result, bot_white)
        if score is None:
            skipped += 1
            continue
        hid = g.black_player_id if bot_white else g.white_player_id
        human = users_by_id.get(hid)
        if not human:
            skipped += 1
            continue
        opp_r = max(100, min(3200, int(human.rating or 400)))
        bt = get_bot_rating_for_game((g.bot_difficulty or "").strip().lower(), g.bot_depth)
        samples.append(
            MatchSample(
                bot_rating_target=bt,
                opponent_rating=opp_r,
                score=score,
            )
        )

    return samples, {"games_matched": len(rows), "games_skipped_bad_result": skipped}


def match_samples_from_telemetry_proxy(
    db: Session,
    *,
    profile_version_id: Optional[int],
    target_rating: int,
    limit: int,
) -> Tuple[List[MatchSample], int]:
    """Legacy proxy: infer pseudo-outcomes from per-move eval loss (weak signal)."""
    telemetry_q = db.query(BotMoveTelemetry)
    if profile_version_id is not None:
        telemetry_q = telemetry_q.filter(BotMoveTelemetry.profile_version_id == profile_version_id)
    telemetry = telemetry_q.order_by(BotMoveTelemetry.created_at.desc()).limit(max(1, min(5000, limit))).all()

    samples: List[MatchSample] = []
    for t in telemetry:
        if t.eval_loss_cp is None:
            continue
        el = t.eval_loss_cp or 0
        score = 1.0 if el <= 30 else 0.5 if el <= 120 else 0.0
        samples.append(
            MatchSample(
                bot_rating_target=t.target_rating or target_rating,
                opponent_rating=target_rating,
                score=score,
            )
        )
    return samples, len(telemetry)


def build_calibration_samples(
    db: Session,
    *,
    profile_version_id: Optional[int],
    target_rating: int,
    sample_source: str,
    games_scope: str,
    games_limit: int = 5000,
    telemetry_limit: int = 2000,
) -> Tuple[List[MatchSample], Dict]:
    """
    ``sample_source``: ``auto`` (prefer games, else telemetry), ``games``, ``telemetry``.
    """
    if sample_source not in ("auto", "games", "telemetry"):
        sample_source = "auto"
    if games_scope not in ("persona", "profile_version"):
        games_scope = "persona"

    meta: Dict = {
        "sample_source_requested": sample_source,
        "games_scope": games_scope,
        "game_samples": 0,
        "telemetry_samples": 0,
        "sample_source_used": None,
    }

    game_samples: List[MatchSample] = []
    tele_samples: List[MatchSample] = []
    bot_uid = resolve_bot_user_id(db)

    if sample_source in ("auto", "games") and bot_uid:
        game_samples, gmeta = match_samples_from_finished_bot_games(
            db,
            bot_user_id=bot_uid,
            profile_version_id=profile_version_id,
            games_scope=games_scope,
            limit=games_limit,
        )
        meta.update(gmeta)

    if sample_source == "telemetry" or (sample_source == "auto" and len(game_samples) == 0):
        tele_samples, ntele = match_samples_from_telemetry_proxy(
            db,
            profile_version_id=profile_version_id,
            target_rating=target_rating,
            limit=telemetry_limit,
        )
        meta["telemetry_rows_scanned"] = ntele

    if game_samples and sample_source != "telemetry":
        final = game_samples
        meta["sample_source_used"] = "games"
        meta["game_samples"] = len(game_samples)
    elif tele_samples:
        final = tele_samples
        meta["sample_source_used"] = "telemetry"
        meta["telemetry_samples"] = len(tele_samples)
    else:
        final = []
        meta["sample_source_used"] = "none"

    return final, meta
