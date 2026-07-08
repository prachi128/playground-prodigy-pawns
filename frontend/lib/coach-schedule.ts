import type { Batch, CoachUpcomingClass } from '@/lib/api';
import {
  DEFAULT_CLASS_TIMEZONE,
  formatScheduleTimeDisplay,
  parseTime24,
  wallTimeInZoneToDate,
} from '@/lib/class-time';

const DAY_TOKEN_TO_DOW: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function parseBatchWeekdays(value?: string | null): number[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
}

function daysMentionedInSchedule(schedule: string): number[] {
  const lower = schedule.toLowerCase();
  const found = new Set<number>();
  const tokens = lower.split(/[^a-z]+/).filter(Boolean);
  for (const token of tokens) {
    const dow = DAY_TOKEN_TO_DOW[token];
    if (dow !== undefined) found.add(dow);
  }
  return [...found].sort((a, b) => a - b);
}

export function batchRecurringDays(batch: Batch): number[] {
  const fromField = parseBatchWeekdays(batch.schedule_weekdays);
  if (fromField.length > 0) return fromField;
  if (batch.schedule?.trim()) return daysMentionedInSchedule(batch.schedule);
  return [];
}

export function formatScheduleTimeLabel(
  time?: string | null,
  timeZone: string = DEFAULT_CLASS_TIMEZONE,
): string | null {
  return formatScheduleTimeDisplay(time, timeZone);
}

function scheduleTimeSortKey(time?: string | null): number {
  if (!time?.trim()) return 0;
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (Number.isNaN(h)) return 0;
  return h * 60 + m;
}

export function batchScheduleLabel(batch: Batch): string | null {
  if (batch.schedule?.trim()) return batch.schedule.trim();
  const days = batchRecurringDays(batch);
  if (days.length === 0) return null;
  const dayPart = days.map((d) => WEEKDAY_SHORT[d]).join(' / ');
  const tz = batch.schedule_timezone ?? DEFAULT_CLASS_TIMEZONE;
  const timePart = formatScheduleTimeLabel(batch.schedule_time, tz);
  return timePart ? `${dayPart} · ${timePart}` : dayPart;
}

export interface BatchScheduleHint {
  batch: Batch;
  schedule: string;
  meetsToday: boolean;
  nextDayLabel: string | null;
}

export function getBatchScheduleHints(batches: Batch[], now = new Date()): BatchScheduleHint[] {
  const todayDow = now.getDay();
  const hints: BatchScheduleHint[] = [];

  for (const batch of batches) {
    if (!batch.is_active) continue;
    const days = batchRecurringDays(batch);
    if (days.length === 0) continue;
    const schedule = batchScheduleLabel(batch) ?? '';

    const meetsToday = days.includes(todayDow);
    let nextDayLabel: string | null = null;
    if (!meetsToday) {
      for (let offset = 1; offset <= 7; offset++) {
        const dow = (todayDow + offset) % 7;
        if (days.includes(dow)) {
          nextDayLabel = WEEKDAY_LABELS[dow];
          break;
        }
      }
    }

    hints.push({ batch, schedule, meetsToday, nextDayLabel });
  }

  return hints.sort((a, b) => {
    if (a.meetsToday !== b.meetsToday) return a.meetsToday ? -1 : 1;
    return a.batch.name.localeCompare(b.batch.name);
  });
}

export function batchesMeetingToday(batches: Batch[], now = new Date()): BatchScheduleHint[] {
  return getBatchScheduleHints(batches, now).filter((h) => h.meetsToday);
}

export type WeekScheduleItemType = 'recurring' | 'session';

export interface WeekScheduleItem {
  type: WeekScheduleItemType;
  batchId: number;
  batchName: string;
  label: string;
  timeLabel: string | null;
  sessionId?: number;
  meetingLink?: string;
  href: string;
  sortKey: number;
}

