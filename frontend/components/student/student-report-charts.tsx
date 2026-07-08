'use client';

import type { StudentProgressReportData, ThemePerformanceRow, WeeklyBucket } from './student-progress-types';

const DIFFICULTY_COLORS = [
  { key: 'beginner', label: 'Beginner', color: 'bg-emerald-500' },
  { key: 'intermediate', label: 'Intermediate', color: 'bg-amber-500' },
  { key: 'advanced', label: 'Advanced', color: 'bg-orange-500' },
  { key: 'expert', label: 'Expert', color: 'bg-rose-500' },
] as const;

function formatThemeLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
}

function accuracyBarColor(pct: number): string {
  if (pct >= 70) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function WeeklyActivityChart({ buckets }: { buckets: WeeklyBucket[] }) {
  if (buckets.length === 0) {
    return <p className="text-sm text-muted-foreground">No weekly data to chart yet.</p>;
  }

  const maxVal = Math.max(...buckets.flatMap((b) => [b.attempts, b.solved]), 1);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-emerald-500" />
          Attempts
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-sky-500" />
          Solved
        </span>
      </div>
      <div className="flex items-end justify-between gap-3" style={{ minHeight: '11rem' }}>
        {buckets.map((week) => (
          <div key={week.start_date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-40 w-full items-end justify-center gap-1.5">
              <div
                className="w-full max-w-[1.75rem] rounded-t-md bg-emerald-500 transition-all"
                style={{ height: `${Math.max((week.attempts / maxVal) * 100, week.attempts > 0 ? 4 : 0)}%` }}
                title={`${week.attempts} attempts`}
              />
              <div
                className="w-full max-w-[1.75rem] rounded-t-md bg-sky-500 transition-all"
                style={{ height: `${Math.max((week.solved / maxVal) * 100, week.solved > 0 ? 4 : 0)}%` }}
                title={`${week.solved} solved`}
              />
            </div>
            <p className="w-full truncate text-center text-[11px] font-medium text-muted-foreground">
              {week.period_label}
            </p>
            <p className="text-[10px] text-muted-foreground">{week.accuracy_pct}% acc.</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeeklyAccuracyLineChart({ buckets }: { buckets: WeeklyBucket[] }) {
  if (buckets.length === 0) {
    return null;
  }

  const width = 100;
  const height = 44;
  const padX = 8;
  const padY = 6;
  const values = buckets.map((b) => b.accuracy_pct);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const span = Math.max(1, max - min);
  const stepX = (width - padX * 2) / Math.max(1, buckets.length - 1);

  const points = buckets
    .map((b, i) => {
      const x = padX + i * stepX;
      const y = padY + (height - padY * 2) * (1 - (b.accuracy_pct - min) / span);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${padX},${height - padY} ${points} ${width - padX},${height - padY}`;

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Weekly accuracy trend</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full overflow-visible">
        <polyline
          points={areaPoints}
          className="fill-emerald-500/15 stroke-none"
        />
        <polyline
          points={points}
          className="fill-none stroke-emerald-600"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {buckets.map((b, i) => {
          const x = padX + i * stepX;
          const y = padY + (height - padY * 2) * (1 - (b.accuracy_pct - min) / span);
          return <circle key={b.start_date} cx={x} cy={y} r="2.2" className="fill-emerald-600" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] font-medium text-muted-foreground">
        <span>{buckets[0]?.period_label}</span>
        <span>{buckets[buckets.length - 1]?.period_label}</span>
      </div>
    </div>
  );
}

export function DifficultyBarChart({ student }: { student: StudentProgressReportData }) {
  const items = DIFFICULTY_COLORS.map((d) => ({
    ...d,
    solved:
      d.key === 'beginner'
        ? student.beginner_solved
        : d.key === 'intermediate'
          ? student.intermediate_solved
          : d.key === 'advanced'
            ? student.advanced_solved
            : student.expert_solved,
  }));
  const max = Math.max(...items.map((i) => i.solved), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.key}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="tabular-nums text-muted-foreground">{item.solved} solved</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${item.color} transition-all`}
              style={{ width: `${(item.solved / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ThemePerformanceChart({ themes }: { themes: ThemePerformanceRow[] }) {
  const top = themes.slice(0, 8);
  if (top.length === 0) {
    return <p className="text-sm text-muted-foreground">No themed puzzle data yet.</p>;
  }

  const maxAttempts = Math.max(...top.map((t) => t.attempts), 1);

  return (
    <div className="space-y-3">
      {top.map((theme) => (
        <div key={theme.theme_key}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-medium capitalize text-foreground">
              {formatThemeLabel(theme.theme_key)}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {theme.accuracy_pct}% · {theme.attempts} tries
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${accuracyBarColor(theme.accuracy_pct)} transition-all`}
              style={{ width: `${(theme.attempts / maxAttempts) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PerformanceOverviewChart({ student }: { student: StudentProgressReportData }) {
  const solved = student.total_puzzles_solved;
  const missed = Math.max(student.total_puzzles_attempted - student.total_puzzles_solved, 0);
  const total = Math.max(solved + missed, 1);
  const solvedPct = (solved / total) * 100;
  const gamesLost = Math.max(student.games_played - student.games_won, 0);

  const ring = 36;
  const circumference = 2 * Math.PI * ring;
  const strokeDash = (student.success_rate / 100) * circumference;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-muted/20 p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Puzzle success rate</p>
        <svg viewBox="0 0 96 96" className="h-28 w-28">
          <circle
            cx="48"
            cy="48"
            r={ring}
            className="fill-none stroke-muted"
            strokeWidth="8"
          />
          <circle
            cx="48"
            cy="48"
            r={ring}
            className="fill-none stroke-emerald-500"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            transform="rotate(-90 48 48)"
          />
          <text
            x="48"
            y="52"
            textAnchor="middle"
            className="fill-foreground text-lg font-bold"
            fontSize="16"
          >
            {student.success_rate}%
          </text>
        </svg>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {solved} solved / {student.total_puzzles_attempted} attempted
        </p>
      </div>

      <div className="flex flex-col justify-center gap-4 rounded-xl border border-border/80 bg-muted/20 p-4">
        <p className="text-sm font-semibold text-foreground">Activity split</p>
        <div>
          <div className="mb-1 flex justify-between text-xs font-medium text-muted-foreground">
            <span>Puzzles solved</span>
            <span>{Math.round(solvedPct)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${solvedPct}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs font-medium text-muted-foreground">
            <span>Games won</span>
            <span>{student.game_win_rate}%</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-sky-500"
              style={{ width: `${student.games_played ? (student.games_won / student.games_played) * 100 : 0}%` }}
            />
            <div
              className="h-full bg-slate-300"
              style={{ width: `${student.games_played ? (gamesLost / student.games_played) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {student.games_won} wins · {gamesLost} losses/draws
          </p>
        </div>
      </div>
    </div>
  );
}
