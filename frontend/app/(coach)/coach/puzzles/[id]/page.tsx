// app/(coach)/coach/puzzles/[id]/page.tsx - View/Edit Puzzle Page

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { coachAPI, Puzzle } from '@/lib/api';
import { ArrowLeft, Save, Brain, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

function coachDifficultyBadge(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'beginner':
      return 'border border-[hsl(var(--green-medium))]/35 bg-[hsl(var(--green-very-light))] text-[hsl(var(--green-medium))]';
    case 'intermediate':
      return 'border border-[hsl(var(--gold-medium))]/40 bg-[hsl(var(--gold-light))]/80 text-[hsl(var(--gold-dark))]';
    case 'advanced':
      return 'border border-[hsl(var(--orange-medium))]/40 bg-[hsl(var(--orange-very-light))] text-[hsl(var(--orange-dark))]';
    case 'expert':
      return 'border border-[hsl(var(--red-medium))]/35 bg-[hsl(var(--red-light))] text-[hsl(var(--red-medium))]';
    default:
      return 'border border-border bg-muted text-muted-foreground';
  }
}

const COACH_DARK_SQ = 'hsl(152 41% 28%)';
const COACH_LIGHT_SQ = 'hsl(134 55% 92%)';

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
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Loading puzzle…</p>
        </div>
      </div>
    );
  }

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
          Edit puzzle #{puzzleId}
          {!isActive && (
            <span className="ml-2 align-middle text-base font-normal text-muted-foreground">(inactive)</span>
          )}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">View and edit puzzle details.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 font-heading text-xl font-bold text-card-foreground">Puzzle details</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">FEN position *</label>
                <textarea
                  value={fen}
                  onChange={(e) => setFen(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2 font-mono text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Solution moves</label>
                <input
                  type="text"
                  value={moves}
                  onChange={(e) => setMoves(e.target.value)}
                  placeholder="e.g., e2e4"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 font-mono text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <button
                type="button"
                onClick={analyzeFEN}
                disabled={isAnalyzing || !fen.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Re-analyze with Stockfish
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">XP reward</label>
                  <input
                    type="number"
                    value={xpReward}
                    onChange={(e) => setXpReward(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Theme</label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g., fork, pin, checkmate"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-5 w-5 rounded border-input"
                />
                <span className="text-sm font-semibold text-foreground">Puzzle is active (visible to students)</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !fen.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save changes
              </>
            )}
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 font-heading text-xl font-bold text-card-foreground">Board preview</h2>

            <div className="mx-auto w-full max-w-[400px]">
              {tacticalPosition || fen.trim() ? (
                <Chessboard
                  key={tacticalPosition || fen}
                  options={{
                    position: tacticalPosition || fen,
                    boardStyle: {
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                    },
                    darkSquareStyle: { backgroundColor: COACH_DARK_SQ },
                    lightSquareStyle: { backgroundColor: COACH_LIGHT_SQ },
                  }}
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-muted/50">
                  <p className="text-center text-sm text-muted-foreground">Enter a FEN position to see preview</p>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Current difficulty</p>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-bold capitalize ${coachDifficultyBadge(
                  difficulty,
                )}`}
              >
                {difficulty}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 font-heading text-xl font-bold text-card-foreground">Statistics</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total attempts</span>
                <span className="font-bold text-card-foreground">{puzzle.attempts_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Successful</span>
                <span className="font-bold text-[hsl(var(--green-medium))]">{puzzle.success_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Success rate</span>
                <span className="font-bold text-primary">
                  {puzzle.attempts_count > 0
                    ? `${Math.round((puzzle.success_count / puzzle.attempts_count) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rating</span>
                <span className="font-bold text-card-foreground">{puzzle.rating}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
