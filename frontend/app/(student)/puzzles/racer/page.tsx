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

const ROUND_OPTIONS = [
  { label: '1 min', seconds: 60, emoji: '⚡' },
  { label: '2 min', seconds: 120, emoji: '🏃' },
  { label: '3 min', seconds: 180, emoji: '🌟' },
];

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
  const [phase, setPhase] = useState<'start' | 'racing' | 'ended'>('start');
  const [selectedSeconds, setSelectedSeconds] = useState(120);
  const [puzzlePool, setPuzzlePool] = useState<Puzzle[]>([]);
  const [poolIndex, setPoolIndex] = useState(0);
  const [loadingPool, setLoadingPool] = useState(false);

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
      setPhase('racing');
      setTimeLeft(selectedSeconds);
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
    } catch (e) {
      console.error(e);
      toast.error('Could not load puzzles');
    } finally {
      setLoadingPool(false);
    }
  }, [selectedSeconds, user?.id, user?.full_name]);

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
                toast.success(`Correct! +${result.xp_earned ?? 0} XP 🎉`, { duration: 1500 });
                setTimeout(() => {
                  loadNextPuzzle();
                }, 1200);
              } else {
                setShowWrong(true);
                toast.error('Not quite! Try again 🧩');
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

  if (phase === 'start') {
    return (
      <div className="mx-auto max-w-2xl pt-6">
        <div className="mb-6">
          <Link
            href="/puzzles"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/90 font-heading font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Puzzles
          </Link>
        </div>
        <div className="rounded-3xl border-2 border-orange-200 bg-card shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-400 to-amber-500 px-6 py-6 text-center">
            <span className="text-5xl block mb-2">🏎️</span>
            <h1 className="font-heading text-2xl font-bold text-white">Puzzle Racer</h1>
            <p className="mt-1 font-heading text-sm font-semibold text-white/90">
              Solve as many puzzles as you can before time runs out!
            </p>
          </div>
          <div className="p-6 space-y-6">
            <p className="font-sans text-muted-foreground text-center">
              Pick a round length. You’ll get beginner puzzles one after another. Each correct solve earns XP!
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {ROUND_OPTIONS.map((opt) => (
                <button
                  key={opt.seconds}
                  onClick={() => setSelectedSeconds(opt.seconds)}
                  className={`flex flex-col items-center rounded-2xl border-2 px-6 py-4 font-heading font-bold transition-all ${
                    selectedSeconds === opt.seconds
                      ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-md'
                      : 'border-border bg-card text-muted-foreground hover:border-orange-300'
                  }`}
                >
                  <span className="text-2xl mb-1">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 justify-center text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-500" />
                Timed round
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
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={startRace}
                disabled={loadingPool}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white font-heading font-bold py-3 px-6 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {loadingPool ? (
                  'Loading…'
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Start race
                  </>
                )}
              </button>
              <Link
                href="/puzzles/solve"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-card font-heading font-bold py-3 px-6 text-foreground hover:bg-muted transition-all"
              >
                Solve at my pace
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'ended') {
    return (
      <div className="mx-auto max-w-2xl pt-6">
        <div className="rounded-3xl border-2 border-orange-200 bg-card shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-8 text-center">
            <span className="text-6xl block mb-2">🏁</span>
            <h1 className="font-heading text-3xl font-bold text-white">Time’s up!</h1>
            <p className="mt-2 font-heading text-lg font-semibold text-white/90">
              Great job! Here’s how you did.
            </p>
          </div>
          <div className="p-6 space-y-6">
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

  return (
    <div className="mx-auto max-w-4xl pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/puzzles"
          className="inline-flex items-center gap-1 text-primary hover:text-primary/90 font-heading font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Puzzles
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2 border-2 border-amber-300">
            <Clock className="h-5 w-5 text-amber-600" />
            <span className="font-heading text-lg font-bold text-amber-800">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-cyan-100 px-4 py-2 border-2 border-cyan-300">
            <Star className="h-5 w-5 text-cyan-600" />
            <span className="font-heading text-lg font-bold text-cyan-800">{puzzlesSolved}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-green-100 px-4 py-2 border-2 border-green-300">
            <Zap className="h-5 w-5 text-green-600" />
            <span className="font-heading text-lg font-bold text-green-800">+{totalXP} XP</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        {loadingPuzzle || (!currentPuzzle && puzzlePool.length === 0) ? (
          <div className="rounded-2xl border-2 border-border bg-card p-12 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-heading font-semibold text-muted-foreground">Loading puzzle…</p>
          </div>
        ) : currentPuzzle && game ? (
          <>
            <div className="relative rounded-2xl border-2 border-border bg-card p-4 shadow-xl">
              {(showCorrect || showWrong) && (
                <div
                  className={`absolute inset-0 z-10 flex items-center justify-center rounded-2xl ${
                    showCorrect ? 'bg-green-500/90' : 'bg-red-500/90'
                  }`}
                >
                  <span className="font-heading text-2xl font-bold text-white">
                    {showCorrect ? 'Correct! 🎉' : 'Not quite! Try again 🧩'}
                  </span>
                </div>
              )}
              <div className="w-full max-w-[360px] mx-auto">
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
            <p className="mt-3 font-heading text-sm font-semibold text-muted-foreground">
              Find the best move! Puzzle {puzzlesSolved + 1}
            </p>

            {/* Participants & race track */}
            {participants.length > 0 && (
              <div className="mt-8 w-full max-w-2xl">
                <p className="font-heading text-sm font-bold text-foreground mb-2">Racers</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[...participants]
                    .sort((a, b) => b.score - a.score)
                    .map((p, idx) => (
                      <span
                        key={p.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-heading font-bold ${
                          p.isYou
                            ? 'bg-amber-200 text-amber-900 border-2 border-amber-400'
                            : 'bg-muted text-muted-foreground border-2 border-border'
                        }`}
                      >
                        <span>{idx + 1}.</span>
                        <span>{CAR_EMOJIS[p.carIndex % CAR_EMOJIS.length]}</span>
                        <span>{p.name}{p.isYou ? ' (you)' : ''}</span>
                        <span className="opacity-80">{p.score}</span>
                      </span>
                    ))}
                </div>
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-3 overflow-hidden">
                  <p className="text-[10px] font-heading font-bold text-amber-800 mb-2 uppercase tracking-wide text-center">
                    🏁 Race track — who&apos;s ahead?
                  </p>
                  <div className="space-y-1.5">
                    {[...participants]
                      .sort((a, b) => b.score - a.score)
                      .map((p, rank) => {
                        const pos = Math.min((p.score / TRACK_MAX_SCORE) * 100, 100);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-2"
                          >
                            <span className="w-5 text-center text-xs font-heading font-bold text-amber-700">
                              {rank + 1}
                            </span>
                            <div className="relative flex-1 h-10 rounded-lg bg-gradient-to-r from-amber-100 to-amber-200 border-2 border-amber-300 overflow-hidden">
                              <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
                                <div className="flex-1 border-t-2 border-dashed border-amber-400/50" />
                              </div>
                              <div
                                className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all duration-500 ease-out"
                                style={{ left: `max(2px, ${pos}% - 20px)` }}
                              >
                                <span className="text-xl leading-none">
                                  {CAR_EMOJIS[p.carIndex % CAR_EMOJIS.length]}
                                </span>
                                <span
                                  className={`text-[10px] font-heading font-bold truncate max-w-[52px] ${
                                    p.isYou ? 'text-amber-800' : 'text-muted-foreground'
                                  }`}
                                >
                                  {p.isYou ? 'You' : p.name}
                                </span>
                              </div>
                            </div>
                            <span className="w-6 text-right text-xs font-heading font-bold text-foreground">
                              {p.score}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px] font-heading font-bold text-amber-700">
                    <span>Start</span>
                    <span>Finish 🏁</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border-2 border-border bg-card p-12 text-center">
            <p className="font-heading font-semibold text-muted-foreground">Loading next puzzle…</p>
          </div>
        )}
      </div>
    </div>
  );
}
