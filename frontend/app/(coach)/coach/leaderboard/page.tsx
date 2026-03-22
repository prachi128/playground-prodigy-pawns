// app/(coach)/coach/leaderboard/page.tsx - Class Leaderboard

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Trophy, TrendingUp, Zap, Target, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface RawStudent {
  id: number;
  username: string;
  email: string;
  xp: number;
  total_puzzles_solved: number;
  success_rate: number;
}

interface LeaderboardEntry {
  rank: number;
  id: number;
  username: string;
  email: string;
  xp: number;
  total_puzzles_solved: number;
  success_rate: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [rawStudents, setRawStudents] = useState<RawStudent[]>([]);
  const [sortBy, setSortBy] = useState<'xp' | 'puzzles' | 'success'>('xp');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coach' && user?.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/api/coach/students');
        if (!cancelled) {
          setRawStudents(Array.isArray(response.data) ? response.data : []);
        }
      } catch {
        if (!cancelled) {
          toast.error('Failed to load leaderboard');
          setRawStudents([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, router]);

  const leaderboard = useMemo((): LeaderboardEntry[] => {
    const sorted = [...rawStudents];
    if (sortBy === 'xp') {
      sorted.sort((a, b) => b.xp - a.xp);
    } else if (sortBy === 'puzzles') {
      sorted.sort((a, b) => b.total_puzzles_solved - a.total_puzzles_solved);
    } else {
      sorted.sort((a, b) => b.success_rate - a.success_rate);
    }
    return sorted.map((student, index) => ({
      rank: index + 1,
      ...student,
    }));
  }, [rawStudents, sortBy]);

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  /** Rank badge in table: coach HSL tokens + readable text for ranks 4+. */
  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) {
      return 'border border-[hsl(var(--gold-medium))]/50 bg-[hsl(var(--gold-light))]/90 text-[hsl(var(--gold-dark))]';
    }
    if (rank === 2) {
      return 'border border-border bg-muted text-card-foreground';
    }
    if (rank === 3) {
      return 'border border-[hsl(var(--orange-medium))]/45 bg-[hsl(var(--orange-very-light))] text-[hsl(var(--orange-dark))]';
    }
    return 'border border-border bg-card text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading leaderboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-6">
        <h1 className="font-heading flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 sm:h-11 sm:w-11">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          Class leaderboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Top performers across your students—sort by XP, puzzles solved, or success rate.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-foreground">Sort by</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          {(
            [
              { key: 'xp' as const, label: 'Total XP', Icon: Zap },
              { key: 'puzzles' as const, label: 'Puzzles solved', Icon: Target },
              { key: 'success' as const, label: 'Success rate', Icon: TrendingUp },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortBy(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                sortBy === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {leaderboard.length >= 3 && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="order-2 pt-0 md:order-1 md:pt-12">
            <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all hover:border-primary/20">
                <div className="mb-3 text-5xl">🥈</div>
                <p className="mb-1 text-xl font-bold text-foreground">{leaderboard[1].username}</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {sortBy === 'xp' && (
                    <>
                      <Zap className="h-5 w-5 text-[hsl(var(--gold-dark))]" />
                      <span className="text-2xl font-bold text-foreground">{leaderboard[1].xp}</span>
                    </>
                  )}
                  {sortBy === 'puzzles' && (
                    <span className="text-2xl font-bold text-foreground">
                      {leaderboard[1].total_puzzles_solved}
                    </span>
                  )}
                  {sortBy === 'success' && (
                    <span className="text-2xl font-bold text-foreground">{leaderboard[1].success_rate}%</span>
                  )}
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div className="relative rounded-xl border border-[hsl(var(--gold-medium))]/40 bg-[hsl(var(--gold-light))]/60 p-6 text-center shadow-sm ring-1 ring-[hsl(var(--gold-medium))]/15">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card shadow-md ring-2 ring-[hsl(var(--gold-medium))]/30">
                    <Trophy className="h-6 w-6 text-[hsl(var(--gold-dark))]" />
                  </span>
                </div>
                <div className="mb-3 mt-2 text-6xl">🥇</div>
                <p className="mb-1 text-2xl font-bold text-foreground">{leaderboard[0].username}</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {sortBy === 'xp' && (
                    <>
                      <Zap className="h-6 w-6 text-[hsl(var(--gold-dark))]" />
                      <span className="text-3xl font-bold text-foreground">{leaderboard[0].xp}</span>
                    </>
                  )}
                  {sortBy === 'puzzles' && (
                    <span className="text-3xl font-bold text-foreground">
                      {leaderboard[0].total_puzzles_solved}
                    </span>
                  )}
                  {sortBy === 'success' && (
                    <span className="text-3xl font-bold text-foreground">{leaderboard[0].success_rate}%</span>
                  )}
                </div>
              </div>
            </div>

            <div className="order-3 pt-0 md:pt-12">
              <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all hover:border-primary/20">
                <div className="mb-3 text-5xl">🥉</div>
                <p className="mb-1 text-xl font-bold text-foreground">{leaderboard[2].username}</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {sortBy === 'xp' && (
                    <>
                      <Zap className="h-5 w-5 text-[hsl(var(--gold-dark))]" />
                      <span className="text-2xl font-bold text-foreground">{leaderboard[2].xp}</span>
                    </>
                  )}
                  {sortBy === 'puzzles' && (
                    <span className="text-2xl font-bold text-foreground">
                      {leaderboard[2].total_puzzles_solved}
                    </span>
                  )}
                  {sortBy === 'success' && (
                    <span className="text-2xl font-bold text-foreground">{leaderboard[2].success_rate}%</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-primary px-4 py-3 sm:px-5">
            <h2 className="font-heading text-lg font-bold text-primary-foreground">Complete rankings</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-foreground">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-foreground">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-foreground">XP</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-foreground">Puzzles</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-foreground">Success rate</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-border transition-colors last:border-b-0 hover:bg-muted/40 ${
                      index % 2 === 1 ? 'bg-muted/15' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-sm ${getRankBadgeClass(
                          entry.rank,
                        )}`}
                      >
                        {getMedalIcon(entry.rank)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-foreground">{entry.username}</p>
                      <p className="text-xs text-muted-foreground">{entry.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-[hsl(var(--gold-medium))]" />
                        <span className="font-bold text-[hsl(var(--gold-dark))]">{entry.xp}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-[hsl(var(--blue-dark))]">{entry.total_puzzles_solved}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`font-bold ${
                          entry.success_rate >= 70
                            ? 'text-[hsl(var(--green-medium))]'
                            : entry.success_rate >= 50
                              ? 'text-[hsl(var(--gold-dark))]'
                              : 'text-destructive'
                        }`}
                      >
                        {entry.success_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {leaderboard.length === 0 && (
            <div className="py-12 text-center">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-heading text-sm font-semibold text-card-foreground">No students yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Students will appear here once they are in your roster.</p>
            </div>
          )}
        </div>
    </div>
  );
}
