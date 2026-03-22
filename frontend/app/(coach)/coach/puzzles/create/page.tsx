// app/(coach)/coach/puzzles/create/page.tsx - Create Puzzle with Stockfish

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

  const coachDarkSq = 'hsl(152 41% 28%)';
  const coachLightSq = 'hsl(134 55% 92%)';

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/coach/puzzles"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to puzzles
        </Link>

        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Create puzzle
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Paste a FEN position and Stockfish will suggest the solution.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold text-card-foreground">
              <Target className="h-5 w-5 text-primary" />
              Puzzle details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Knight fork tactic"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the puzzle…"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">FEN position *</label>
                <textarea
                  value={fen}
                  onChange={(e) => setFen(e.target.value)}
                  placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2 font-mono text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={useSampleFEN}
                  className="mt-2 text-sm font-semibold text-primary hover:text-primary/90"
                >
                  Use sample FEN
                </button>
              </div>

              <button
                type="button"
                onClick={analyzeFEN}
                disabled={isAnalyzing || !fen.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5" />
                    Analyze with Stockfish
                  </>
                )}
              </button>
            </div>
          </div>

          {analysis && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-card-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                Stockfish analysis
              </h3>

              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="mb-1 text-sm text-muted-foreground">Best move</p>
                  <p className="font-mono text-2xl font-bold text-primary">{analysis.best_move}</p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="mb-1 text-sm text-muted-foreground">Suggested difficulty</p>
                  <span className="inline-block rounded-full border border-[hsl(var(--purple-medium))]/35 bg-[hsl(var(--purple-light))]/90 px-3 py-1 text-sm font-bold capitalize text-[hsl(var(--purple-dark))]">
                    {analysis.suggested_difficulty}
                  </span>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="mb-1 text-sm text-muted-foreground">Evaluation</p>
                  {analysis.is_mate ? (
                    <p className="text-lg font-bold text-[hsl(var(--green-medium))]">
                      Mate in {Math.abs(analysis.evaluation.value)}
                    </p>
                  ) : (
                    <p className="text-lg font-bold text-card-foreground">
                      {analysis.evaluation.type === 'cp'
                        ? `${(analysis.evaluation.value / 100).toFixed(2)}`
                        : 'Equal'}
                    </p>
                  )}
                </div>

                {analysis.top_moves && analysis.top_moves.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="mb-2 text-sm text-muted-foreground">Top 3 moves</p>
                    <div className="space-y-1">
                      {analysis.top_moves.slice(0, 3).map((move: { Move: string; Centipawn?: number }, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="font-mono font-bold">{move.Move}</span>
                          <span className="text-muted-foreground">
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

          <button
            type="button"
            onClick={createPuzzle}
            disabled={isCreating || !title.trim() || !fen.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Creating puzzle…
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Create puzzle
              </>
            )}
          </button>
        </div>

        <div>
          <div className="sticky top-6 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 font-heading text-xl font-bold text-card-foreground">Board preview</h2>

            {game ? (
              <div className="mx-auto w-full max-w-[400px]">
                <Chessboard
                  key={game.fen()}
                  options={{
                    position: game.fen(),
                    onPieceDrop: ({ sourceSquare, targetSquare }) =>
                      sourceSquare && targetSquare ? onDrop(sourceSquare, targetSquare) : false,
                    boardStyle: {
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                    },
                    darkSquareStyle: { backgroundColor: coachDarkSq },
                    lightSquareStyle: { backgroundColor: coachLightSq },
                  }}
                />
              </div>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-muted/50">
                <p className="text-center text-sm text-muted-foreground">
                  {fen.trim() ? 'Invalid FEN position' : 'Enter a FEN position'}
                  <br />
                  {fen.trim() ? 'Please check the format' : 'to see preview'}
                </p>
              </div>
            )}

            {analysis && (
              <div className="mt-4 rounded-xl border border-[hsl(var(--green-medium))]/30 bg-[hsl(var(--green-very-light))]/50 p-4">
                <p className="mb-1 text-sm font-semibold text-[hsl(var(--green-medium))]">Position validated</p>
                <p className="text-xs text-muted-foreground">
                  Stockfish suggested solution:{' '}
                  <span className="font-mono font-bold text-foreground">{analysis.best_move}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
