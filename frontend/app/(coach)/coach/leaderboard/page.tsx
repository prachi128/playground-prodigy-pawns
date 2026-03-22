// app/(coach)/coach/leaderboard/page.tsx - Class Leaderboard

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Trophy, TrendingUp, Zap, Target } from 'lucide-react';
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

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400';
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-500';
    return 'bg-gray-100';
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-[min(70vh,520px)]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <div className="mb-6">
          <h1 className="font-heading mb-2 flex items-center gap-3 text-3xl font-bold text-foreground sm:text-4xl">
            <Trophy className="h-9 w-9 shrink-0 text-[hsl(var(--gold-medium))] sm:h-10 sm:w-10" />
            Class leaderboard
          </h1>
          <p className="text-lg text-muted-foreground">Top performers in your class</p>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-foreground">Sort by</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setSortBy('xp')}
              className={`flex-1 rounded-xl py-3 px-4 font-bold transition-all ${
                sortBy === 'xp'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              <Zap className="mr-2 inline h-5 w-5" />
              Total XP
            </button>
            <button
              type="button"
              onClick={() => setSortBy('puzzles')}
              className={`flex-1 rounded-xl py-3 px-4 font-bold transition-all ${
                sortBy === 'puzzles'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              <Target className="mr-2 inline h-5 w-5" />
              Puzzles solved
            </button>
            <button
              type="button"
              onClick={() => setSortBy('success')}
              className={`flex-1 rounded-xl py-3 px-4 font-bold transition-all ${
                sortBy === 'success'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              <TrendingUp className="mr-2 inline h-5 w-5" />
              Success rate
            </button>
          </div>
        </div>

        {leaderboard.length >= 3 && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="order-2 pt-0 md:order-1 md:pt-12">
              <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center shadow-sm">
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
              <div className="relative rounded-2xl border border-[hsl(var(--gold-medium))]/40 bg-[hsl(var(--gold-light))]/50 p-6 text-center shadow-md">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
                  <Trophy className="h-10 w-10 text-[hsl(var(--gold-dark))]" />
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
              <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center shadow-sm">
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
          <div className="bg-[hsl(var(--sidebar-background))] p-4 text-sidebar-foreground">
            <h2 className="font-heading text-xl font-bold">Complete rankings</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
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
                    className={`border-t border-border transition-colors hover:bg-muted/40 ${
                      index % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-white shadow-sm ${getRankColor(entry.rank)}`}
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
              <p className="text-muted-foreground">No students yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
