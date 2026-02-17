// app/coach/puzzles/[id]/page.tsx - View/Edit Puzzle Page

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { coachAPI, Puzzle } from '@/lib/api';
import { ArrowLeft, Save, Eye, Brain } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { getDifficultyColor } from '@/lib/utils';

export default function EditPuzzlePage() {
  const router = useRouter();
  const params = useParams();
  const puzzleId = parseInt(params.id as string);
  
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fen, setFen] = useState('');
  const [moves, setMoves] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [theme, setTheme] = useState('');
  const [xpReward, setXpReward] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tacticalPosition, setTacticalPosition] = useState<string>('');

  useEffect(() => {
    loadPuzzle();
  }, [puzzleId]);

  // Calculate tactical position (position after applying solution moves)
  useEffect(() => {
    if (!fen.trim()) {
      setTacticalPosition('');
      return;
    }

    try {
      const chess = new Chess(fen.trim());
      const initialFen = chess.fen();
      
      // Parse moves - handle both space-separated and single move
      if (moves.trim()) {
        const movesList = moves.trim().split(/\s+/).filter(m => m.length > 0);
        console.log('Applying moves to get tactical position:', movesList);
        
        // Apply each move to get to the tactical position
        for (const moveStr of movesList) {
          const cleanMove = moveStr.trim();
          
          if (cleanMove.length === 0) continue;
          
          let moveApplied = false;
          
          // Try SAN notation first (most common format in database)
          // chess.js can parse SAN notation like "Nxe5", "Re8#", "Bxf7+", etc.
          try {
            const sanMove = chess.move(cleanMove);
            if (sanMove) {
              moveApplied = true;
              console.log(`Applied SAN move: ${cleanMove} -> ${sanMove.san}`);
            }
          } catch (sanError) {
            // SAN parsing failed, try UCI format
          }
          
          // If SAN failed, try UCI format (e.g., "e2e4", "f3e5")
          if (!moveApplied) {
            // UCI format: exactly 4 chars (from square + to square) or 5 chars (with promotion)
            if (cleanMove.length === 4 || cleanMove.length === 5) {
              const fromSquare = cleanMove.substring(0, 2);
              const toSquare = cleanMove.substring(2, 4);
              const promotion = cleanMove.length === 5 ? cleanMove[4].toLowerCase() : undefined;
              
              // Validate squares are valid chess squares
              if (/^[a-h][1-8]$/.test(fromSquare) && /^[a-h][1-8]$/.test(toSquare)) {
                try {
                  const uciMove = chess.move({
                    from: fromSquare,
                    to: toSquare,
                    promotion: promotion && ['q', 'r', 'b', 'n'].includes(promotion) ? promotion : undefined,
                  });
                  
                  if (uciMove) {
                    moveApplied = true;
                    console.log(`Applied UCI move: ${cleanMove} -> ${uciMove.san}`);
                  }
                } catch (uciError) {
                  // UCI parsing also failed
                }
              }
            }
          }
          
          // If neither format worked, log warning and stop
          if (!moveApplied) {
            console.warn(`Failed to apply move: ${cleanMove}. Position will show up to this point.`);
            break;
          }
        }
      } else {
        console.log('No moves to apply, showing initial position');
      }
      
      const finalFen = chess.fen();
      console.log('Tactical position calculated:', { initialFen, finalFen, movesApplied: moves.trim() });
      
      // Always set the tactical position (even if no moves were applied, it's the initial position)
      setTacticalPosition(finalFen);
    } catch (error) {
      console.error('Failed to calculate tactical position:', error);
      // Fallback to showing the initial FEN if tactical position calculation fails
      setTacticalPosition(fen);
    }
  }, [fen, moves]);

  const loadPuzzle = async () => {
    setIsLoading(true);
    try {
      // Use the coach API to get puzzle details
      const data = await coachAPI.getAllPuzzles(true);
      const foundPuzzle = data.find((p: Puzzle) => p.id === puzzleId);
      
      if (!foundPuzzle) {
        toast.error('Puzzle not found');
        router.push('/coach/puzzles');
        return;
      }

      setPuzzle(foundPuzzle);
      setTitle(foundPuzzle.title);
      setDescription(foundPuzzle.description || '');
      setFen(foundPuzzle.fen);
      setMoves(foundPuzzle.moves);
      setDifficulty(foundPuzzle.difficulty);
      setTheme(foundPuzzle.theme || '');
      setXpReward(foundPuzzle.xp_reward);
      setIsActive(foundPuzzle.is_active);
    } catch (error) {
      console.error('Failed to load puzzle:', error);
      toast.error('Failed to load puzzle');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeFEN = async () => {
    if (!fen.trim()) {
      toast.error('Please enter a FEN position');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await coachAPI.autoSolve(fen);
      
      // Update fields with Stockfish analysis
      setMoves(result.best_move);
      setDifficulty(result.suggested_difficulty.toLowerCase());
      
      toast.success('✓ Position analyzed! Solution updated');
    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to analyze position');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!fen.trim()) {
      toast.error('Please enter a FEN position');
      return;
    }

    setIsSaving(true);
    try {
      await coachAPI.updatePuzzle(puzzleId, {
        title,
        description: description || undefined,
        fen,
        moves,
        difficulty: difficulty.toUpperCase(),
        theme: theme || undefined,
        xp_reward: xpReward,
        is_active: isActive,
      });

      toast.success('Puzzle updated successfully! 🎉');
      router.push('/coach/puzzles');
    } catch (error: any) {
      console.error('Failed to update puzzle:', error);
      toast.error(error.response?.data?.detail || 'Failed to update puzzle');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !puzzle) {
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
      <div className="max-w-6xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/coach/puzzles"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Manage Puzzles
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isActive ? '✏️' : '🔒'} Edit Puzzle #{puzzleId}
          </h1>
          <p className="text-gray-600">
            View and edit puzzle details
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-4">
            {/* Puzzle Details Card */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-4 border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                📝 Puzzle Details
              </h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none resize-none"
                  />
                </div>

                {/* FEN Position */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    FEN Position *
                  </label>
                  <textarea
                    value={fen}
                    onChange={(e) => setFen(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none font-mono text-xs resize-none"
                  />
                </div>

                {/* Solution Moves */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Solution Moves
                  </label>
                  <input
                    type="text"
                    value={moves}
                    onChange={(e) => setMoves(e.target.value)}
                    placeholder="e.g., e2e4"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none font-mono text-sm"
                  />
                </div>

                {/* Re-analyze Button */}
                <button
                  onClick={analyzeFEN}
                  disabled={isAnalyzing || !fen.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-2 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-sm"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      Re-analyze with Stockfish
                    </>
                  )}
                </button>

                {/* Difficulty & Theme */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Difficulty
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none text-sm"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      XP Reward
                    </label>
                    <input
                      type="number"
                      value={xpReward}
                      onChange={(e) => setXpReward(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Theme
                  </label>
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g., fork, pin, checkmate"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none text-sm"
                  />
                </div>

                {/* Active Status */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-bold text-gray-700">
                      Puzzle is Active (visible to students)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim() || !fen.trim()}
              className="w-full bg-gradient-to-r from-primary-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:from-primary-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>

          {/* Right Column - Chess Board Preview & Stats */}
          <div className="space-y-4">
            {/* Board Preview */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-4 border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                📋 Board Preview
              </h2>
              
              <div className="w-full max-w-[400px] mx-auto">
                {(tacticalPosition || fen.trim()) ? (
                  <Chessboard
                    key={tacticalPosition || fen}
                    options={{
                      position: tacticalPosition || fen,
                      boardStyle: {
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                      },
                      darkSquareStyle: { backgroundColor: '#9333ea' },
                      lightSquareStyle: { backgroundColor: '#e9d5ff' },
                    }}
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
                    <p className="text-gray-400 text-center text-sm">
                      Enter a FEN position to see preview
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-bold text-gray-700 mb-1">Current Difficulty:</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border-2 capitalize ${getDifficultyColor(difficulty)}`}>
                  {difficulty}
                </span>
              </div>
            </div>

            {/* Puzzle Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-4 border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                📊 Statistics
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Attempts:</span>
                  <span className="font-bold text-gray-800">{puzzle.attempts_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Successful:</span>
                  <span className="font-bold text-green-600">{puzzle.success_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Success Rate:</span>
                  <span className="font-bold text-primary-600">
                    {puzzle.attempts_count > 0
                      ? `${Math.round((puzzle.success_count / puzzle.attempts_count) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Rating:</span>
                  <span className="font-bold text-gray-800">{puzzle.rating}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
