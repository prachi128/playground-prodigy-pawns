'use client';

import { BarChart3, TrendingUp } from 'lucide-react';
import type { StudentProgressReportData } from './student-progress-types';
import {
  DifficultyBarChart,
  PerformanceOverviewChart,
  ThemePerformanceChart,
  WeeklyAccuracyLineChart,
  WeeklyActivityChart,
} from './student-report-charts';

export type {
  StudentProgressReportData,
  ThemePerformanceRow,
  WeeklyBucket,
} from './student-progress-types';

const WEEKLY_TREND_LABELS: Record<string, string> = {
  improving: 'Improving vs prior week',
  stable: 'Roughly stable',
  declining: 'Needs extra support',
  insufficient_data: 'Not enough data yet',
};

const row = 'flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0';
const label = 'text-muted-foreground';
const value = 'text-right font-medium tabular-nums text-foreground';

interface StudentProgressReportProps {
  student: StudentProgressReportData;
  batchName?: string | null;
  reportLabel?: string;
  generatedAt?: Date;
}

export function StudentProgressReport({
  student,
  batchName,
  reportLabel = 'Prodigy Pawns — Progress report',
  generatedAt = new Date(),
}: StudentProgressReportProps) {
  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div>
      <header className="mb-8 border-b border-border pb-6">
        <p className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {reportLabel}
        </p>
        {student.is_active === false && (
          <p className="mt-3 rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground print:border-foreground/20">
            Account status: <span className="font-semibold">deactivated</span> (historical snapshot)
          </p>
        )}
        <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Student progress report
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generated{' '}
          {generatedAt.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="font-heading text-lg font-bold text-foreground">Student</h3>
        <dl className="mt-4 space-y-0">
          <div className={row}>
            <dt className={label}>Username</dt>
            <dd className={value}>{student.username}</dd>
          </div>
          <div className={row}>
            <dt className={label}>Email</dt>
            <dd className={`${value} break-all`}>{student.email}</dd>
          </div>
          {batchName ? (
            <div className={row}>
              <dt className={label}>Batch</dt>
              <dd className={value}>{batchName}</dd>
            </div>
          ) : null}
          <div className={row}>
            <dt className={label}>Member since</dt>
            <dd className={value}>{fmtDate(student.created_at)}</dd>
          </div>
          <div className={row}>
            <dt className={label}>Last activity</dt>
            <dd className={value}>{fmtDate(student.last_active)}</dd>
          </div>
          <div className={row}>
            <dt className={label}>Days since active</dt>
            <dd className={value}>{student.days_since_active}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="font-heading text-lg font-bold text-foreground">Performance</h3>
        <dl className="mt-4 space-y-0">
          <div className={row}>
            <dt className={label}>Total XP</dt>
            <dd className={value}>{student.xp.toLocaleString()}</dd>
          </div>
          <div className={row}>
            <dt className={label}>XP this week</dt>
            <dd className={value}>{student.xp_this_week.toLocaleString()}</dd>
          </div>
          <div className={row}>
            <dt className={label}>Puzzles attempted</dt>
            <dd className={value}>{student.total_puzzles_attempted.toLocaleString()}</dd>
          </div>
          <div className={row}>
            <dt className={label}>Puzzles solved</dt>
            <dd className={value}>{student.total_puzzles_solved.toLocaleString()}</dd>
          </div>
          <div className={row}>
            <dt className={label}>Success rate</dt>
            <dd className={value}>{student.success_rate}%</dd>
          </div>
          <div className={row}>
            <dt className={label}>Attempts this week</dt>
            <dd className={value}>{student.puzzles_this_week.toLocaleString()}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm print:break-inside-avoid">
        <h3 className="font-heading flex items-center gap-2 text-lg font-bold text-foreground">
          <BarChart3 className="h-5 w-5 text-emerald-600" />
          Analysis charts
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Visual summary of puzzle practice, accuracy, and game results.
        </p>
        <div className="mt-6">
          <PerformanceOverviewChart student={student} />
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm print:break-inside-avoid">
        <h3 className="font-heading flex items-center gap-2 text-lg font-bold text-foreground">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          Weekly puzzle activity
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Trend:{' '}
          <span className="font-semibold text-foreground">
            {student.weekly_trend
              ? WEEKLY_TREND_LABELS[student.weekly_trend] ?? student.weekly_trend
              : '—'}
          </span>
        </p>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <WeeklyActivityChart buckets={student.weekly_buckets ?? []} />
          <WeeklyAccuracyLineChart buckets={student.weekly_buckets ?? []} />
        </div>
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2 print:break-inside-avoid">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-heading text-lg font-bold text-foreground">Solved by difficulty</h3>
          <div className="mt-4">
            <DifficultyBarChart student={student} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-heading text-lg font-bold text-foreground">Top puzzle topics</h3>
          <p className="mt-1 text-sm text-muted-foreground">Bar length = attempts; color reflects accuracy.</p>
          <div className="mt-4">
            <ThemePerformanceChart themes={student.theme_performance ?? []} />
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm print:break-inside-avoid">
        <h3 className="font-heading text-lg font-bold text-foreground">Game performance</h3>
        <dl className="mt-4 space-y-0">
          <div className={row}>
            <dt className={label}>Games played</dt>
            <dd className={value}>{student.games_played.toLocaleString()}</dd>
          </div>
          <div className={row}>
            <dt className={label}>Games won</dt>
            <dd className={value}>{student.games_won.toLocaleString()}</dd>
          </div>
          <div className={row}>
            <dt className={label}>Game win rate</dt>
            <dd className={value}>{student.game_win_rate}%</dd>
          </div>
          <div className={row}>
            <dt className={label}>Games this week</dt>
            <dd className={value}>{student.games_this_week.toLocaleString()}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
