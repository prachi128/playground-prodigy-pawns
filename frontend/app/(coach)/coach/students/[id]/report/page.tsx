// Printable progress report for a student (opened from student detail "Generate Report")

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { batchAPI, type Batch } from '@/lib/api';

interface ThemePerformanceRow {
  theme_key: string;
  attempts: number;
  solved: number;
  accuracy_pct: number;
}

interface WeeklyBucket {
  period_label: string;
  start_date: string;
  attempts: number;
  solved: number;
  accuracy_pct: number;
}

interface StudentDetails {
  id: number;
  username: string;
  email: string;
  xp: number;
  created_at: string;
  last_active: string;
  total_puzzles_attempted: number;
  total_puzzles_solved: number;
  success_rate: number;
  beginner_solved: number;
  intermediate_solved: number;
  advanced_solved: number;
  expert_solved: number;
  puzzles_this_week: number;
  xp_this_week: number;
  games_played: number;
  games_won: number;
  game_win_rate: number;
  games_this_week: number;
  days_since_active: number;
  is_active?: boolean;
  theme_performance?: ThemePerformanceRow[];
  weekly_buckets?: WeeklyBucket[];
  weekly_trend?: string;
}

const WEEKLY_TREND_LABELS: Record<string, string> = {
  improving: 'Improving vs prior week',
  stable: 'Roughly stable',
  declining: 'Needs extra support',
  insufficient_data: 'Not enough data yet',
};

function formatThemeLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
}

const row = 'flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0';
const label = 'text-muted-foreground';
const value = 'text-right font-medium tabular-nums text-foreground';

export default function StudentReportPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = parseInt(params.id as string, 10);
  const { isAuthenticated, user } = useAuthStore();

  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [batchName, setBatchName] = useState<string | null>(null);
  const [generatedAt] = useState(() => new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coach' && user?.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }
    if (Number.isNaN(studentId)) {
      router.push('/coach/students');
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const studentPromise = api.get(`/api/coach/students/${studentId}`);
        const batchesPromise = batchAPI.list().catch(() => [] as Batch[]);
        const [res, batches] = await Promise.all([studentPromise, batchesPromise]);
        if (cancelled) return;
        setStudent(res.data);

        let found: string | null = null;
        if (batches.length > 0) {
          const settled = await Promise.allSettled(
            batches.map(async (b) => {
              const list = await batchAPI.listStudents(b.id);
              return { batch: b, list };
            }),
          );
          for (const r of settled) {
            if (
              r.status === 'fulfilled' &&
              r.value.list.some((row) => row.student_id === studentId)
            ) {
              found = r.value.batch.name;
              break;
            }
          }
        }
        if (!cancelled) setBatchName(found);
      } catch {
        if (!cancelled) {
          toast.error('Failed to load report');
          router.push('/coach/students');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, router, studentId]);

  if (loading || !student) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading report…</p>
        </div>
      </div>
    );
  }

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
    <>
      <style>{`
        @media print {
          [data-coach-shell] aside,
          [data-coach-shell] .coach-header-bar {
            display: none !important;
          }
          [data-coach-shell] .lg\\:pl-44,
          [data-coach-shell] .lg\\:pl-16 {
            padding-left: 0 !important;
          }
          [data-coach-shell] .max-w-7xl {
            max-width: 100% !important;
          }
        }
      `}</style>

      <div>
        <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
          <Link
            href={`/coach/students/${studentId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </button>
        </div>

        <header className="mb-8 border-b border-border pb-6">
          <p className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Prodigy Pawns — Coach report
          </p>
          {student.is_active === false && (
            <p className="mt-3 rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground print:border-foreground/20">
              Account status: <span className="font-semibold">deactivated</span> (historical snapshot)
            </p>
          )}
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Student progress report
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generated{' '}
            {generatedAt.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </header>

        <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-lg font-bold text-foreground">Student</h2>
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
          <h2 className="font-heading text-lg font-bold text-foreground">Performance</h2>
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
          <h2 className="font-heading text-lg font-bold text-foreground">Game performance</h2>
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

        <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm print:break-inside-avoid">
          <h2 className="font-heading text-lg font-bold text-foreground">Recent weeks (puzzles)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trend:{' '}
            <span className="font-semibold text-foreground">
              {student.weekly_trend
                ? WEEKLY_TREND_LABELS[student.weekly_trend] ?? student.weekly_trend
                : '—'}
            </span>
          </p>
          {(student.weekly_buckets?.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No weekly breakdown.</p>
          ) : (
            <dl className="mt-4 space-y-0">
              {(student.weekly_buckets ?? []).map((w) => (
                <div key={w.start_date} className={row}>
                  <dt className={label}>{w.period_label}</dt>
                  <dd className={value}>
                    {w.attempts} attempts, {w.solved} solved ({w.accuracy_pct}%)
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm print:break-inside-avoid">
          <h2 className="font-heading text-lg font-bold text-foreground">Top puzzle topics</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            By number of attempts (shows where practice time went).
          </p>
          {(student.theme_performance?.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No themed data yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-semibold">Topic</th>
                    <th className="py-2 pr-4 font-semibold">Attempts</th>
                    <th className="py-2 pr-4 font-semibold">Solved</th>
                    <th className="py-2 font-semibold">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {(student.theme_performance ?? []).slice(0, 12).map((t) => (
                    <tr key={t.theme_key} className="border-b border-border/60">
                      <td className="py-2 pr-4 capitalize">{formatThemeLabel(t.theme_key)}</td>
                      <td className="py-2 pr-4 tabular-nums">{t.attempts}</td>
                      <td className="py-2 pr-4 tabular-nums">{t.solved}</td>
                      <td className="py-2 tabular-nums">{t.accuracy_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-lg font-bold text-foreground">Solved by difficulty</h2>
          <dl className="mt-4 space-y-0">
            <div className={row}>
              <dt className={label}>Beginner</dt>
              <dd className={value}>{student.beginner_solved}</dd>
            </div>
            <div className={row}>
              <dt className={label}>Intermediate</dt>
              <dd className={value}>{student.intermediate_solved}</dd>
            </div>
            <div className={row}>
              <dt className={label}>Advanced</dt>
              <dd className={value}>{student.advanced_solved}</dd>
            </div>
            <div className={row}>
              <dt className={label}>Expert</dt>
              <dd className={value}>{student.expert_solved}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
