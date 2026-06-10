/** Class schedule time helpers — store 24h HH:MM, display 12h AM/PM with timezone. */

export const DEFAULT_CLASS_TIMEZONE = 'Asia/Kolkata';

export interface ClassTimezoneOption {
  value: string;
  label: string;
}

export const CLASS_TIMEZONE_OPTIONS: ClassTimezoneOption[] = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Europe/London', label: 'United Kingdom (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET/CEST)' },
  { value: 'America/New_York', label: 'US Eastern (ET)' },
  { value: 'America/Chicago', label: 'US Central (CT)' },
  { value: 'America/Denver', label: 'US Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PT)' },
  { value: 'Australia/Sydney', label: 'Australia Eastern (AET)' },
  { value: 'UTC', label: 'UTC' },
];

export interface Time12Parts {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
}

const HOUR_OPTIONS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => i * 5);

export function getHourOptions(): number[] {
  return HOUR_OPTIONS;
}

export function getMinuteOptions(): number[] {
  return MINUTE_OPTIONS;
}

export function parseTime24(hhmm?: string | null): { hour: number; minute: number } | null {
  if (!hhmm?.trim()) return null;
  const [hStr, mStr] = hhmm.split(':');
  const hour = parseInt(hStr, 10);
  const minute = parseInt(mStr || '0', 10);
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

export function time24To12(hhmm?: string | null): Time12Parts {
  const parsed = parseTime24(hhmm);
  if (!parsed) return { hour: 5, minute: 0, period: 'PM' };
  let { hour, minute } = parsed;
  const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return { hour, minute, period };
}

export function time12To24(parts: Time12Parts): string {
  let h = parts.hour % 12;
  if (parts.period === 'PM') h += 12;
  if (parts.period === 'AM' && parts.hour === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

export function snapMinuteToStep(minute: number, step = 5): number {
  return Math.min(55, Math.round(minute / step) * step);
}

export function timezoneAbbreviation(timeZone: string, date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(date);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

export function formatTime24As12(
  hhmm?: string | null,
  timeZone: string = DEFAULT_CLASS_TIMEZONE,
): string | null {
  const parsed = parseTime24(hhmm);
  if (!parsed) return null;
  const { hour, minute } = parsed;
  const utcMs = Date.UTC(2020, 0, 1, hour, minute);
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(utcMs);
}

export function formatScheduleTimeDisplay(
  hhmm?: string | null,
  timeZone: string = DEFAULT_CLASS_TIMEZONE,
): string | null {
  const label = formatTime24As12(hhmm);
  if (!label) return null;
  const abbr = timezoneAbbreviation(timeZone);
  return `${label} ${abbr}`;
}

export function timezoneLabel(value: string): string {
  return CLASS_TIMEZONE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Wall-clock date/time in a timezone → UTC `Date`. */
export function wallTimeInZoneToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string = DEFAULT_CLASS_TIMEZONE,
): Date {
  let ms = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  for (let i = 0; i < 6; i++) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(ms))
        .filter((p) => p.type !== 'literal')
        .map((p) => [p.type, p.value]),
    );
    const gotY = parseInt(parts.year, 10);
    const gotM = parseInt(parts.month, 10);
    const gotD = parseInt(parts.day, 10);
    const gotH = parseInt(parts.hour, 10);
    const gotMin = parseInt(parts.minute, 10);
    const targetMs = Date.UTC(year, month - 1, day, hour, minute);
    const gotMs = Date.UTC(gotY, gotM - 1, gotD, gotH, gotMin);
    const delta = targetMs - gotMs;
    if (delta === 0) break;
    ms += delta;
  }
  return new Date(ms);
}

export interface DateTimeISTParts {
  day: string;
  date: string;
  time: string;
}

export function formatDateTimeIST(value: string | Date): DateTimeISTParts {
  const d = typeof value === 'string' ? new Date(value) : value;
  const tz = DEFAULT_CLASS_TIMEZONE;
  const day = new Intl.DateTimeFormat('en-IN', { weekday: 'long', timeZone: tz }).format(d);
  const date = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: tz,
  }).format(d);
  const time = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  }).format(d);
  return { day, date, time: `${time} IST` };
}
