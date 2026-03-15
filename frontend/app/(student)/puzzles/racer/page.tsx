// app/(student)/puzzles/racer/page.tsx - Puzzle Racer for kids

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Trophy, Clock, Play, RotateCcw, Star } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { puzzleAPI, Puzzle, leaderboardAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

/** Fixed race duration: 2.5 minutes */
const RACE_DURATION_SECONDS = 150;
const COUNTDOWN_SECONDS = 10;

const TRACK_MAX_SCORE = 15;
const CAR_EMOJIS = ['🏎️', '🚗', '🚙', '🏁', '🚕'];

export type RacerParticipant = {
  id: number | string;
  name: string;
  isYou: boolean;
  score: number;
  carIndex: number;
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function PuzzleRacerPage() {
  const { user, updateUser } = useAuthStore();
  const [phase, setPhase] = useState<'start' | 'countdown' | 'racing' | 'ended'>('start');
  const [puzzlePool, setPuzzlePool] = useState<Puzzle[]>([]);
  const [poolIndex, setPoolIndex] = useState(0);
  const [loadingPool, setLoadingPool] = useState(false);

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [timeLeft, setTimeLeft] = useState(0);
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [game, setGame] = useState<Chess | null>(null);
  const [movesMade, setMovesMade] = useState<string[]>([]);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [loadingPuzzle, setLoadingPuzzle] = useState(false);

  const [participants, setParticipants] = useState<RacerParticipant[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const loadNextPuzzle = useCallback(() => {
    if (puzzlePool.length === 0) return;
    const idx = poolIndex % puzzlePool.length;
    const next = puzzlePool[idx];
    setPoolIndex((i) => i + 1);
    setCurrentPuzzle(next);
    setGame(new Chess(next.fen));
    setMovesMade([]);
    setShowCorrect(false);
    setShowWrong(false);
    startTimeRef.current = Date.now();
  }, [puzzlePool, poolIndex]);

  const startRace = useCallback(async () => {
    setLoadingPool(true);
    try {
      const [list, leaderboard] = await Promise.all([
        puzzleAPI.getAll('beginner'),
        leaderboardAPI.get('xp', 6),
      ]);
      const shuffled = shuffle(list);
      if (shuffled.length === 0) {
        toast.error('No puzzles available. Try again later!');
        return;
      }
      const myId = user?.id ?? 'you';
      const myName = user?.full_name?.split(' ')[0] ?? 'You';
      let others = leaderboard
        .filter((e) => e.user_id !== user?.id)
        .slice(0, 4)
        .map((e, i) => ({
          id: e.user_id,
          name: e.full_name?.split(' ')[0] ?? e.username,
          isYou: false,
          score: 0,
          carIndex: i + 1,
        }));
      if (others.length < 2) {
        others = [
          ...others,
          ...['Racer 1', 'Racer 2', 'Racer 3'].slice(0, 2 - others.length).map((name, i) => ({
            id: `ghost-${i}`,
            name,
            isYou: false as const,
            score: 0,
            carIndex: others.length + i + 1,
          })),
        ];
      }
      setParticipants([
        { id: myId, name: myName, isYou: true, score: 0, carIndex: 0 },
        ...others,
      ]);
      setPuzzlePool(shuffled);
      setPuzzlesSolved(0);
      setTotalXP(0);
      setPoolIndex(1);
      setShowCorrect(false);
      setShowWrong(false);
      const first = shuffled[0];
      setCurrentPuzzle(first);
      setGame(new Chess(first.fen));
      setMovesMade([]);
      startTimeRef.current = Date.now();

      // Start countdown phase
      setCountdown(COUNTDOWN_SECONDS);
      setPhase('countdown');
    } catch (e) {
      console.error(e);
      toast.error('Could not load puzzles');
    } finally {
      setLoadingPool(false);
    }
  }, [user?.id, user?.full_name]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'countdown') return;
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setPhase('racing');
          setTimeLeft(RACE_DURATION_SECONDS);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [phase]);

  // Race timer
  useEffect(() => {
    if (phase !== 'racing' || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('ended');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, timeLeft]);

  // Simulate opponents
  useEffect(() => {
    if (phase !== 'racing' || participants.length === 0) return;
    simulateRef.current = setInterval(() => {
      setParticipants((prev) => {
        const others = prev.filter((p) => !p.isYou && p.score < TRACK_MAX_SCORE);
        if (others.length === 0) return prev;
        const idx = prev.findIndex((p) => p.id === others[Math.floor(Math.random() * others.length)].id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], score: next[idx].score + 1 };
        return next;
      });
    }, 4000);
    return () => {
      if (simulateRef.current) clearInterval(simulateRef.current);
    };
  }, [phase, participants.length]);

  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!game || !currentPuzzle || showCorrect || showWrong) return false;
      try {
        const move = game.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        if (move === null) return false;
        const newMoves = [...movesMade, `${sourceSquare}${targetSquare}`];
        setMovesMade(newMoves);
        setGame(new Chess(game.fen()));
        const solutionMoves = currentPuzzle.moves.split(' ');
        const isComplete = newMoves.length >= solutionMoves.length;
        const isCorrect = newMoves.every((m, i) => {
          const sol = solutionMoves[i];
          return m === sol || m === sol.replace(/[+=]/, '');
        });
        if (isComplete) {
          const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
          puzzleAPI
            .submitAttempt(currentPuzzle.id, {
              is_solved: isCorrect,
              moves_made: newMoves.join(' '),
              time_taken: timeTaken,
              hints_used: 0,
            })
            .then((result) => {
              if (isCorrect) {
                setPuzzlesSolved((s) => s + 1);
                setParticipants((prev) =>
                  prev.map((p) => (p.isYou ? { ...p, score: p.score + 1 } : p))
                );
                setTotalXP((x) => x + (result.xp_earned ?? 0));
                if (user && result.xp_earned) {
                  updateUser({ total_xp: user.total_xp + result.xp_earned });
                }
                setShowCorrect(true);
                toast.success(`Correct! +${result.xp_earned ?? 0} XP`, { duration: 1500 });
                setTimeout(() => {
                  loadNextPuzzle();
                }, 1200);
              } else {
                setShowWrong(true);
                toast.error('Not quite! Try again');
                setTimeout(() => {
                  setShowWrong(false);
                  setGame(new Chess(currentPuzzle.fen));
                  setMovesMade([]);
                  startTimeRef.current = Date.now();
                }, 1500);
              }
            })
            .catch(() => toast.error('Could not save attempt'));
        }
        return true;
      } catch {
        return false;
      }
    },
    [game, currentPuzzle, movesMade, showCorrect, showWrong, user, updateUser, loadNextPuzzle]
  );

  // ==================== START SCREEN ====================
  if (phase === 'start') {
    return (
      <div className="mx-auto max-w-2xl pt-1 pb-4 overflow-hidden max-h-[calc(100vh-5rem)]">
        <div className="mb-3">
          <Link
            href="/puzzles"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/90 font-heading font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Puzzles
          </Link>
        </div>
        <div className="rounded-3xl border-2 border-orange-200 bg-card shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-400 to-amber-500 px-6 py-4 text-center">
            <span className="text-4xl block mb-1">🏎️</span>
            <h1 className="font-heading text-2xl font-bold text-white">Puzzle Racer</h1>
            <p className="mt-0.5 font-heading text-sm font-semibold text-white/90">
              Solve as many puzzles as you can before time runs out!
            </p>
          </div>
          <div className="p-4 space-y-4">
            <p className="font-sans text-muted-foreground text-center">
              You have 2.5 minutes to solve as many beginner puzzles as you can. Each correct solve earns XP!
            </p>
            <div className="flex flex-wrap gap-3 justify-center text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-500" />
                2.5 min round
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-orange-500" />
                XP per solve
              </span>
              <span className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Beat your score
              </span>
            </div>
            <div className="flex justify-center pt-1">
              <button
                onClick={startRace}
                disabled={loadingPool}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white font-heading font-bold py-3 px-6 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 cursor-default"
              >
                {loadingPool ? (
                  'Loading…'
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Start Race
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== COUNTDOWN SCREEN ====================
  if (phase === 'countdown') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500">
        <div className="text-center">
          {/* Participants preview */}
          <div className="mb-8">
            <p className="font-heading text-lg font-bold text-white/80 mb-3">Get Ready to Race!</p>
            <div className="flex flex-wrap justify-center gap-2">
              {participants.map((p) => (
                <span
                  key={p.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-heading font-bold ${
                    p.isYou
                      ? 'bg-white text-amber-800'
                      : 'bg-white/30 text-white'
                  }`}
                >
                  {CAR_EMOJIS[p.carIndex % CAR_EMOJIS.length]} {p.name}{p.isYou ? ' (you)' : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Countdown number */}
          <div className="relative">
            <span
              key={countdown}
              className="block font-heading font-black text-white animate-bounce"
              style={{ fontSize: '12rem', lineHeight: 1, textShadow: '0 8px 30px rgba(0,0,0,0.3)' }}
            >
              {countdown}
            </span>
          </div>

          <p className="mt-6 font-heading text-xl font-bold text-white/90">
            {countdown > 5 ? 'Preparing puzzles...' : countdown > 2 ? 'Almost there...' : 'GO!'}
          </p>

          {/* Progress dots */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {Array.from({ length: COUNTDOWN_SECONDS }, (_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i < COUNTDOWN_SECONDS - countdown
                    ? 'bg-white scale-100'
                    : 'bg-white/30 scale-75'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==================== ENDED SCREEN ====================
  if (phase === 'ended') {
    return (
      <div className="mx-auto max-w-2xl pt-1 pb-4 overflow-hidden max-h-[calc(100vh-5rem)]">
        <div className="rounded-3xl border-2 border-orange-200 bg-card shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-8 text-center">
            <span className="text-6xl block mb-2">🏁</span>
            <h1 className="font-heading text-3xl font-bold text-white">Time&apos;s up!</h1>
            <p className="mt-2 font-heading text-lg font-semibold text-white/90">
              Great job! Here&apos;s how you did.
            </p>
          </div>
          <div className="p-6 space-y-6">
            {/* Final standings */}
            <div className="space-y-1.5">
              {[...participants]
                .sort((a, b) => b.score - a.score)
                .map((p, rank) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-4 py-2 rounded-xl text-sm font-heading font-bold ${
                      p.isYou
                        ? 'bg-amber-100 border-2 border-amber-300 text-amber-900'
                        : 'bg-gray-50 border border-gray-200 text-gray-600'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`}</span>
                      <span>{CAR_EMOJIS[p.carIndex % CAR_EMOJIS.length]}</span>
                      <span>{p.name}{p.isYou ? ' (you)' : ''}</span>
                    </span>
                    <span>{p.score} solved</span>
                  </div>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border-2 border-cyan-200 bg-cyan-50 p-4 text-center">
                <p className="font-heading text-3xl font-bold text-cyan-700">{puzzlesSolved}</p>
                <p className="font-heading text-sm font-semibold text-cyan-800">Puzzles solved</p>
              </div>
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-center">
                <p className="font-heading text-3xl font-bold text-amber-700">+{totalXP}</p>
                <p className="font-heading text-sm font-semibold text-amber-800">XP earned</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setPhase('start');
                  setCurrentPuzzle(null);
                  setGame(null);
                  setPuzzlePool([]);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white font-heading font-bold py-3 px-6 shadow-lg hover:shadow-xl"
              >
                <RotateCcw className="h-5 w-5" />
                Play again
              </button>
              <Link
                href="/puzzles"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-card font-heading font-bold py-3 px-6 text-foreground hover:bg-muted"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Puzzles
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RACING SCREEN ====================
  // Side-by-side layout: chessboard on left, race track on right — no scrolling needed
  const myRank = [...participants].sort((a, b) => b.score - a.score).findIndex((p) => p.isYou) + 1;

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col overflow-hidden">
      {/* Top bar: stats */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
        <Link
          href="/puzzles"
          className="inline-flex items-center gap-1 text-primary hover:text-primary/90 font-heading font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Puzzles
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 border-2 border-amber-300">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="font-heading text-base font-bold text-amber-800">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-cyan-100 px-3 py-1.5 border-2 border-cyan-300">
            <Star className="h-4 w-4 text-cyan-600" />
            <span className="font-heading text-base font-bold text-cyan-800">{puzzlesSolved}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-green-100 px-3 py-1.5 border-2 border-green-300">
            <Zap className="h-4 w-4 text-green-600" />
            <span className="font-heading text-base font-bold text-green-800">+{totalXP}</span>
          </div>
        </div>
      </div>

      {/* Main content: chessboard + race track side by side */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
        {/* Left: Chessboard */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          {loadingPuzzle || (!currentPuzzle && puzzlePool.length === 0) ? (
            <div className="rounded-2xl border-2 border-border bg-card p-8 text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="font-heading font-semibold text-muted-foreground">Loading puzzle…</p>
            </div>
          ) : currentPuzzle && game ? (
            <div className="flex flex-col items-center min-h-0">
              <div className="relative rounded-2xl border-2 border-border bg-card p-3 shadow-xl">
                {(showCorrect || showWrong) && (
                  <div
                    className={`absolute inset-0 z-10 flex items-center justify-center rounded-2xl ${
                      showCorrect ? 'bg-green-500/90' : 'bg-red-500/90'
                    }`}
                  >
                    <span className="font-heading text-2xl font-bold text-white">
                      {showCorrect ? 'Correct!' : 'Not quite!'}
                    </span>
                  </div>
                )}
                <div className="w-full" style={{ maxWidth: 'min(340px, calc(100vh - 14rem))' }}>
                  <Chessboard
                    key={game.fen()}
                    options={{
                      position: game.fen(),
                      onPieceDrop: ({ sourceSquare, targetSquare }) =>
                        sourceSquare && targetSquare ? onDrop(sourceSquare, targetSquare) : false,
                      boardStyle: { borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' },
                      darkSquareStyle: { backgroundColor: 'hsl(var(--primary))' },
                      lightSquareStyle: { backgroundColor: 'hsl(var(--primary) / 0.15)' },
                    }}
                  />
                </div>
              </div>
              <p className="mt-2 font-heading text-sm font-semibold text-muted-foreground">
                Find the best move! Puzzle {puzzlesSolved + 1}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-border bg-card p-8 text-center">
              <p className="font-heading font-semibold text-muted-foreground">Loading next puzzle…</p>
            </div>
          )}
        </div>

        {/* Right: Race track + standings */}
        {participants.length > 0 && (
          <div className="lg:w-72 xl:w-80 flex-shrink-0 flex flex-col gap-3 min-h-0 overflow-auto">
            {/* Your position highlight */}
            <div className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 p-3 text-center text-white">
              <p className="font-heading text-xs font-bold uppercase tracking-wide opacity-80">Your Position</p>
              <p className="font-heading text-3xl font-black">
                {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : `#${myRank}`}
              </p>
            </div>

            {/* Race track */}
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-3">
              <p className="text-[10px] font-heading font-bold text-amber-800 mb-2 uppercase tracking-wide text-center">
                Race Track
              </p>
              <div className="space-y-1.5">
                {[...participants]
                  .sort((a, b) => b.score - a.score)
                  .map((p, rank) => {
                    const pos = Math.min((p.score / TRACK_MAX_SCORE) * 100, 100);
                    return (
                      <div key={p.id} className="flex items-center gap-1.5">
                        <span className="w-4 text-center text-xs font-heading font-bold text-amber-700">
                          {rank + 1}
                        </span>
                        <div className="relative flex-1 h-8 rounded-lg bg-gradient-to-r from-amber-100 to-amber-200 border-2 border-amber-300 overflow-hidden">
                          <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
                            <div className="flex-1 border-t-2 border-dashed border-amber-400/50" />
                          </div>
                          <div
                            className="absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-all duration-500 ease-out"
                            style={{ left: `max(2px, ${pos}% - 18px)` }}
                          >
                            <span className="text-lg leading-none">
                              {CAR_EMOJIS[p.carIndex % CAR_EMOJIS.length]}
                            </span>
                            <span
                              className={`text-[9px] font-heading font-bold truncate max-w-[40px] ${
                                p.isYou ? 'text-amber-800' : 'text-muted-foreground'
                              }`}
                            >
                              {p.isYou ? 'You' : p.name}
                            </span>
                          </div>
                        </div>
                        <span className="w-5 text-right text-xs font-heading font-bold text-foreground">
                          {p.score}
                        </span>
                      </div>
                    );
                  })}
              </div>
              <div className="flex justify-between mt-1.5 text-[9px] font-heading font-bold text-amber-700">
                <span>Start</span>
                <span>Finish 🏁</span>
              </div>
            </div>

            {/* Standings list */}
            <div className="rounded-xl border-2 border-border bg-card p-3">
              <p className="text-[10px] font-heading font-bold text-muted-foreground mb-2 uppercase tracking-wide text-center">
                Standings
              </p>
              <div className="space-y-1">
                {[...participants]
                  .sort((a, b) => b.score - a.score)
                  .map((p, idx) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-heading font-bold ${
                        p.isYou
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{idx + 1}.</span>
                        <span>{CAR_EMOJIS[p.carIndex % CAR_EMOJIS.length]}</span>
                        <span>{p.name}{p.isYou ? ' (you)' : ''}</span>
                      </span>
                      <span>{p.score}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