export interface WeekDayColumn {
  date: Date;
  dayOfWeek: number;
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
  isPast: boolean;
  items: WeekScheduleItem[];
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function mondayOfWeekContaining(date: Date): Date {
  const d = startOfDay(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function sessionSortKey(iso: string): number {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function buildCoachWeekSchedule(
  batches: Batch[],
  upcomingClasses: CoachUpcomingClass[],
  now = new Date(),
): WeekDayColumn[] {
  const today = startOfDay(now);
  const weekStart = mondayOfWeekContaining(now);
  const activeBatches = batches.filter((b) => b.is_active);

  const columns: WeekDayColumn[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dayOfWeek = date.getDay();
    const items: WeekScheduleItem[] = [];

    for (const batch of activeBatches) {
      const days = batchRecurringDays(batch);
      if (!days.includes(dayOfWeek)) continue;
      const timeLabel = formatScheduleTimeLabel(
        batch.schedule_time,
        batch.schedule_timezone ?? DEFAULT_CLASS_TIMEZONE,
      );
      items.push({
        type: 'recurring',
        batchId: batch.id,
        batchName: batch.name,
        label: batchScheduleLabel(batch) ?? 'Weekly class',
        timeLabel,
        meetingLink: batch.default_meeting_link ?? undefined,
        href: `/coach/batches/${batch.id}?tab=classes`,
        sortKey: scheduleTimeSortKey(batch.schedule_time),
      });
    }

    for (const session of upcomingClasses) {
      const sessionDate = new Date(session.date);
      if (Number.isNaN(sessionDate.getTime())) continue;
      if (!isSameCalendarDay(sessionDate, date)) continue;

      const timeLabel = formatSessionTime(session.date);
      const isMakeup = session.session_kind === 'makeup';
      items.push({
        type: 'session',
        batchId: session.batch_id,
        batchName: session.batch_name ?? 'Class',
        label: isMakeup
          ? `Make-up · ${session.topic?.trim() || 'Session'}`
          : session.topic?.trim() || 'Scheduled session',
        timeLabel,
        sessionId: session.id,
        meetingLink: session.meeting_link,
        href: `/coach/batches/${session.batch_id}?tab=classes&session=${session.id}`,
        sortKey: sessionSortKey(session.date),
      });
    }

    items.sort((a, b) => a.sortKey - b.sortKey || a.batchName.localeCompare(b.batchName));

    columns.push({
      date,
      dayOfWeek,
      dayLabel: WEEKDAY_SHORT[dayOfWeek],
      dateLabel: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      isToday: isSameCalendarDay(date, today),
      isPast: date < today,
      items,
    });
  }

  return columns;
}

export interface DashboardNextClass {
  batchId: number;
  batchName: string;
  topic?: string;
  meetingLink?: string;
  startsAt: Date;
  durationMinutes?: number;
}

function ymdInTimezone(d: Date, timeZone: string): { year: number; month: number; day: number } {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const [year, month, day] = iso.split('-').map((n) => parseInt(n, 10));
  return { year, month, day };
}

function dayOfWeekInTimezone(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): number {
  const noon = wallTimeInZoneToDate(year, month, day, 12, 0, timeZone);
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(noon);
  return DAY_TOKEN_TO_DOW[short.toLowerCase()] ?? noon.getDay();
}

function getNextRecurringForBatch(batch: Batch, now: Date): DashboardNextClass | null {
  const days = batchRecurringDays(batch);
  const timeParts = parseTime24(batch.schedule_time);
  if (days.length === 0 || !timeParts) return null;

  const tz = batch.schedule_timezone ?? DEFAULT_CLASS_TIMEZONE;
  const anchor = ymdInTimezone(now, tz);

  for (let offset = 0; offset < 28; offset++) {
    const probe = new Date(Date.UTC(anchor.year, anchor.month - 1, anchor.day + offset));
    const y = probe.getUTCFullYear();
    const m = probe.getUTCMonth() + 1;
    const d = probe.getUTCDate();
    const dow = dayOfWeekInTimezone(y, m, d, tz);
    if (!days.includes(dow)) continue;

    const startsAt = wallTimeInZoneToDate(y, m, d, timeParts.hour, timeParts.minute, tz);
    if (startsAt >= now) {
      return {
        batchId: batch.id,
        batchName: batch.name,
        meetingLink: batch.default_meeting_link ?? undefined,
        startsAt,
        durationMinutes: batch.default_duration_minutes ?? undefined,
      };
    }
  }
  return null;
}

/** Earliest upcoming class from scheduled sessions, or next recurring batch slot. */
export function getNextDashboardClass(
  batches: Batch[],
  upcomingClasses: CoachUpcomingClass[],
  now = new Date(),
): DashboardNextClass | null {
  let best: DashboardNextClass | null = null;

  for (const session of upcomingClasses) {
    const startsAt = new Date(session.date);
    if (Number.isNaN(startsAt.getTime()) || startsAt < now) continue;
    const candidate: DashboardNextClass = {
      batchId: session.batch_id,
      batchName: session.batch_name ?? 'Class',
      topic: session.topic,
      meetingLink: session.meeting_link,
      startsAt,
      durationMinutes: session.duration_minutes,
    };
    if (!best || candidate.startsAt < best.startsAt) {
      best = candidate;
    }
  }

  for (const batch of batches) {
    if (!batch.is_active) continue;
    const candidate = getNextRecurringForBatch(batch, now);
    if (!candidate) continue;
    if (!best || candidate.startsAt < best.startsAt) {
      best = candidate;
    }
  }

  return best;
}

export function upcomingSessionsInRange(
  upcomingClasses: CoachUpcomingClass[],
  days = 14,
  now = new Date(),
): CoachUpcomingClass[] {
  const start = startOfDay(now);
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  return upcomingClasses
    .filter((c) => {
      const d = new Date(c.date);
      if (Number.isNaN(d.getTime())) return false;
      return d >= start && d < end;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
