'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  coachAPI,
  type StudentActivityPresetDays,
  type StudentActivityQuery,
  type StudentActivityResponse,
} from '@/lib/api';

const PRESET_RANGES: { days: StudentActivityPresetDays; label: string }[] = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultCustomRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

function formatBucketLabel(dateIso: string, bucketCount: number): string {
  const d = new Date(`${dateIso}T12:00:00`);
  if (bucketCount <= 14) {
    return d.toLocaleDateString('en-IN', { weekday: 'short' });
  }
  if (bucketCount <= 60) {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function labelStep(bucketCount: number): number {
  if (bucketCount <= 14) return 1;
  if (bucketCount <= 31) return 5;
  if (bucketCount <= 90) return 7;
  if (bucketCount <= 180) return 14;
  return Math.max(1, Math.ceil(bucketCount / 12));
}

function shouldShowLabel(index: number, total: number): boolean {
  const step = labelStep(total);
  return index % step === 0 || index === total - 1;
}

function chartLayout(bucketCount: number): { scrollable: boolean; barWidthPx: number; height: string } {
  if (bucketCount <= 31) {
    return { scrollable: false, barWidthPx: 0, height: bucketCount <= 7 ? '8rem' : '7rem' };
  }
  const barWidthPx = bucketCount <= 90 ? 10 : 8;
  return { scrollable: true, barWidthPx, height: '7rem' };
}

interface BarChartProps {
  title: string;
  subtitle: string;
  buckets: StudentActivityResponse['buckets'];
  getValue: (b: StudentActivityResponse['buckets'][number]) => number;
  total: number;
  unitLabel: string;
  rangeLabel: string;
  totalClassName?: string;
  summaryExtra?: ReactNode;
  renderBar: (
    bucket: StudentActivityResponse['buckets'][number],
    index: number,
    max: number,
    layout: ReturnType<typeof chartLayout>,
  ) => ReactNode;
}

function ActivityBarChart({
  title,
  subtitle,
  buckets,
  getValue,
  total,
  unitLabel,
  rangeLabel,
  totalClassName = 'coach-text-link',
  summaryExtra,
  renderBar,
}: BarChartProps) {
  const layout = chartLayout(buckets.length);
  const max = useMemo(() => Math.max(1, ...buckets.map(getValue)), [buckets, getValue]);

  const chartInner = (
    <div
      className={`flex items-end gap-px sm:gap-0.5 ${layout.scrollable ? '' : 'w-full'}`}
      style={{
        height: layout.height,
        minWidth: layout.scrollable ? `${buckets.length * layout.barWidthPx}px` : undefined,
      }}
      role="img"
      aria-label={`${title}: ${total} ${unitLabel} — ${rangeLabel}`}
    >
      {buckets.map((bucket, i) => renderBar(bucket, i, max, layout))}
    </div>
  );

  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <p className="text-sm font-semibold">
          <span className={totalClassName}>{total}</span>{' '}
          <span className="text-muted-foreground">{unitLabel}</span>
          {summaryExtra}
        </p>
      </div>

      {total === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No activity in this period.</p>
      ) : layout.scrollable ? (
        <div className="overflow-x-auto pb-1">{chartInner}</div>
      ) : (
        chartInner
      )}
    </div>
  );
}

type RangeSelection =
  | { mode: 'preset'; days: StudentActivityPresetDays }
  | { mode: 'custom'; startDate: string; endDate: string };

