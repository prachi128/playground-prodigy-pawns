"""Helpers for coach class recurring schedules."""

from __future__ import annotations

from datetime import datetime, time
from typing import Iterable, List, Optional
from zoneinfo import ZoneInfo

DEFAULT_SCHEDULE_TIMEZONE = "Asia/Kolkata"

DAY_TOKEN_TO_DOW = {
    "sun": 0,
    "sunday": 0,
    "mon": 1,
    "monday": 1,
    "tue": 2,
    "tues": 2,
    "tuesday": 2,
    "wed": 3,
    "wednesday": 3,
    "thu": 4,
    "thur": 4,
    "thurs": 4,
    "thursday": 4,
    "fri": 5,
    "friday": 5,
    "sat": 6,
    "saturday": 6,
}

WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


def parse_weekdays_csv(value: Optional[str]) -> List[int]:
    if not value or not str(value).strip():
        return []
    out: List[int] = []
    for part in str(value).split(","):
        part = part.strip()
        if not part:
            continue
        try:
            dow = int(part)
        except ValueError:
            continue
        if 0 <= dow <= 6 and dow not in out:
            out.append(dow)
    return sorted(out)


def weekdays_to_csv(days: Iterable[int]) -> Optional[str]:
    normalized = sorted({int(d) for d in days if 0 <= int(d) <= 6})
    if not normalized:
        return None
    return ",".join(str(d) for d in normalized)


def infer_weekdays_from_schedule_text(schedule: Optional[str]) -> List[int]:
    if not schedule or not schedule.strip():
        return []
    lower = schedule.lower()
    tokens = lower.split()
    found = set()
    for token in lower.replace("/", " ").replace(",", " ").split():
        token = "".join(ch for ch in token if ch.isalpha())
        if not token:
            continue
        dow = DAY_TOKEN_TO_DOW.get(token)
        if dow is not None:
            found.add(dow)
    return sorted(found)


def parse_schedule_time(value: Optional[str]) -> Optional[time]:
    if not value or not str(value).strip():
        return None
    raw = str(value).strip()
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(raw, fmt).time()
        except ValueError:
            continue
    return None


def format_schedule_time_12h(value: Optional[str]) -> Optional[str]:
    t = parse_schedule_time(value)
    if not t:
        return None
    hour = t.hour % 12 or 12
    minute = t.minute
    suffix = "AM" if t.hour < 12 else "PM"
    if minute:
        return f"{hour}:{minute:02d} {suffix}"
    return f"{hour} {suffix}"


def timezone_abbreviation(tz_name: Optional[str]) -> Optional[str]:
    name = (tz_name or DEFAULT_SCHEDULE_TIMEZONE).strip() or DEFAULT_SCHEDULE_TIMEZONE
    try:
        return datetime.now(ZoneInfo(name)).strftime("%Z")
    except Exception:
        return name


def build_schedule_label(
    weekdays: List[int],
    schedule_time: Optional[str],
    schedule_timezone: Optional[str] = None,
) -> Optional[str]:
    if not weekdays:
        return None
    day_part = " / ".join(WEEKDAY_SHORT[d] for d in sorted(weekdays))
    time_part = format_schedule_time_12h(schedule_time)
    if time_part:
        tz_abbr = timezone_abbreviation(schedule_timezone)
        if tz_abbr:
            return f"{day_part} {time_part} {tz_abbr}"
        return f"{day_part} {time_part}"
    return day_part


def combine_date_and_schedule_time(date_value: datetime, schedule_time: Optional[str]) -> datetime:
    t = parse_schedule_time(schedule_time)
    if not t:
        return date_value
    return date_value.replace(hour=t.hour, minute=t.minute, second=0, microsecond=0)
