// app/(student)/puzzles/[id]/page.tsx - Full Page Puzzle Solver (student theme, dashboard layout)

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { puzzleAPI, Puzzle } from '@/lib/api';
import { getDifficultyColor, normalizePuzzleMoves, parseThemeList } from '@/lib/utils';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Lightbulb, RotateCcw, Check, X, Trophy, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import HintSystem from '@/components/HintSystem';

function PuzzleSolvePageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const puzzleId = parseInt(params.id as string);
  const assignmentIdRaw = searchParams.get('assignment_id');
  const selectedDifficulty = searchParams.get('difficulty') ?? '';
  const selectedTheme = searchParams.get('theme') ?? '';
  const mode = searchParams.get('mode') ?? '';
  const assignmentIdForApi = (() => {
    if (assignmentIdRaw == null || assignmentIdRaw === '') return null;
    const n = parseInt(assignmentIdRaw, 10);
    return Number.isNaN(n) ? null : n;
  })();
  
  const { user, updateUser } = useAuthStore();
  
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [game, setGame] = useState<Chess | null>(null);
  const [movesMade, setMovesMade] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userXP, setUserXP] = useState(user?.total_xp ?? 0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [captureTargets, setCaptureTargets] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    loadPuzzle();
  }, [puzzleId]);

  const loadPuzzle = async () => {
    try {
      const data = await puzzleAPI.getById(puzzleId);
      setPuzzle(data);
      const chess = new Chess(data.fen);
      setGame(chess);
      setSelectedSquare(null);
      setLegalTargets([]);
      setCaptureTargets([]);
      setLastMove(null);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Failed to load puzzle:', error);
      toast.error('Failed to load puzzle');
      router.push('/puzzles');
    } finally {
      setIsLoading(false);
    }
  };

  const getLegalTargets = (square: string) => {
    if (!game || isCorrect !== null) return [];
    const piece = game.get(square);
    if (!piece || piece.color !== game.turn()) return [];
    const moves = game.moves({ square, verbose: true });
    return moves.map((move) => ({
      to: move.to,
      isCapture: Boolean(move.captured) || move.flags.includes('e'),
    }));
  };

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    if (!game || !puzzle || isCorrect !== null) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      const newMoves = [...movesMade, `${sourceSquare}${targetSquare}`];
      setMovesMade(newMoves);
      setGame(new Chess(game.fen()));
      setLastMove({ from: sourceSquare, to: targetSquare });
      setSelectedSquare(null);
      setLegalTargets([]);
      setCaptureTargets([]);

      const solutionMoves = normalizePuzzleMoves(puzzle.fen, puzzle.moves);
      const isComplete = newMoves.length >= solutionMoves.length;

      if (isComplete) {
        handlePuzzleSolved(newMoves);
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  const handleSquareClick = (square: string) => {
    if (!game || isCorrect !== null) return;

    if (!selectedSquare) {
      const targets = getLegalTargets(square);
      if (targets.length === 0) return;
      setSelectedSquare(square);
      setLegalTargets(targets.filter((move) => !move.isCapture).map((move) => move.to));
      setCaptureTargets(targets.filter((move) => move.isCapture).map((move) => move.to));
      return;
    }

    if (square === selectedSquare) {
      setSelectedSquare(null);
      setLegalTargets([]);
      setCaptureTargets([]);
      return;
    }

    if (legalTargets.includes(square) || captureTargets.includes(square)) {
      void onDrop(selectedSquare, square);
      return;
    }

    const targets = getLegalTargets(square);
    if (targets.length > 0) {
      setSelectedSquare(square);
      setLegalTargets(targets.filter((move) => !move.isCapture).map((move) => move.to));
      setCaptureTargets(targets.filter((move) => move.isCapture).map((move) => move.to));
    } else {
      setSelectedSquare(null);
      setLegalTargets([]);
      setCaptureTargets([]);
    }
  };

  const handlePuzzleSolved = async (moves: string[]) => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    try {
      const result = await puzzleAPI.submitAttempt(
        puzzle!.id,
        {
          is_solved: true,
          moves_made: moves.join(' '),
          time_taken: timeTaken,
        },
        assignmentIdForApi != null
          ? { assignmentId: assignmentIdForApi }
          : undefined
      );

      setIsCorrect(result.is_solved);

      if (result.is_solved) {
        toast.success(`Correct! +${result.xp_earned} XP 🎉`, { duration: 5000 });
        if (user) {
          const newXP = user.total_xp + result.xp_earned;
          updateUser({ total_xp: newXP });
        }
      } else {
        toast.error('Not quite right. Try again!');
      }
    } catch (error) {
      console.error('Failed to submit puzzle attempt:', error);
      toast.error('Failed to save your attempt');
    }
  };

  const goToNextPuzzleInSameDifficultyAndTheme = async () => {
    if (!puzzle) return;

    try {
      if (mode === 'random') {
        const list = await puzzleAPI.getAll(
          selectedDifficulty || undefined,
          'healthyMix',
          0,
          200,
          { excludeAttempted: true }
        );
        if (list.length === 0) {
          toast.error('No more unseen random puzzles found right now.');
          router.push('/puzzles/solve');
          return;
        }
        const nextPuzzle = list[Math.floor(Math.random() * list.length)];
        const params = new URLSearchParams();
        if (assignmentIdForApi != null) params.set('assignment_id', String(assignmentIdForApi));
        if (selectedDifficulty) params.set('difficulty', selectedDifficulty);
        params.set('mode', 'random');
        router.push(`/puzzles/${nextPuzzle.id}?${params.toString()}`);
        return;
      }

      const effectiveTheme = selectedTheme || parseThemeList(puzzle.theme)[0] || 'fork';
      const nextPuzzle = await puzzleAPI.getNext({
        difficulty: selectedDifficulty,
        theme: effectiveTheme,
        currentPuzzleId: puzzle.id,
        excludeAttempted: true,
      });
      const params = new URLSearchParams();
      if (assignmentIdForApi != null) params.set('assignment_id', String(assignmentIdForApi));
      if (selectedDifficulty) params.set('difficulty', selectedDifficulty);
      params.set('theme', effectiveTheme);
      router.push(`/puzzles/${nextPuzzle.id}?${params.toString()}`);
    } catch (error) {
      console.error('Failed to load next puzzle:', error);
      router.push(mode === 'random' ? '/puzzles/solve' : '/puzzles/themes');
    }
  };

  const resetPuzzle = () => {
    if (puzzle) {
      const chess = new Chess(puzzle.fen);
      setGame(chess);
      setMovesMade([]);
      setIsCorrect(null);
      setSelectedSquare(null);
      setLegalTargets([]);
      setCaptureTargets([]);
      setLastMove(null);
      setStartTime(Date.now());
    }
  };

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: 'rgba(255,255,0,0.35)' };
      styles[lastMove.to] = { backgroundColor: 'rgba(255,255,0,0.35)' };
    }

    if (selectedSquare) {
      styles[selectedSquare] = {
        ...(styles[selectedSquare] || {}),
        backgroundColor: 'rgba(190,242,100,0.38)',
      };
    }

    legalTargets.forEach((square) => {
      styles[square] = {
        ...(styles[square] || {}),
        backgroundImage: 'radial-gradient(circle, rgba(163,230,53,0.82) 18%, rgba(163,230,53,0) 22%)',
      };
    });

    captureTargets.forEach((square) => {
      styles[square] = {
        ...(styles[square] || {}),
        backgroundColor: 'rgba(251,191,36,0.45)',
      };
    });

    return styles;
  }, [captureTargets, lastMove, legalTargets, selectedSquare]);

  if (isLoading || !puzzle || !game) {
    return (
      <div className="mx-auto max-w-6xl flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-heading font-semibold text-muted-foreground">Loading puzzle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl p-2 shadow-xl border-2 border-border">
            <div className="mx-auto w-full max-w-[min(100%,410px)] sm:max-w-[480px]">
              {game && puzzle && (
                <Chessboard
                  key={game.fen()}
                  options={{
                    position: game.fen(),
                    onPieceDrop: ({ sourceSquare, targetSquare }) =>
                      sourceSquare && targetSquare ? onDrop(sourceSquare, targetSquare) : false,
                    onSquareClick: ({ square }) => {
                      if (!square) return;
                      handleSquareClick(square);
                    },
                    boardStyle: {
                      borderRadius: '12px',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.22)',
                    },
                    squareStyles,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <HintSystem
            puzzleId={puzzleId}
            fen={game.fen()}
            userXP={userXP}
            onXPDeducted={(newXP) => {
              setUserXP(newXP);
              if (user) updateUser({ total_xp: newXP });
            }}
          />

          {isCorrect !== null && (
            <div
              className={`p-3 rounded-xl border-2 ${
                isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <>
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-green-800 text-sm">Correct!</p>
                      <p className="font-sans text-green-700 text-xs">Well done! 🎉</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <X className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-red-800 text-sm">Not quite!</p>
                      <p className="font-sans text-red-700 text-xs">Try again</p>
                    </div>
                  </>
                )}
              </div>
              
              {isCorrect && (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={
                      assignmentIdForApi != null
                        ? `/assignments/${assignmentIdForApi}`
                        : '/puzzles/solve'
                    }
                    className="bg-muted hover:bg-muted/80 text-muted-foreground font-heading font-bold py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm text-xs"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Home
                  </Link>
                  <button
                    type="button"
                    onClick={goToNextPuzzleInSameDifficultyAndTheme}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-bold py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 text-xs"
                  >
                    <Trophy className="w-3 h-3" />
                    Next Puzzle
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="bg-card rounded-xl p-3 shadow-lg border-2 border-border">
            <h3 className="font-heading font-bold text-foreground mb-2 text-sm">Puzzle Info</h3>
            <div className="space-y-1.5">
              <div>
                <p className="font-sans text-xs text-muted-foreground mb-0.5">Difficulty</p>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-heading font-bold border-2 ${getDifficultyColor(
                    puzzle.difficulty
                  )}`}
                >
                  {puzzle.difficulty}
                </span>
              </div>
              {parseThemeList(puzzle.theme).length > 0 && (
                <div>
                  <p className="font-sans text-xs text-muted-foreground mb-0.5">Theme</p>
                  <div className="flex flex-wrap gap-1">
                    {parseThemeList(puzzle.theme).map((t) => (
                      <span key={t} className="inline-block px-2 py-0.5 rounded-full text-xs font-heading font-bold bg-blue-100 text-blue-800 border-2 border-blue-300 capitalize">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="font-sans text-xs text-muted-foreground">Rating:</span>
                <span className="font-heading font-bold text-foreground text-xs">{puzzle.rating}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-sans text-xs text-muted-foreground">Success:</span>
                <span className="font-heading font-bold text-foreground text-xs">
                  {puzzle.attempts_count > 0
                    ? Math.round((puzzle.success_count / puzzle.attempts_count) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={resetPuzzle}
              disabled={isCorrect !== null}
              className="w-full bg-muted hover:bg-muted/80 text-muted-foreground font-heading font-bold py-1.5 px-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 shadow-lg text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="bg-card rounded-xl p-3 shadow-lg border-2 border-border">
            <h3 className="font-heading font-bold text-foreground mb-1.5 text-sm">Progress</h3>
            <div className="space-y-1 font-sans text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Moves:</span>
                <span className="font-heading font-bold text-foreground">{movesMade.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-heading font-bold text-foreground">
                  {Math.floor((Date.now() - startTime) / 1000)}s
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PuzzleSolvePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-heading font-semibold text-muted-foreground">Loading puzzle...</p>
          </div>
        </div>
      }
    >
      <PuzzleSolvePageContent />
    </Suspense>
  );
}
