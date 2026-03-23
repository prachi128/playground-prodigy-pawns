// app/(coach)/coach/page.tsx - Coach Dashboard Main Page

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { BarChart3, TrendingUp, Target, Trophy, Users, Layers, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCoachStats } from '@/contexts/coach-stats-context';
import { adminAPI, type AdminOperationalMetrics } from '@/lib/api';
import { useState } from 'react';

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

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div
        className={
          statsLoading ? 'pointer-events-none select-none blur-[2px] transition-[filter] duration-300' : ''
        }
      >
        <div className="mb-4 border-b border-border/80 pb-4">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Manage your puzzle library, cohorts, and assignments—aligned with the same experience your
            students see, tuned for instruction and reporting.
          </p>
        </div>

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
