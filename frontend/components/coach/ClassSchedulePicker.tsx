'use client';

import { useMemo } from 'react';
import { batchRecurringDays } from '@/lib/coach-schedule';
import {
  CLASS_TIMEZONE_OPTIONS,
  DEFAULT_CLASS_TIMEZONE,
  getHourOptions,
  getMinuteOptions,
  time12To24,
  time24To12,
  type Time12Parts,
} from '@/lib/class-time';

const WEEKDAY_OPTIONS = [
  { dow: 1, label: 'Mon' },
  { dow: 2, label: 'Tue' },
  { dow: 3, label: 'Wed' },
  { dow: 4, label: 'Thu' },
  { dow: 5, label: 'Fri' },
  { dow: 6, label: 'Sat' },
  { dow: 0, label: 'Sun' },
];

export interface ClassScheduleValue {
  schedule_weekdays: number[];
  schedule_time: string;
  schedule_timezone: string;
  default_duration_minutes: number;
  default_meeting_link: string;
}

export function emptyScheduleValue(): ClassScheduleValue {
  return {
    schedule_weekdays: [],
    schedule_time: '17:00',
    schedule_timezone: DEFAULT_CLASS_TIMEZONE,
    default_duration_minutes: 60,
    default_meeting_link: '',
  };
}

interface ClassSchedulePickerProps {
  value: ClassScheduleValue;
  onChange: (value: ClassScheduleValue) => void;
  showMeetingLink?: boolean;
  compact?: boolean;
}

export function batchToScheduleValue(batch: {
  schedule_weekdays?: string | null;
  schedule_time?: string | null;
  schedule_timezone?: string | null;
  default_duration_minutes?: number | null;
  default_meeting_link?: string | null;
  schedule?: string | null;
}): ClassScheduleValue {
  const days = batchRecurringDays(batch as import('@/lib/api').Batch);
  return {
    schedule_weekdays: days,
    schedule_time: batch.schedule_time ?? '',
    schedule_timezone: batch.schedule_timezone ?? DEFAULT_CLASS_TIMEZONE,
    default_duration_minutes: batch.default_duration_minutes ?? 60,
    default_meeting_link: batch.default_meeting_link ?? '',
  };
}

function Time12Picker({
  time24,
  onChange24,
}: {
  time24: string;
  onChange24: (hhmm: string) => void;
}) {
  const parts = useMemo(() => time24To12(time24), [time24]);

  const update = (patch: Partial<Time12Parts>) => {
    const next: Time12Parts = { ...parts, ...patch };
    onChange24(time12To24(next));
  };

  const selectClass =
    'rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Hour"
        value={parts.hour}
        onChange={(e) => update({ hour: parseInt(e.target.value, 10) })}
        className={`${selectClass} min-w-[4.5rem]`}
      >
        {getHourOptions().map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-sm font-semibold text-muted-foreground">:</span>
      <select
        aria-label="Minute"
        value={parts.minute}
        onChange={(e) => update({ minute: parseInt(e.target.value, 10) })}
        className={`${selectClass} min-w-[4.5rem]`}
      >
        {getMinuteOptions().map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, '0')}
          </option>
        ))}
      </select>
      <select
        aria-label="AM or PM"
        value={parts.period}
        onChange={(e) => update({ period: e.target.value as 'AM' | 'PM' })}
        className={`${selectClass} min-w-[5.5rem]`}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

export function ClassSchedulePicker({
  value,
  onChange,
  showMeetingLink = true,
  compact = false,
}: ClassSchedulePickerProps) {
  const toggleDay = (dow: number) => {
    const has = value.schedule_weekdays.includes(dow);
    const next = has
      ? value.schedule_weekdays.filter((d) => d !== dow)
      : [...value.schedule_weekdays, dow].sort((a, b) => a - b);
    onChange({ ...value, schedule_weekdays: next });
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Repeats every week
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_OPTIONS.map(({ dow, label }) => {
            const active = value.schedule_weekdays.includes(dow);
            return (
              <button
                key={dow}
                type="button"
                onClick={() => toggleDay(dow)}
                className={`min-w-[44px] rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:bg-muted/60'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
        <div className="sm:col-span-2 md:col-span-1">
          <label className="mb-1 block text-sm font-semibold text-foreground">Class time</label>
          <Time12Picker
            time24={value.schedule_time}
            onChange24={(schedule_time) => onChange({ ...value, schedule_time })}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            12-hour clock — blocks this slot on your calendar every selected day.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">Timezone</label>
          <select
            value={value.schedule_timezone}
            onChange={(e) => onChange({ ...value, schedule_timezone: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CLASS_TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Default is India Standard Time (IST). Change if you teach students in another region.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">Duration (minutes)</label>
          <input
            type="number"
            min={15}
            step={15}
            value={value.default_duration_minutes}
            onChange={(e) =>
              onChange({
                ...value,
                default_duration_minutes: parseInt(e.target.value, 10) || 60,
              })
            }
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {showMeetingLink && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-foreground">
              Default Zoom link
            </label>
            <input
              type="url"
              value={value.default_meeting_link}
              onChange={(e) => onChange({ ...value, default_meeting_link: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="https://zoom.us/j/…"
            />
          </div>
        )}
      </div>
    </div>
  );
}
