'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Chessboard } from 'react-chessboard';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FlipVertical,
  FolderOpen,
  Loader2,
  Power,
  Presentation,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { coachAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getShopBoardSquareStyles } from '@/lib/shop-cosmetics';
import { consumePositionForAnalysis } from '@/lib/coach-analysis-transfer';
import {
  buildChessAtPly,
  defaultStartFen,
  evalToBarPercent,
  formatEvalDisplay,
  formatTopMoveScore,
  type HistoryMove,
  type StockfishAnalysisResult,
  uciToSquares,
} from '@/lib/coach-analysis-utils';
import {
  CoachAnalysisLoadModal,
  type AnalysisLoadPayload,
} from '@/components/coach/CoachAnalysisLoadModal';

const ANALYSIS_DEPTH = 15;

export function CoachAnalysisBoard() {
  const { user } = useAuthStore();
  const boardSquareStyles = useMemo(
    () => getShopBoardSquareStyles(user?.equipped_board_theme_item_key),
    [user?.equipped_board_theme_item_key],
  );

  const [rootFen, setRootFen] = useState(defaultStartFen);
  const [moves, setMoves] = useState<HistoryMove[]>([]);
  const [viewPly, setViewPly] = useState(0);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [engineOn, setEngineOn] = useState(true);
  const [analysis, setAnalysis] = useState<StockfishAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [fenDraft, setFenDraft] = useState(defaultStartFen());

  const analyzeSeq = useRef(0);

  const displayChess = useMemo(
    () => buildChessAtPly(rootFen, moves, viewPly),
    [rootFen, moves, viewPly],
  );
  const displayFen = displayChess.fen();
  const atLivePly = viewPly === moves.length;
  const maxPly = moves.length;

  useEffect(() => {
    setFenDraft(displayFen);
  }, [displayFen]);

  useEffect(() => {
    const transferred = consumePositionForAnalysis();
    if (transferred?.fen) {
      setRootFen(transferred.fen);
      setMoves([]);
      setViewPly(0);
      toast.success('Position loaded from Coach board');
    }
  }, []);

  const runAnalysis = useCallback(async (fen: string) => {
    if (!engineOn) return;
    const seq = ++analyzeSeq.current;
    setAnalyzing(true);
    try {
      const result = await coachAPI.analyzePosition(fen, ANALYSIS_DEPTH);
      if (seq !== analyzeSeq.current) return;
      setAnalysis(result);
    } catch {
      if (seq !== analyzeSeq.current) return;
      setAnalysis(null);
    } finally {
      if (seq === analyzeSeq.current) setAnalyzing(false);
    }
  }, [engineOn]);

  useEffect(() => {
    if (!engineOn) {
      setAnalysis(null);
      return;
    }
    const t = setTimeout(() => {
      void runAnalysis(displayFen);
    }, 500);
    return () => clearTimeout(t);
  }, [displayFen, engineOn, runAnalysis]);

  const applyLoad = useCallback((payload: AnalysisLoadPayload) => {
    setRootFen(payload.rootFen);
    setMoves(payload.moves);
    setViewPly(payload.moves.length);
  }, []);

  const resetStart = () => {
    setRootFen(defaultStartFen());
    setMoves([]);
    setViewPly(0);
  };

  const goToPly = (ply: number) => {
    setViewPly(Math.max(0, Math.min(ply, maxPly)));
  };

  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }) => {
    if (!atLivePly || !sourceSquare || !targetSquare) return false;
    const chess = buildChessAtPly(rootFen, moves, viewPly);
    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
      if (!move) {
        toast.error('Illegal move');
        return false;
      }
      const next: HistoryMove = {
        san: move.san,
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      };
      setMoves((prev) => [...prev, next]);
      setViewPly((p) => p + 1);
      return true;
    } catch {
      toast.error('Illegal move');
      return false;
    }
  };

  const bestArrow = analysis?.best_move ? uciToSquares(analysis.best_move) : null;
  const lastMove = viewPly > 0 ? moves[viewPly - 1] : null;

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.35)' };
      styles[lastMove.to] = { backgroundColor: 'rgba(255, 255, 0, 0.35)' };
    }
    if (bestArrow) {
      styles[bestArrow.from] = {
        ...(styles[bestArrow.from] || {}),
        backgroundColor: 'rgba(34, 197, 94, 0.45)',
      };
      styles[bestArrow.to] = {
        ...(styles[bestArrow.to] || {}),
        boxShadow: 'inset 0 0 0 3px rgba(34, 197, 94, 0.85)',
      };
    }
    if (displayChess.isCheck()) {
      const board = displayChess.board();
      const turn = displayChess.turn();
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const piece = board[r][f];
          if (piece?.type === 'k' && piece.color === turn) {
            const sq = `${String.fromCharCode(97 + f)}${8 - r}`;
            styles[sq] = {
              ...(styles[sq] || {}),
              backgroundColor: 'rgba(220, 38, 38, 0.55)',
            };
          }
        }
      }
    }
    return styles;
  }, [bestArrow, displayChess, lastMove]);

  const evalBarPercent = evalToBarPercent(
    analysis?.evaluation,
    analysis?.is_mate,
    orientation,
  );
  const evalText = formatEvalDisplay(analysis?.evaluation, analysis?.is_mate, orientation);

  const evalTextClass = useMemo(() => {
    if (!analysis?.evaluation) return 'text-foreground';
    if (analysis.is_mate || analysis.evaluation.type === 'mate') {
      return (analysis.evaluation.value ?? 0) > 0 ? 'coach-text-success' : 'coach-text-danger';
    }
    let cp = analysis.evaluation.value ?? 0;
    if (orientation === 'black') cp = -cp;
    if (cp > 50) return 'coach-text-success';
    if (cp < -50) return 'coach-text-danger';
    return 'coach-text-warning';
  }, [analysis, orientation]);

  const moveRows: { num: number; white?: HistoryMove; black?: HistoryMove }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    moveRows.push({
      num: i / 2 + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const actionBtnClass =
    'inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-muted/60 sm:px-4';

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div
              className="relative w-3 shrink-0 overflow-hidden rounded-full bg-muted"
              aria-hidden
            >
              <div
                className="absolute bottom-0 left-0 right-0 bg-[hsl(var(--gold-light))] transition-all duration-300"
                style={{ height: `${evalBarPercent}%` }}
              />
              <div
                className="absolute left-0 right-0 top-0 bg-foreground/80 transition-all duration-300"
                style={{ height: `${100 - evalBarPercent}%` }}
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start">
              <div className="relative mx-auto w-full min-w-0 max-w-[min(100%,480px)] sm:flex-1">
                <Chessboard
                  key={`${displayFen}-${viewPly}-${orientation}`}
                  options={{
                    position: displayFen,
                    boardOrientation: orientation,
                    allowDragging: atLivePly,
                    onPieceDrop: ({ sourceSquare, targetSquare }) =>
                      handlePieceDrop({ sourceSquare, targetSquare }),
                    showAnimations: true,
                    boardStyle: {
                      borderRadius: '12px',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
                    },
                    darkSquareStyle: boardSquareStyles.darkSquareStyle,
                    lightSquareStyle: boardSquareStyles.lightSquareStyle,
                    squareStyles,
                  }}
                />
              </div>

              <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                <Link href="/coach/teaching" className={actionBtnClass}>
                  <Presentation className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">Set up position</span>
                </Link>
                <button type="button" onClick={() => setLoadOpen(true)} className={actionBtnClass}>
                  <FolderOpen className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">Load</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pl-6 sm:pl-6">
                <button
                  type="button"
                  onClick={() => goToPly(0)}
                  className="rounded-lg border border-border p-2 hover:bg-muted/60"
                  aria-label="First move"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goToPly(viewPly - 1)}
                  className="rounded-lg border border-border p-2 hover:bg-muted/60"
                  aria-label="Previous move"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[4rem] text-center text-xs font-semibold text-muted-foreground">
                  {viewPly} / {maxPly}
                </span>
                <button
                  type="button"
                  onClick={() => goToPly(viewPly + 1)}
                  className="rounded-lg border border-border p-2 hover:bg-muted/60"
                  aria-label="Next move"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goToPly(maxPly)}
                  className="rounded-lg border border-border p-2 hover:bg-muted/60"
                  aria-label="Last move"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOrientation((o) => (o === 'white' ? 'black' : 'white'))
                  }
                  className="rounded-lg border border-border p-2 hover:bg-muted/60"
                  aria-label="Flip board"
                >
                  <FlipVertical className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={resetStart}
                  className="rounded-lg border border-border p-2 hover:bg-muted/60"
                  aria-label="Reset"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">FEN</p>
            <textarea
              value={fenDraft}
              onChange={(e) => setFenDraft(e.target.value)}
              onBlur={() => {
                const trimmed = fenDraft.trim();
                if (!trimmed || trimmed === displayFen) return;
                applyLoad({ rootFen: trimmed, moves: [], label: 'Custom FEN' });
              }}
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-heading text-base font-bold">
                Engine <span className="coach-text-accent text-sm font-semibold">Stockfish</span>
              </h2>
              <button
                type="button"
                onClick={() => setEngineOn((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  engineOn
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                {engineOn ? 'On' : 'Off'}
              </button>
            </div>

            <div className="mb-3 flex items-baseline gap-2">
              {analyzing ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <span className={`font-heading text-3xl font-bold ${evalTextClass}`}>{evalText}</span>
              )}
              <span className="text-xs text-muted-foreground">depth {ANALYSIS_DEPTH}</span>
            </div>

            {analysis?.best_move && (
              <p className="mb-3 text-sm">
                <span className="text-muted-foreground">Best: </span>
                <span className="font-mono font-bold text-primary">{analysis.best_move}</span>
              </p>
            )}

            <ul className="space-y-2">
              {(analysis?.top_moves ?? []).slice(0, 3).map((line, i) => (
                <li
                  key={`${line.Move}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="coach-text-link font-mono font-semibold">{line.Move}</span>
                  <span className="coach-text-success text-xs font-medium">{formatTopMoveScore(line)}</span>
                </li>
              ))}
              {engineOn && !analyzing && (!analysis?.top_moves || analysis.top_moves.length === 0) && (
                <li className="text-sm text-muted-foreground">No engine lines yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="font-heading mb-3 text-base font-bold">
              Moves <span className="text-sm font-normal text-muted-foreground">({maxPly})</span>
            </h2>
            <div className="max-h-[280px] overflow-y-auto pr-1">
              {moveRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Play moves on the board or load a game.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {moveRows.map((row) => (
                      <tr key={row.num} className="border-b border-border/50">
                        <td className="w-8 py-1.5 pr-2 text-muted-foreground">{row.num}.</td>
                        <td className="py-1.5 pr-2">
                          {row.white && (
                            <button
                              type="button"
                              onClick={() => {
                                const ply = (row.num - 1) * 2 + 1;
                                goToPly(ply);
                              }}
                              className={`rounded px-1.5 py-0.5 font-mono hover:bg-muted ${
                                viewPly === (row.num - 1) * 2 + 1
                                  ? 'bg-primary/15 font-bold text-primary'
                                  : ''
                              }`}
                            >
                              {row.white.san}
                            </button>
                          )}
                        </td>
                        <td className="py-1.5">
                          {row.black && (
                            <button
                              type="button"
                              onClick={() => goToPly(row.num * 2)}
                              className={`rounded px-1.5 py-0.5 font-mono hover:bg-muted ${
                                viewPly === row.num * 2 ? 'bg-primary/15 font-bold text-primary' : ''
                              }`}
                            >
                              {row.black.san}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <CoachAnalysisLoadModal open={loadOpen} onClose={() => setLoadOpen(false)} onLoad={applyLoad} />
    </>
  );
}
