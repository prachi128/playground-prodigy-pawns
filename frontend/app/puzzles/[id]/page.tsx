// app/puzzles/[id]/page.tsx - Full Page Puzzle Solver

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { puzzleAPI, Puzzle } from '@/lib/api';
import { getDifficultyColor, getThemeEmoji } from '@/lib/utils';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { ArrowLeft, Lightbulb, RotateCcw, Check, X, Star, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import HintSystem from '@/components/HintSystem';

export default function PuzzleSolvePage() {
  const router = useRouter();
  const params = useParams();
  const puzzleId = parseInt(params.id as string);
  
  const { user, updateUser } = useAuthStore();
  
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [game, setGame] = useState<Chess | null>(null);
  const [movesMade, setMovesMade] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userXP, setUserXP] = useState(user?.xp || 0);

  useEffect(() => {
    loadPuzzle();
  }, [puzzleId]);

  const loadPuzzle = async () => {
    try {
      const data = await puzzleAPI.getById(puzzleId);
      console.log('Puzzle loaded:', data);
      console.log('FEN position:', data.fen);
      setPuzzle(data);
      const chess = new Chess(data.fen);
      console.log('Chess position loaded:', chess.fen());
      setGame(chess);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Failed to load puzzle:', error);
      toast.error('Failed to load puzzle');
      router.push('/puzzles');
    } finally {
      setIsLoading(false);
    }
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

      // Check if solution is correct
      const solutionMoves = puzzle.moves.split(' ');
      const isComplete = newMoves.length >= solutionMoves.length;
      const isSolutionCorrect = newMoves.every((m, i) => {
        const sol = solutionMoves[i];
        return m === sol || m === sol.replace(/[+=]/, '');
      });

      if (isComplete) {
        handlePuzzleSolved(isSolutionCorrect, newMoves);
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  const handlePuzzleSolved = async (solved: boolean, moves: string[]) => {
    setIsCorrect(solved);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    try {
      const result = await puzzleAPI.submitAttempt(puzzle!.id, {
        is_solved: solved,
        moves_made: moves.join(' '),
        time_taken: timeTaken,
        hints_used: hintsUsed,
      });

      if (solved) {
        toast.success(`Correct! +${result.xp_earned} XP 🎉`, { duration: 5000 });
        // Update user XP in store
        if (user) {
          const newXP = user.total_xp + result.xp_earned;
          const newLevel = Math.floor(newXP / 100) + 1;
          updateUser({ total_xp: newXP, level: newLevel });
        }
      } else {
        toast.error('Not quite right. Try again!');
      }
    } catch (error) {
      console.error('Failed to submit puzzle attempt:', error);
      toast.error('Failed to save your attempt');
    }
  };

  const showHint = () => {
    if (!puzzle) return;
    
    const solutionMoves = puzzle.moves.split(' ');
    if (movesMade.length < solutionMoves.length) {
      const nextMove = solutionMoves[movesMade.length];
      toast(`Hint: Try moving from ${nextMove.substring(0, 2)} to ${nextMove.substring(2, 4)}`, {
        icon: '💡',
        duration: 5000,
      });
      setHintsUsed(hintsUsed + 1);
    }
  };

  const resetPuzzle = () => {
    if (puzzle) {
      const chess = new Chess(puzzle.fen);
      setGame(chess);
      setMovesMade([]);
      setIsCorrect(null);
      setStartTime(Date.now());
      setHintsUsed(0);
    }
  };

  if (isLoading || !puzzle || !game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading puzzle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-2">
        {/* Header */}
        <div className="mb-2">
          <Link
            href="/puzzles"
            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-semibold text-xs mb-2"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-800 mb-0.5">
                {getThemeEmoji(puzzle.theme)} {puzzle.title}
              </h1>
              <p className="text-gray-600 text-xs">{puzzle.description}</p>
            </div>
            <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full border-2 border-yellow-300">
              <Star className="w-3 h-3 text-yellow-600 fill-current" />
              <span className="font-bold text-yellow-700 text-xs">{puzzle.xp_reward} XP</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-3">
          {/* Chess Board - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-2 shadow-xl border-3 border-gray-200">
              <div className="w-full max-w-[350px] mx-auto">
                {game && puzzle && (
                  <Chessboard
                    key={game.fen()}
                    options={{
                      position: game.fen(),
                      onPieceDrop: ({ sourceSquare, targetSquare }) =>
                        sourceSquare && targetSquare ? onDrop(sourceSquare, targetSquare) : false,
                      boardStyle: {
                        borderRadius: '8px',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                      },
                      darkSquareStyle: { backgroundColor: '#9333ea' },
                      lightSquareStyle: { backgroundColor: '#e9d5ff' },
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Info Panel - Takes 1 column */}
          <div className="space-y-2">
            <HintSystem
              puzzleId={puzzleId}
              fen={puzzle.fen}
              userXP={userXP}
              onXPDeducted={(newXP) => setUserXP(newXP)}
            />

            {/* Status Card */}
            {isCorrect !== null && (
              <div
                className={`p-3 rounded-xl border-3 ${
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
                        <p className="font-bold text-green-800 text-sm">Correct!</p>
                        <p className="text-green-700 text-xs">Well done! 🎉</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <X className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-red-800 text-sm">Not quite!</p>
                        <p className="text-red-700 text-xs">Try again</p>
                      </div>
                    </>
                  )}
                </div>
                
                {isCorrect && (
                  <Link
                    href="/puzzles"
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 text-xs"
                  >
                    <Trophy className="w-3 h-3" />
                    Next Puzzle
                  </Link>
                )}
              </div>
            )}

            {/* Puzzle Info */}
            <div className="bg-white rounded-xl p-3 shadow-lg border-3 border-gray-200">
              <h3 className="font-bold text-gray-800 mb-2 text-sm">Puzzle Info</h3>
              
              <div className="space-y-1.5">
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Difficulty</p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border-2 ${getDifficultyColor(
                      puzzle.difficulty
                    )}`}
                  >
                    {puzzle.difficulty}
                  </span>
                </div>

                {puzzle.theme && (
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Theme</p>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border-2 border-blue-300">
                      {puzzle.theme}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Rating:</span>
                  <span className="font-bold text-gray-800 text-xs">{puzzle.rating}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Success:</span>
                  <span className="font-bold text-gray-800 text-xs">
                    {puzzle.attempts_count > 0
                      ? Math.round((puzzle.success_count / puzzle.attempts_count) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={showHint}
                disabled={isCorrect !== null}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1.5 px-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 shadow-lg text-xs"
              >
                <Lightbulb className="w-3 h-3" />
                Hint (-2 XP)
              </button>

              <button
                onClick={resetPuzzle}
                disabled={isCorrect !== null}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-1.5 px-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 shadow-lg text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-xl p-3 shadow-lg border-3 border-gray-200">
              <h3 className="font-bold text-gray-800 mb-1.5 text-sm">Progress</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Moves:</span>
                  <span className="font-bold text-gray-800">{movesMade.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hints:</span>
                  <span className="font-bold text-gray-800">{hintsUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-bold text-gray-800">
                    {Math.floor((Date.now() - startTime) / 1000)}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