function formatRangeCaption(data: StudentActivityResponse | null): string {
  if (!data?.start_date || !data?.end_date) return '';
  const start = new Date(`${data.start_date}T12:00:00`);
  const end = new Date(`${data.end_date}T12:00:00`);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

interface StudentActivityChartsProps {
  studentId: number;
}

export default function StudentActivityCharts({ studentId }: StudentActivityChartsProps) {
  const initialCustom = defaultCustomRange();
  const [selection, setSelection] = useState<RangeSelection>({ mode: 'preset', days: 7 });
  const [customDraft, setCustomDraft] = useState(initialCustom);
  const [data, setData] = useState<StudentActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const presetDays = selection.mode === 'preset' ? selection.days : null;
  const customStart = selection.mode === 'custom' ? selection.startDate : null;
  const customEnd = selection.mode === 'custom' ? selection.endDate : null;

  useEffect(() => {
    const query: StudentActivityQuery =
      presetDays != null
        ? { days: presetDays }
        : { startDate: customStart!, endDate: customEnd! };

    let cancelled = false;
    setLoading(true);
    setError(false);
    coachAPI
      .getStudentActivity(studentId, query)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, presetDays, customStart, customEnd]);

  const buckets = data?.buckets ?? [];
  const totals = data?.totals ?? { games: 0, puzzle_attempts: 0, puzzles_solved: 0 };
  const rangeLabel = formatRangeCaption(data);

  const applyCustomRange = () => {
    if (!customDraft.startDate || !customDraft.endDate) return;
    if (customDraft.endDate < customDraft.startDate) return;
    setSelection({ mode: 'custom', ...customDraft });
  };

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Daily activity — games played and puzzles attempted.
            {rangeLabel ? (
              <span className="mt-0.5 block text-xs text-muted-foreground/80">{rangeLabel}</span>
            ) : null}
          </p>
          <div
            className="inline-flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5"
            role="group"
            aria-label="Activity time range"
          >
            {PRESET_RANGES.map(({ days, label }) => (
              <button
                key={days}
                type="button"
                onClick={() => setSelection({ mode: 'preset', days })}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 ${
                  selection.mode === 'preset' && selection.days === days
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setCustomDraft(defaultCustomRange());
                setSelection({ mode: 'custom', ...defaultCustomRange() });
              }}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 ${
                selection.mode === 'custom'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {selection.mode === 'custom' && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/20 p-3">
            <label className="text-xs font-medium text-muted-foreground">
              From
              <input
                type="date"
                value={customDraft.startDate}
                max={customDraft.endDate || undefined}
                onChange={(e) => setCustomDraft((d) => ({ ...d, startDate: e.target.value }))}
                className="mt-1 block rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              To
              <input
                type="date"
                value={customDraft.endDate}
                min={customDraft.startDate || undefined}
                max={isoDate(new Date())}
                onChange={(e) => setCustomDraft((d) => ({ ...d, endDate: e.target.value }))}
                className="mt-1 block rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <button
              type="button"
              onClick={applyCustomRange}
              disabled={
                !customDraft.startDate ||
                !customDraft.endDate ||
                customDraft.endDate < customDraft.startDate
              }
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Apply
            </button>
            <p className="w-full text-[11px] text-muted-foreground">Up to 366 days.</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        </div>
      ) : error ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Could not load activity data.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ActivityBarChart
            title="Games"
            subtitle="Games started each day"
            buckets={buckets}
            getValue={(b) => b.games}
            total={totals.games}
            unitLabel={totals.games === 1 ? 'game' : 'games'}
            rangeLabel={rangeLabel}
            renderBar={(bucket, i, max, layout) => {
              const value = bucket.games;
              const heightPct = value > 0 ? Math.max(8, (value / max) * 100) : 0;
              const label = formatBucketLabel(bucket.date, buckets.length);
              return (
                <div
                  key={bucket.date}
                  className="group relative flex flex-col items-center justify-end"
                  style={
                    layout.scrollable
                      ? { width: layout.barWidthPx, flexShrink: 0 }
                      : { flex: 1 }
                  }
                  title={`${label}: ${value}`}
                >
                  <div
                    className={`w-full max-w-[2rem] rounded-t-sm bg-[hsl(var(--blue-dark))] transition-all ${
                      value === 0 ? 'opacity-25' : ''
                    }`}
                    style={{ height: `${heightPct}%`, minHeight: value > 0 ? '4px' : 0 }}
                  />
                  {shouldShowLabel(i, buckets.length) && (
                    <span className="mt-1.5 max-w-full truncate text-[10px] text-muted-foreground">
                      {label}
                    </span>
                  )}
                </div>
              );
            }}
          />
          <ActivityBarChart
            title="Puzzles"
            subtitle="Attempts per day (solved portion highlighted)"
            buckets={buckets}
            getValue={(b) => b.puzzle_attempts}
            total={totals.puzzle_attempts}
            unitLabel={totals.puzzle_attempts === 1 ? 'attempt' : 'attempts'}
            totalClassName="coach-text-warning"
            rangeLabel={rangeLabel}
            summaryExtra={
              totals.puzzles_solved > 0 ? (
                <span className="font-normal text-muted-foreground">
                  {' '}
                  · <span className="coach-text-success">{totals.puzzles_solved} solved</span>
                </span>
              ) : undefined
            }
            renderBar={(bucket, i, max, layout) => {
              const attempts = bucket.puzzle_attempts;
              const solved = bucket.puzzles_solved;
              const heightPct = attempts > 0 ? Math.max(8, (attempts / max) * 100) : 0;
              const solvedPct = attempts > 0 ? (solved / attempts) * 100 : 0;
              const label = formatBucketLabel(bucket.date, buckets.length);
              return (
                <div
                  key={bucket.date}
                  className="group relative flex flex-col items-center justify-end"
                  style={
                    layout.scrollable
                      ? { width: layout.barWidthPx, flexShrink: 0 }
                      : { flex: 1 }
                  }
                  title={`${label}: ${attempts} attempts, ${solved} solved`}
                >
                  <div
                    className={`relative w-full max-w-[2rem] overflow-hidden rounded-t-sm bg-[hsl(var(--gold-light))] ${
                      attempts === 0 ? 'opacity-25' : ''
                    }`}
                    style={{ height: `${heightPct}%`, minHeight: attempts > 0 ? '4px' : 0 }}
                  >
                    {solved > 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-[hsl(var(--green-medium))]"
                        style={{ height: `${solvedPct}%` }}
                      />
                    )}
                  </div>
                  {shouldShowLabel(i, buckets.length) && (
                    <span className="mt-1.5 max-w-full truncate text-[10px] text-muted-foreground">
                      {label}
                    </span>
                  )}
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
