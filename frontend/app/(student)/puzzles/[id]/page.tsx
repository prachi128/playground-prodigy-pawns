// app/(student)/puzzles/[id]/page.tsx - Full Page Puzzle Solver (student theme, dashboard layout)

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { puzzleAPI, Puzzle } from '@/lib/api';
import {
  applyOpponentReplies,
  formatPlayedUci,
  initializePuzzlePlayState,
  parseThemeList,
  resolvePuzzleFormat,
} from '@/lib/utils';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { RotateCcw, Check, X, Trophy, ArrowLeft, RefreshCw, Settings, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import HintSystem from '@/components/HintSystem';
import { getShopBoardSquareStyles } from '@/lib/shop-cosmetics';

function PuzzleSolvePageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const puzzleId = parseInt(params.id as string);
  const assignmentIdRaw = searchParams.get('assignment_id');
  const selectedDifficulty = searchParams.get('difficulty') ?? '';
  const selectedTheme = searchParams.get('theme') ?? '';
  const mode = searchParams.get('mode') ?? '';
  const currentStreak = Number.parseInt(searchParams.get('streak') ?? '0', 10) || 0;
  const bestStreak = Number.parseInt(searchParams.get('best') ?? '0', 10) || 0;
  const isStreakMode = mode === 'streak';
  const nextStreak = currentStreak + 1;
  const streakBestAfterSolve = Math.max(bestStreak, nextStreak);
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
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [moveFeedback, setMoveFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);

  const shopBoardSquareStyles = useMemo(
    () => getShopBoardSquareStyles(user?.equipped_board_theme_item_key),
    [user?.equipped_board_theme_item_key],
  );

  useEffect(() => {
    loadPuzzle();
  }, [puzzleId]);

  const loadPuzzle = async () => {
    try {
      const data = await puzzleAPI.getById(puzzleId);
      setPuzzle(data);
      const playState = initializePuzzlePlayState(
        data.fen,
        data.moves,
        resolvePuzzleFormat(data),
      );
      setSolutionMoves(playState.solutionMoves);
      setGame(new Chess(playState.displayFen));
      setPlayerColor(playState.playerColor);
      setMovesMade(playState.movesMade);
      setLastMove(playState.lastMove);
      setSelectedSquare(null);
      setLegalTargets([]);
      setCaptureTargets([]);
      setMoveFeedback(null);
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
    if (game.turn() !== playerColor) return [];
    const piece = game.get(square as any);
    if (!piece || piece.color !== game.turn() || piece.color !== playerColor) return [];
    const moves = game.moves({ square: square as any, verbose: true });
    return moves.map((move: any) => ({
      to: move.to,
      isCapture: Boolean(move.captured) || move.flags.includes('e'),
    }));
  };

  const submitIncorrectAttempt = async (moves: string[]) => {
    if (!puzzle) return;
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    try {
      await puzzleAPI.submitAttempt(
        puzzle.id,
        {
          is_solved: false,
          moves_made: moves.join(' '),
          time_taken: timeTaken,
        },
        assignmentIdForApi != null ? { assignmentId: assignmentIdForApi } : undefined
      );
    } catch {
      // Keep gameplay smooth even if analytics submission fails.
    }
  };

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    if (!game || !puzzle || isCorrect !== null) return false;
    if (game.turn() !== playerColor) return false;

    try {
      const workingGame = new Chess(game.fen());
      const move = workingGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      const attemptedMove = formatPlayedUci(move);
      const expectedMove = solutionMoves[movesMade.length];

      if (!expectedMove || attemptedMove !== expectedMove) {
        setMoveFeedback('wrong');
        if (isStreakMode) {
          setIsCorrect(false);
        }
        void submitIncorrectAttempt([...movesMade, attemptedMove]);
        toast.error(
          isStreakMode
            ? `Streak over at ${currentStreak}. Start a new run!`
            : 'Oops! Not the puzzle move. Try again!'
        );
        return false;
      }

      let updatedMoves = [...movesMade, attemptedMove];
      let latestMove = { from: sourceSquare, to: targetSquare };
      setMoveFeedback('correct');
      setTimeout(() => setMoveFeedback(null), 1200);

      const replies = applyOpponentReplies(workingGame, solutionMoves, updatedMoves, playerColor);
      updatedMoves = replies.movesMade;
      if (replies.lastMove) latestMove = replies.lastMove;

      setMovesMade(updatedMoves);
      setGame(workingGame);
      setLastMove(latestMove);
      setSelectedSquare(null);
      setLegalTargets([]);
      setCaptureTargets([]);
      const isComplete = updatedMoves.length >= solutionMoves.length;

      if (isComplete) {
        handlePuzzleSolved(updatedMoves);
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
      if (mode === 'random' || mode === 'streak') {
        const list = await puzzleAPI.getAll(
          selectedDifficulty || undefined,
          'healthyMix',
          0,
          200,
          { excludeAttempted: true }
        );
        if (list.length === 0) {
          toast.error(`No more unseen ${isStreakMode ? 'streak' : 'random'} puzzles found right now.`);
          router.push(isStreakMode ? '/puzzles/streak' : '/puzzles/solve');
          return;
        }
        const nextPuzzle = list[Math.floor(Math.random() * list.length)];
        const params = new URLSearchParams();
        if (assignmentIdForApi != null) params.set('assignment_id', String(assignmentIdForApi));
        if (selectedDifficulty) params.set('difficulty', selectedDifficulty);
        params.set('mode', isStreakMode ? 'streak' : 'random');
        if (isStreakMode) {
          params.set('streak', String(nextStreak));
          params.set('best', String(streakBestAfterSolve));
        }
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
      router.push(
        mode === 'random'
          ? '/puzzles/solve'
          : mode === 'streak'
            ? '/puzzles/streak'
            : '/puzzles/themes'
      );
    }
  };

  const resetPuzzle = () => {
    if (puzzle) {
      const playState = initializePuzzlePlayState(
        puzzle.fen,
        puzzle.moves,
        resolvePuzzleFormat(puzzle),
      );
      setSolutionMoves(playState.solutionMoves);
      setGame(new Chess(playState.displayFen));
      setPlayerColor(playState.playerColor);
      setMovesMade(playState.movesMade);
      setIsCorrect(null);
      setSelectedSquare(null);
      setLegalTargets([]);
      setCaptureTargets([]);
      setLastMove(playState.lastMove);
      setMoveFeedback(null);
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

  const sideToMoveLabel = playerColor === 'w' ? 'White to move' : 'Black to move';

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
          <div className="relative bg-card rounded-xl p-2 shadow-xl border-2 border-border">
            <div className="absolute right-2 top-3 z-20 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsBoardFlipped((prev) => !prev)}
                aria-label="Flip board"
                title="Flip board"
                className="h-8 w-8 rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                <RefreshCw className="mx-auto h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => toast('Board settings coming soon!', { icon: '⚙️' })}
                aria-label="Board settings"
                title="Board settings"
                className="h-8 w-8 rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                <Settings className="mx-auto h-4 w-4" />
              </button>
            </div>
            <div className="mx-auto w-full max-w-[min(100%,410px)] sm:max-w-[480px]">
              {game && puzzle && (
                <Chessboard
                  key={game.fen()}
                  options={{
                    position: game.fen(),
                    allowDragging: isCorrect === null,
                    canDragPiece: ({ square }) => {
                      if (!square || isCorrect !== null || game.turn() !== playerColor) return false;
                      const piece = game.get(square as any);
                      return Boolean(piece && piece.color === playerColor);
                    },
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
                    boardOrientation: isBoardFlipped ? 'black' : 'white',
                    darkSquareStyle: shopBoardSquareStyles.darkSquareStyle,
                    lightSquareStyle: shopBoardSquareStyles.lightSquareStyle,
                    squareStyles,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {isStreakMode && (
            <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold text-orange-900">Puzzle Streak</p>
                    <p className="text-xs font-semibold text-orange-700">Miss once and the run ends.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-heading text-2xl font-black text-orange-600">{currentStreak}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-orange-700">
                    Best {Math.max(bestStreak, currentStreak)}
                  </p>
                </div>
              </div>
            </div>
          )}

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
                      <p className="font-sans text-green-700 text-xs">
                        {isStreakMode ? `Streak is now ${nextStreak}. Keep it going!` : 'Well done! 🎉'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <X className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-red-800 text-sm">
                        {isStreakMode ? 'Streak ended!' : 'Not quite!'}
                      </p>
                      <p className="font-sans text-red-700 text-xs">
                        {isStreakMode ? `You finished with a streak of ${currentStreak}.` : 'Try again'}
                      </p>
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
                        : isStreakMode
                          ? '/puzzles/streak'
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

              {isCorrect === false && isStreakMode && (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/puzzles"
                    className="bg-muted hover:bg-muted/80 text-muted-foreground font-heading font-bold py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm text-xs"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Home
                  </Link>
                  <Link
                    href="/puzzles/streak"
                    className="bg-orange-500 hover:bg-orange-600 text-white font-heading font-bold py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 text-xs"
                  >
                    <Flame className="w-3 h-3" />
                    New Streak
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-xl p-3 shadow-lg border-2 border-amber-200">
            <div className="flex items-start gap-2">
              <div className="w-9 h-9 rounded-full bg-amber-300 flex items-center justify-center text-lg flex-shrink-0">
                🦊
              </div>
              <div className="flex-1">
                <p className="font-heading font-bold text-amber-900 text-sm mb-1">{sideToMoveLabel}</p>
                <p
                  className={`font-sans text-xs ${
                    moveFeedback === 'correct'
                      ? 'text-green-700'
                      : moveFeedback === 'wrong'
                        ? 'text-red-700'
                        : 'text-amber-800'
                  }`}
                >
                  {isCorrect
                    ? isStreakMode
                      ? `Awesome! Your streak is ${nextStreak}. Ready for the next one?`
                      : 'You did it, superstar! Ready for another puzzle adventure?'
                    : moveFeedback === 'correct'
                      ? 'Great move! Nice thinking! 🌟'
                      : moveFeedback === 'wrong'
                        ? isStreakMode
                          ? 'That miss ends the streak. Start a fresh run and beat your score!'
                          : 'That one is not the puzzle move. Try a different idea!'
                        : 'Pick a smart move and surprise Coach Fox. You can do it!'}
                </p>
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

          {isCorrect && (
            <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 rounded-xl p-3 shadow-lg border-2 border-pink-300">
              <div className="flex items-start gap-2">
                <div className="text-2xl animate-bounce">🎉</div>
                <div>
                  <p className="font-heading font-bold text-purple-900 text-sm">
                    {isStreakMode ? `Hooray! Streak ${nextStreak}!` : 'Hooray! Puzzle Complete!'}
                  </p>
                  <p className="font-sans text-purple-800 text-xs">
                    {isStreakMode
                      ? 'You are on a roll. Keep solving to push your streak higher!'
                      : 'Congratulations, champ! You solved it perfectly. Keep shining!'}
                  </p>
                  <p className="font-sans text-sm mt-1">🥳 ⭐ 🎊</p>
                </div>
              </div>
            </div>
          )}
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
