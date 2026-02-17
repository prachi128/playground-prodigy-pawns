// app/coach/puzzles/create/page.tsx - Create Puzzle with Stockfish

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { coachAPI } from '@/lib/api';
import { ArrowLeft, Sparkles, Target, Brain, Zap } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface StockfishAnalysis {
  best_move: string;
  evaluation: any;
  top_moves: any[];
  is_mate: boolean;
  suggested_difficulty: string;
}

export default function CreatePuzzlePage() {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fen, setFen] = useState('');
  const [analysis, setAnalysis] = useState<StockfishAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [game, setGame] = useState<Chess | null>(null);

  // Update chess game instance when FEN changes
  useEffect(() => {
    if (fen.trim()) {
      try {
        const chess = new Chess(fen.trim());
        setGame(chess);
      } catch (error) {
        // Invalid FEN, reset game
        setGame(null);
      }
    } else {
      setGame(null);
    }
  }, [fen]);

  const analyzeFEN = async () => {
    if (!fen.trim()) {
      toast.error('Please enter a FEN position');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await coachAPI.autoSolve(fen);
      setAnalysis(result);
      toast.success('Position analyzed! ✓');
    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to analyze position');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createPuzzle = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!fen.trim()) {
      toast.error('Please enter a FEN position');
      return;
    }

    setIsCreating(true);
    try {
      const newPuzzle = await coachAPI.createPuzzle({
        title,
        description: description || undefined,
        fen,
      });

      toast.success(`Puzzle created! ID: ${newPuzzle.id} 🎉`);
      router.push('/coach/puzzles');
    } catch (error: any) {
      console.error('Failed to create puzzle:', error);
      toast.error(error.response?.data?.detail || 'Failed to create puzzle');
    } finally {
      setIsCreating(false);
    }
  };

  const useSampleFEN = () => {
    const sample = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    setFen(sample);
    setTitle('Sample Tactical Position');
    setDescription('Find the best move in this tactical position');
  };

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    if (!game) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Default to queen promotion
      });

      if (move === null) {
        toast.error('Invalid move');
        return false;
      }

      // Get the updated FEN after the move
      const newFen = game.fen();
      
      // Update game state with new position
      setGame(new Chess(newFen));
      
      // Update FEN to reflect the new position
      setFen(newFen);
      
      // Check if this matches the suggested best move
      const moveNotation = `${sourceSquare}${targetSquare}`;
      const bestMove = analysis?.best_move?.toLowerCase().replace(/[+=x]/, '');
      if (analysis && bestMove && moveNotation === bestMove) {
        toast.success('Correct! This matches the suggested best move ✓');
      }

      return true;
    } catch (error) {
      toast.error('Invalid move');
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/coach"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Coach Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ➕ Create New Puzzle
          </h1>
          <p className="text-gray-600">
            Paste a FEN position and Stockfish will auto-generate the solution
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-4">
            {/* Puzzle Details Card */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-4 border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary-600" />
                Puzzle Details
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
                    placeholder="e.g., Knight Fork Tactic"
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
                    placeholder="Brief description of the puzzle..."
                    rows={3}
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
                    placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none font-mono text-sm resize-none"
                  />
                  <button
                    onClick={useSampleFEN}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    Use Sample FEN
                  </button>
                </div>

                {/* Analyze Button */}
                <button
                  onClick={analyzeFEN}
                  disabled={isAnalyzing || !fen.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Analyze with Stockfish
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Stockfish Analysis Results */}
            {analysis && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 shadow-lg border-4 border-purple-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Stockfish Analysis
                </h3>

                <div className="space-y-3">
                  {/* Best Move */}
                  <div className="bg-white p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Best Move</p>
                    <p className="text-2xl font-bold text-primary-600 font-mono">
                      {analysis.best_move}
                    </p>
                  </div>

                  {/* Suggested Difficulty */}
                  <div className="bg-white p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Suggested Difficulty</p>
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-800 border-2 border-purple-300 capitalize">
                      {analysis.suggested_difficulty}
                    </span>
                  </div>

                  {/* Evaluation */}
                  <div className="bg-white p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Evaluation</p>
                    {analysis.is_mate ? (
                      <p className="text-lg font-bold text-green-600">
                        Mate in {Math.abs(analysis.evaluation.value)}
                      </p>
                    ) : (
                      <p className="text-lg font-bold text-gray-800">
                        {analysis.evaluation.type === 'cp' 
                          ? `${(analysis.evaluation.value / 100).toFixed(2)}`
                          : 'Equal'}
                      </p>
                    )}
                  </div>

                  {/* Top Moves */}
                  {analysis.top_moves && analysis.top_moves.length > 0 && (
                    <div className="bg-white p-4 rounded-xl">
                      <p className="text-sm text-gray-600 mb-2">Top 3 Moves</p>
                      <div className="space-y-1">
                        {analysis.top_moves.slice(0, 3).map((move: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="font-mono font-bold">{move.Move}</span>
                            <span className="text-gray-600">
                              {move.Centipawn ? `${(move.Centipawn / 100).toFixed(2)}` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={createPuzzle}
              disabled={isCreating || !title.trim() || !fen.trim()}
              className="w-full bg-gradient-to-r from-primary-500 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:from-primary-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Puzzle...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Create Puzzle
                </>
              )}
            </button>
          </div>

          {/* Right Column - Chess Board Preview */}
          <div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border-4 border-gray-200 sticky top-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                📋 Board Preview
              </h2>
              
              {game ? (
                <div className="w-full max-w-[400px] mx-auto">
                  <Chessboard
                    key={game.fen()}
                    options={{
                      position: game.fen(),
                      onPieceDrop: ({ sourceSquare, targetSquare }) =>
                        sourceSquare && targetSquare ? onDrop(sourceSquare, targetSquare) : false,
                      boardStyle: {
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                      },
                      darkSquareStyle: { backgroundColor: '#9333ea' },
                      lightSquareStyle: { backgroundColor: '#e9d5ff' },
                    }}
                  />
                </div>
              ) : (
                <div className="w-full aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
                  <p className="text-gray-400 text-center">
                    {fen.trim() ? 'Invalid FEN position' : 'Enter a FEN position'}
                    <br />
                    {fen.trim() ? 'Please check the format' : 'to see preview'}
                  </p>
                </div>
              )}

              {analysis && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-2 border-green-200">
                  <p className="text-sm font-bold text-gray-700 mb-1">
                    ✓ Position Validated
                  </p>
                  <p className="text-xs text-gray-600">
                    Stockfish confirmed this is a valid puzzle with solution: <span className="font-mono font-bold">{analysis.best_move}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
