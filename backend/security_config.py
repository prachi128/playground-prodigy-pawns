"""
Production-safe security settings for auth cookies, JWT secret, and CORS.

Environment variables:
  ENVIRONMENT / APP_ENV  - "production" | "staging" | "development" (default: development)
  SECRET_KEY             - required JWT signing secret (min 32 chars)
  COOKIE_SECURE          - "true"/"false" to force Secure cookie flag (overrides env default)
  CORS_ORIGINS           - comma-separated allowed frontend origins
  FRONTEND_URL           - primary frontend origin; also added to CORS allowlist
"""

from __future__ import annotations

import os
from typing import List

_INSECURE_SECRET_PLACEHOLDERS = {
    "",
    "your-secret-key-change-this-in-production-make-it-long-and-random",
    "generate-a-long-random-secret",
    "generate-a-long-random-secret-at-least-32-chars",
    "your-super-secret-key-make-it-long-and-random-at-least-32-characters",
    "change-me",
    "secret",
}

_DEV_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]


def get_environment() -> str:
    raw = (
        os.getenv("ENVIRONMENT")
        or os.getenv("APP_ENV")
        or "development"
    ).strip().lower()
    if raw in {"prod", "production"}:
        return "production"
    if raw in {"stage", "staging"}:
        return "staging"
    return "development"


def is_production() -> bool:
    return get_environment() == "production"


def is_production_like() -> bool:
    return get_environment() in {"production", "staging"}


def get_secret_key() -> str:
    """
    Load SECRET_KEY from the environment.

    Rejects missing/placeholder/short secrets so JWT signing never uses a
    known insecure default in any environment.
    """
    secret = (os.getenv("SECRET_KEY") or "").strip()
    if not secret or secret in _INSECURE_SECRET_PLACEHOLDERS:
        raise RuntimeError(
            "SECRET_KEY must be set to a long random value in the environment. "
            "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
        )
    if len(secret) < 32:
        raise RuntimeError(
            "SECRET_KEY must be at least 32 characters. "
            "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
        )
    return secret


def use_secure_cookies() -> bool:
    """
    Prefer Secure cookies in production/staging (HTTPS).

    Override with COOKIE_SECURE=true|false when needed (e.g. local HTTPS).
    """
    override = (os.getenv("COOKIE_SECURE") or "").strip().lower()
    if override in {"1", "true", "yes", "on"}:
        return True
    if override in {"0", "false", "no", "off"}:
        return False

    frontend_url = (os.getenv("FRONTEND_URL") or "").strip().lower()
    if frontend_url.startswith("https://"):
        return True
    return is_production_like()


def get_cookie_attrs() -> dict:
    attrs = {
        "httponly": True,
        "samesite": "lax",
        "path": "/",
    }
    if use_secure_cookies():
        attrs["secure"] = True
    return attrs


def get_cors_origins() -> List[str]:
    """
    Build the CORS allowlist.

    Always includes CORS_ORIGINS (comma-separated) and FRONTEND_URL when set.
    In development, also includes localhost defaults.
    """
    origins: List[str] = []

    raw = (os.getenv("CORS_ORIGINS") or "").strip()
    if raw:
        origins.extend(part.strip().rstrip("/") for part in raw.split(",") if part.strip())

    frontend_url = (os.getenv("FRONTEND_URL") or "").strip().rstrip("/")
    if frontend_url:
        origins.append(frontend_url)

    if not is_production_like():
        origins.extend(_DEV_CORS_ORIGINS)

    # Preserve order while deduplicating
    seen = set()
    unique: List[str] = []
    for origin in origins:
        if origin and origin not in seen:
            seen.add(origin)
            unique.append(origin)

    if is_production_like() and not unique:
        raise RuntimeError(
            "CORS_ORIGINS or FRONTEND_URL must be set in production/staging "
            "so the API can allow the frontend origin with credentials."
        )

    return unique
