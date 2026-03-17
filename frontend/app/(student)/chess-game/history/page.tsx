// app/(student)/chess-game/history/page.tsx - Past Games Page

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { gameAPI, Game } from '@/lib/api';
import { Loader2, ArrowLeft, Clock, Trophy, Swords, Calendar, ChevronRight } from 'lucide-react';

export default function PastGamesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await gameAPI.getGames({ user_id: user.id, limit: 100 });
        setGames(data || []);
      } catch (err: any) {
        const message = err?.response?.data?.detail || 'Failed to load your games';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const formatDate = (value?: string) => {
    if (!value) return 'Unknown';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getResultLabel = (game: Game) => {
    if (!game.result) return 'In Progress';
    if (game.result === '1/2-1/2') return 'Draw';
    if (game.result === '1-0') return game.winner_id === user?.id ? 'You won' : 'You lost';
    if (game.result === '0-1') return game.winner_id === user?.id ? 'You won' : 'You lost';
    return String(game.result);
  };

  const getResultTone = (game: Game) => {
    if (!game.result) return 'text-slate-600 bg-slate-100 border-slate-200';
    if (game.result === '1/2-1/2') return 'text-blue-700 bg-blue-100 border-blue-200';
    if (game.winner_id === user?.id) return 'text-green-700 bg-green-100 border-green-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  const completedGames = games.filter((g) => !!g.result || !!g.ended_at);
  const ongoingGames = games.filter((g) => !g.result && !g.ended_at);

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl pt-6">
        <div className="rounded-2xl border-2 border-border bg-card p-8 text-center">
          <p className="font-heading text-lg text-muted-foreground">Please log in to see your games.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pt-6">
      {/* Header with back to Play */}
      <section className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push('/play')}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-heading font-semibold text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to play
          </button>
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-orange-500" />
            <h1 className="font-heading text-lg font-bold text-card-foreground">Your Chess Games</h1>
          </div>
        </div>
      </section>

      {/* Loading / error states */}
      {isLoading && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary-600" />
            <p className="font-heading text-sm font-semibold text-muted-foreground">Loading your games...</p>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="mb-4 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-center">
          <p className="font-heading text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {!isLoading && !error && completedGames.length === 0 && ongoingGames.length === 0 && (
        <section className="mb-6">
          <div className="rounded-3xl border-2 border-border bg-card p-10 text-center shadow-sm">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="mb-1 font-heading text-xl font-bold text-card-foreground">
              No games yet
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              Play your first game against the computer or a friend, then come back here to review it.
            </p>
            <button
              type="button"
              onClick={() => router.push('/play')}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 px-5 py-2.5 font-heading text-sm font-bold text-white shadow-sm transition-colors hover:from-orange-500 hover:to-pink-600"
            >
              <Gamepad2 className="h-4 w-4" />
              Go to Play
            </button>
          </div>
        </section>
      )}

      {/* Ongoing games (if any) */}
      {!isLoading && !error && ongoingGames.length > 0 && (
        <section className="mb-6">
          <div className="overflow-hidden rounded-3xl border-2 border-amber-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-white" />
                <h2 className="font-heading text-lg font-bold text-white">Ongoing games</h2>
              </div>
            </div>
            <div className="divide-y divide-border">
              {ongoingGames.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => router.push(`/chess-game/${g.id}`)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-amber-50/60"
                >
                  <div>
                    <p className="font-heading text-sm font-bold text-card-foreground">
                      Game #{g.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Started {formatDate(g.started_at)} • {g.time_control || 'Unlimited'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-heading font-semibold text-amber-700">
                      In progress
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Completed games list */}
      {!isLoading && !error && completedGames.length > 0 && (
        <section>
          <div className="overflow-hidden rounded-3xl border-2 border-border bg-card shadow-sm">
            <div className="bg-gradient-to-r from-emerald-400 to-teal-500 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-white" />
                  <h2 className="font-heading text-lg font-bold text-white">Completed games</h2>
                </div>
                <p className="text-xs font-heading font-semibold text-white/80">
                  {completedGames.length} game{completedGames.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="divide-y divide-border">
              {completedGames.map((g) => (
                <div key={g.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/40">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-600 text-lg font-bold text-white shadow">
                      <span>{g.bot_difficulty ? '🤖' : '♞'}</span>
                    </div>
                    <div>
                      <p className="font-heading text-sm font-bold text-card-foreground">
                        {g.bot_difficulty ? `Vs Computer (${g.bot_difficulty})` : 'Vs Friend'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Finished {formatDate(g.ended_at || g.started_at)} • {g.time_control || 'Unlimited'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[11px] font-heading font-semibold ${getResultTone(
                        g,
                      )}`}
                    >
                      {getResultLabel(g)}
                    </span>

                    <div className="flex gap-2">
                      <Link
                        href={`/chess-game/${g.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-heading font-semibold text-card-foreground shadow-sm hover:bg-muted"
                      >
                        <Swords className="h-3 w-3" />
                        View game
                      </Link>
                      <Link
                        href={`/chess-game/${g.id}/analysis`}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-heading font-semibold text-white shadow-sm hover:bg-emerald-600"
                      >
                        <Calendar className="h-3 w-3" />
                        Analyze
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

