// app/(coach)/coach/page.tsx - Coach Dashboard Main Page

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
  BarChart3,
  TrendingUp,
  Target,
  Trophy,
  Users,
  Layers,
  Loader2,
  ListChecks,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCoachStats } from '@/contexts/coach-stats-context';
import { adminAPI, coachAPI, type AdminOperationalMetrics, type CoachPriorities } from '@/lib/api';

function formatStat(n: number): string {
  return n.toLocaleString('en-US');
}

const cardBase =
  'group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:border-primary/25 hover:shadow-md';

const statCard =
  'rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md';

export default function CoachDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();
  const { stats, statsLoading } = useCoachStats();
  const [adminMetrics, setAdminMetrics] = useState<AdminOperationalMetrics | null>(null);
  const [adminMetricsLoading, setAdminMetricsLoading] = useState(false);
  const [priorities, setPriorities] = useState<CoachPriorities | null>(null);
  const [prioritiesLoading, setPrioritiesLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'coach' && user.role !== 'admin') {
      toast.error('Access denied. Coach privileges required.');
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    let cancelled = false;
    (async () => {
      setAdminMetricsLoading(true);
      try {
        const data = await adminAPI.getOperationalMetrics();
        if (!cancelled) setAdminMetrics(data);
      } catch {
        if (!cancelled) setAdminMetrics(null);
      } finally {
        if (!cancelled) setAdminMetricsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || (user.role !== 'coach' && user.role !== 'admin')) return;
    let cancelled = false;
    (async () => {
      setPrioritiesLoading(true);
      try {
        const data = await coachAPI.getPriorities();
        if (!cancelled) setPriorities(data);
      } catch {
        if (!cancelled) setPriorities(null);
      } finally {
        if (!cancelled) setPrioritiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div
        className={
          statsLoading ? 'pointer-events-none select-none blur-[2px] transition-[filter] duration-300' : ''
        }
      >
        {/* <div className="mb-4 border-b border-border/80 pb-4">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Manage your puzzle library, cohorts, and assignments—aligned with the same experience your
            students see, tuned for instruction and reporting.
          </p>
        </div> */}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Link href="/coach/puzzles" className={cardBase}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-lg font-bold text-card-foreground">Manage puzzles</h3>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  Create, validate with Stockfish, and curate your library.
                </p>
              </div>
            </div>
          </Link>

          <Link href="/coach/students" className={cardBase}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--blue-light))] ring-1 ring-border">
                <Users className="h-6 w-6 text-[hsl(var(--blue-dark))]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-lg font-bold text-card-foreground">Students</h3>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  View rosters and track progress over time.
                </p>
              </div>
            </div>
          </Link>

          <Link href="/coach/batches" className={cardBase}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--gold-light))] ring-1 ring-border">
                <Layers className="h-6 w-6 text-[hsl(var(--gold-dark))]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-lg font-bold text-card-foreground">Batches</h3>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  Classes, groups, and billing in one place.
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading flex items-center gap-2 text-xl font-bold text-foreground">
              <ListChecks className="h-5 w-5 text-primary" aria-hidden />
              Today&apos;s priorities
            </h2>
            <Link
              href="/coach/assignments"
              className="text-sm font-semibold text-primary hover:text-primary/90"
            >
              View assignments
            </Link>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            A quick snapshot of who may need a check-in and which homework is due. Links open the right page in one
            click.
          </p>
          {prioritiesLoading ? (
            <p className="text-sm text-muted-foreground">Loading priorities…</p>
          ) : !priorities ? (
            <p className="text-sm text-muted-foreground">Could not load priorities. Try again later.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                  <Users className="h-4 w-4 text-[hsl(var(--blue-dark))]" aria-hidden />
                  Students to check in
                </h3>
                <ul className="space-y-2 text-sm">
                  {priorities.inactive_students.slice(0, 5).map((s) => (
                    <li key={`in-${s.id}`} className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/coach/students/${s.id}`} className="font-medium text-primary hover:underline">
                        {s.username}
                      </Link>
                      <span className="text-xs text-muted-foreground">Inactive {s.days_since_active}d</span>
                    </li>
                  ))}
                  {priorities.low_accuracy_students.slice(0, 5).map((s) => (
                    <li key={`la-${s.id}`} className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/coach/students/${s.id}`} className="font-medium text-primary hover:underline">
                        {s.username}
                      </Link>
                      <span className="text-xs text-muted-foreground">{s.success_rate}% on {s.attempts} tries</span>
                    </li>
                  ))}
                  {priorities.low_game_activity_students.slice(0, 5).map((s) => (
                    <li key={`lg-${s.id}`} className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/coach/students/${s.id}`} className="font-medium text-primary hover:underline">
                        {s.username}
                      </Link>
                      <span className="text-xs text-muted-foreground">{s.reason}</span>
                    </li>
                  ))}
                  {priorities.inactive_students.length === 0 &&
                    priorities.low_accuracy_students.length === 0 &&
                    priorities.low_game_activity_students.length === 0 && (
                    <li className="text-muted-foreground">No one flagged right now. Great work.</li>
                    )}
                </ul>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                  <CalendarClock className="h-4 w-4 text-[hsl(var(--gold-dark))]" aria-hidden />
                  Assignment deadlines
                </h3>
                <ul className="space-y-3 text-sm">
                  {priorities.assignments_overdue.length > 0 && (
                    <li>
                      <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                        Overdue
                      </p>
                      <ul className="space-y-1">
                        {priorities.assignments_overdue.slice(0, 4).map((a) => (
                          <li key={a.id}>
                            <Link
                              href={`/coach/assignments/${a.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {a.title}
                            </Link>
                            <span className="text-muted-foreground"> · {a.target_label}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                  {priorities.assignments_due_soon.length > 0 && (
                    <li>
                      <p className="mb-1 text-xs font-semibold text-[hsl(var(--gold-dark))]">Due within 3 days</p>
                      <ul className="space-y-1">
                        {priorities.assignments_due_soon.slice(0, 4).map((a) => (
                          <li key={a.id}>
                            <Link
                              href={`/coach/assignments/${a.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {a.title}
                            </Link>
                            <span className="text-muted-foreground"> · {a.target_label}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                  {priorities.assignments_overdue.length === 0 &&
                    priorities.assignments_due_soon.length === 0 && (
                      <li className="text-muted-foreground">No upcoming or overdue deadlines with dates set.</li>
                    )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {user?.role === 'admin' && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="font-heading text-xl font-bold text-foreground">Admin operations</h2>
            </div>
            {adminMetricsLoading ? (
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Loading admin metrics…
              </div>
            ) : adminMetrics ? (
              <>
                <div className="mb-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className={statCard}>
                    <h3 className="text-sm font-semibold text-muted-foreground">Active coaches</h3>
                    <p className="mt-2 font-heading text-3xl font-bold text-foreground">
                      {formatStat(adminMetrics.active_coaches)}
                    </p>
                  </div>
                  <div className={statCard}>
                    <h3 className="text-sm font-semibold text-muted-foreground">Unassigned students</h3>
                    <p className="mt-2 font-heading text-3xl font-bold text-foreground">
                      {formatStat(adminMetrics.unassigned_students)}
                    </p>
                  </div>
                  <div className={statCard}>
                    <h3 className="text-sm font-semibold text-muted-foreground">Invites expiring soon</h3>
                    <p className="mt-2 font-heading text-3xl font-bold text-amber-700">
                      {formatStat(adminMetrics.invite_counts.expiring_soon)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatStat(adminMetrics.invite_counts.active)} active · {formatStat(adminMetrics.invite_counts.expired)} expired
                    </p>
                  </div>
                  <div className={statCard}>
                    <h3 className="text-sm font-semibold text-muted-foreground">Critical actions (24h)</h3>
                    <p className="mt-2 font-heading text-3xl font-bold text-foreground">
                      {formatStat(adminMetrics.recent_critical_actions_24h)}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="font-heading mb-3 text-base font-bold text-card-foreground">Recent critical activity</h3>
                  {adminMetrics.recent_critical_actions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No critical actions in the last 24 hours.</p>
                  ) : (
                    <div className="space-y-2">
                      {adminMetrics.recent_critical_actions.map((a) => (
                        <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm">
                          <span className="font-medium text-foreground">{a.action}</span>
                          <span className="text-muted-foreground">
                            {a.target_type}
                            {a.target_id != null ? ` #${a.target_id}` : ''}
                          </span>
                          <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Could not load admin operational metrics.
              </div>
            )}
          </div>
        )}

        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="font-heading text-xl font-bold text-foreground">Statistics</h2>
        </div>

        {statsLoading && (
          <div className="min-h-[280px] rounded-xl border border-transparent" aria-hidden />
        )}

        {!statsLoading && stats && (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className={statCard}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--purple-light))]/80">
                    <Target className="h-5 w-5 text-[hsl(var(--purple-dark))]" />
                  </div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Total puzzles</h3>
                </div>
                <p className="font-heading text-3xl font-bold text-[hsl(var(--purple-dark))]">
                  {formatStat(stats.total_puzzles)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatStat(stats.active_puzzles)} active · {formatStat(stats.inactive_puzzles)} inactive
                </p>
              </div>

              <div className={statCard}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--blue-light))]">
                    <Users className="h-5 w-5 text-[hsl(var(--blue-dark))]" />
                  </div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Attempts</h3>
                </div>
                <p className="font-heading text-3xl font-bold text-[hsl(var(--blue-dark))]">
                  {formatStat(stats.total_attempts)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatStat(stats.total_success)} successful
                </p>
              </div>

              <div className={statCard}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--green-very-light))]">
                    <TrendingUp className="h-5 w-5 text-[hsl(var(--green-medium))]" />
                  </div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Success rate</h3>
                </div>
                <p className="font-heading text-3xl font-bold text-[hsl(var(--green-medium))]">
                  {stats.overall_success_rate.toLocaleString('en-US', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  %
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Overall performance</p>
              </div>

              <div className={statCard}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--gold-light))]">
                    <Trophy className="h-5 w-5 text-[hsl(var(--gold-dark))]" />
                  </div>
                  <h3 className="text-sm font-semibold text-muted-foreground">Active</h3>
                </div>
                <p className="font-heading text-3xl font-bold text-[hsl(var(--gold-dark))]">
                  {formatStat(stats.active_puzzles)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Available to students</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-heading mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
                <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
                Difficulty distribution
              </h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Object.entries(stats.difficulty_distribution).map(([difficulty, count]) => (
                  <div
                    key={difficulty}
                    className="rounded-lg border border-border/80 bg-muted/40 px-3 py-4 text-center"
                  >
                    <p className="font-heading text-2xl font-bold text-primary">{formatStat(Number(count))}</p>
                    <p className="mt-1 text-xs font-medium capitalize text-muted-foreground">{difficulty}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {statsLoading && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/40 backdrop-blur-md"
          aria-busy="true"
          aria-label="Loading statistics"
        >
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card/95 px-10 py-8 shadow-lg">
            <Loader2 className="h-11 w-11 animate-spin text-primary" />
            <p className="text-sm font-semibold text-foreground">Loading statistics…</p>
          </div>
        </div>
      )}
    </div>
  );
}
