// app/(student)/chess-game/[gameId]/analysis/page.tsx - Game Analysis Page

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { gameAPI, GameAnalysis, GameAnalysisMove } from '@/lib/api';
import { Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GameAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = parseInt(params.gameId as string);

  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [chess, setChess] = useState<Chess | null>(null);
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const game = await gameAPI.getGame(gameId);
        const a = await gameAPI.getAnalysis(gameId, 12);
        setAnalysis(a);

        const startingFen = game.starting_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const c = new Chess(startingFen);
        setChess(c);
      } catch (error: any) {
        const message = error.response?.data?.detail || 'Failed to load analysis';
        toast.error(message);
        router.push(`/chess-game/${gameId}`);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [gameId, router]);

  const goToPly = (ply: number) => {
    if (!analysis || !chess) return;
    const c = new Chess(chess.fen());
    c.reset();
    const moves = analysis.moves.slice(0, ply);
    for (const m of moves) {
      try {
        const from = m.move_uci.substring(0, 2);
        const to = m.move_uci.substring(2, 4);
        const promotion = m.move_uci.length > 4 ? m.move_uci[4] : undefined;
        c.move({ from, to, promotion });
      } catch {
        break;
      }
    }
    setChess(c);
    setCurrentPly(ply);
  };

  const formatTag = (move: GameAnalysisMove): { label: string; className: string } => {
    if (move.tag === 'best') return { label: 'Perfect Move', className: 'bg-green-100 text-green-800' };
    if (move.tag === 'could_improve') return { label: 'Try a Better Move', className: 'bg-orange-100 text-orange-800' };
    return { label: 'Good Move', className: 'bg-blue-100 text-blue-800' };
  };

  if (isLoading || !analysis || !chess) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary-600" />
          <p className="font-heading text-sm font-semibold text-muted-foreground">Analyzing your game...</p>
        </div>
      </div>
    );
  }

  const historyRows: { num: number; white?: GameAnalysisMove; black?: GameAnalysisMove }[] = [];
  for (let i = 0; i < analysis.moves.length; i += 2) {
    const moveNumber = i / 2 + 1;
    historyRows.push({
      num: moveNumber,
      white: analysis.moves[i],
      black: analysis.moves[i + 1],
    });
  }

  return (
    <div className="mx-auto max-w-5xl pt-0 -mx-2 -mt-3 lg:-mx-4 lg:-mt-4">
      <button
        type="button"
        onClick={() => router.push(`/chess-game/${gameId}`)}
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-heading font-semibold text-muted-foreground hover:bg-muted"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to game
      </button>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border-2 border-border bg-card p-4 shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-heading text-sm font-bold text-card-foreground">Game Analysis</p>
              <p className="text-xs text-muted-foreground">
                Tap a move to jump and see suggestions.
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-yellow-500" />
          </div>

          <div className="flex justify-center">
            <div className="relative w-full max-w-[380px]">
              <Chessboard
                key={chess.fen() + currentPly}
                options={{
                  position: chess.fen(),
                  boardOrientation: 'white',
                  boardStyle: {
                    borderRadius: '8px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  },
                  darkSquareStyle: { backgroundColor: '#769656' },
                  lightSquareStyle: { backgroundColor: '#eeeed2' },
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-border bg-card p-4 shadow-md">
          <h2 className="mb-3 font-heading text-lg font-bold text-card-foreground">Move-by-move feedback</h2>
          <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-2">
            {historyRows.map((row) => (
              <div key={row.num} className="flex gap-2 rounded-xl bg-muted/40 px-2 py-1.5 text-xs">
                <div className="w-6 shrink-0 pt-1 font-heading font-bold text-muted-foreground">{row.num}.</div>
                <div className="flex flex-1 flex-col gap-1">
                  {row.white && (
                    <button
                      type="button"
                      onClick={() => goToPly(row.white!.ply)}
                      className={`flex items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-white`}
                    >
                      <span className="font-mono text-[11px] text-slate-900">White: {row.white.move_san}</span>
                      {(() => {
                        const { label, className } = formatTag(row.white!);
                        return (
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>
                            {label}
                          </span>
                        );
                      })()}
                    </button>
                  )}
                  {row.black && (
                    <button
                      type="button"
                      onClick={() => goToPly(row.black!.ply)}
                      className={`flex items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-white`}
                    >
                      <span className="font-mono text-[11px] text-slate-900">Black: {row.black.move_san}</span>
                      {(() => {
                        const { label, className } = formatTag(row.black!);
                        return (
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>
                            {label}
                          </span>
                        );
                      })()}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

