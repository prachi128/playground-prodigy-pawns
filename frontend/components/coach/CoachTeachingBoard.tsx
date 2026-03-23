'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard, ChessboardProvider, SparePiece } from 'react-chessboard';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { Copy, RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const START_FEN = new Chess().fen();

const WHITE_SPARE = ['wP', 'wR', 'wN', 'wB', 'wQ', 'wK'] as const;
const BLACK_SPARE = ['bP', 'bR', 'bN', 'bB', 'bQ', 'bK'] as const;

const coachDarkSq = 'hsl(152 41% 28%)';
const coachLightSq = 'hsl(134 55% 92%)';

function pieceTypeToPiece(pieceType: string): { type: PieceSymbol; color: Color } {
  const color = pieceType[0] as Color;
  const type = pieceType[1].toLowerCase() as PieceSymbol;
  return { type, color };
}

type DropPiece = {
  isSparePiece: boolean;
  pieceType: string;
};

function applyTeachingDrop(
  fen: string,
  piece: DropPiece,
  sourceSquare: string,
  targetSquare: string | null,
): string | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    try {
      chess = new Chess(fen, { skipValidation: true });
    } catch {
      return null;
    }
  }

  const offBoard = targetSquare == null || targetSquare === '';
  if (offBoard) {
    if (piece.isSparePiece) {
      return fen;
    }
    const removed = chess.remove(sourceSquare as Square);
    if (!removed) return null;
    try {
      return chess.fen();
    } catch {
      return null;
    }
  }

  const target = targetSquare as Square;

  if (piece.isSparePiece) {
    const { type, color } = pieceTypeToPiece(piece.pieceType);
    chess.remove(target);
    const ok = chess.put({ type, color }, target);
    if (!ok) return null;
    try {
      return chess.fen();
    } catch {
      return null;
    }
  }

  const moving = chess.remove(sourceSquare as Square);
  if (!moving) return null;
  chess.remove(target);
  const ok = chess.put(moving, target);
  if (!ok) return null;
  try {
    return chess.fen();
  } catch {
    return null;
  }
}

export function CoachTeachingBoard() {
  const [fen, setFen] = useState(START_FEN);
  const fenRef = useRef(fen);
  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  const onPieceDrop = useCallback(
    ({
      piece,
      sourceSquare,
      targetSquare,
    }: {
      piece: { isSparePiece: boolean; pieceType: string };
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      const next = applyTeachingDrop(
        fenRef.current,
        { isSparePiece: piece.isSparePiece, pieceType: piece.pieceType },
        sourceSquare,
        targetSquare,
      );
      if (next === null) {
        toast.error('Invalid placement');
        return false;
      }
      fenRef.current = next;
      setFen(next);
      return true;
    },
    [],
  );

  const resetStart = useCallback(() => {
    fenRef.current = START_FEN;
    setFen(START_FEN);
    toast.success('Starting position');
  }, []);

  const clearBoard = useCallback(() => {
    const chess = new Chess();
    chess.clear();
    try {
      const next = chess.fen();
      fenRef.current = next;
      setFen(next);
      toast.success('Board cleared');
    } catch {
      toast.error('Could not clear board');
    }
  }, []);

  const copyFen = useCallback(() => {
    void navigator.clipboard.writeText(fen).then(
      () => toast.success('FEN copied'),
      () => toast.error('Could not copy'),
    );
  }, [fen]);

  const boardOptions = useMemo(
    () => ({
      id: 'coach-teaching-board',
      position: fen,
      onPieceDrop,
      boardOrientation: 'white' as const,
      allowDragging: true,
      allowDragOffBoard: true,
      showAnimations: false,
      clearArrowsOnPositionChange: true,
      boardStyle: {
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
      },
      darkSquareStyle: { backgroundColor: coachDarkSq },
      lightSquareStyle: { backgroundColor: coachLightSq },
    }),
    [fen, onPieceDrop],
  );

  return (
    <ChessboardProvider options={boardOptions}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="mx-auto w-full max-w-[min(520px,100%)] shrink-0">
          <Chessboard />
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Spare pieces
            </p>
            <p className="mb-3 text-sm text-muted-foreground">
              Drag pieces onto the board. Drag pieces off the board or use Clear to remove them. Draw arrows
              with right-drag on the board (same as Lichess).
            </p>
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-medium text-foreground">White</p>
                <div className="grid grid-cols-6 gap-2 sm:max-w-md">
                  {WHITE_SPARE.map((pt) => (
                    <div
                      key={pt}
                      className="flex aspect-square min-h-[44px] items-center justify-center rounded-lg border border-border bg-card p-1 shadow-sm"
                    >
                      <div className="h-full w-full [&_svg]:h-full [&_svg]:w-full">
                        <SparePiece pieceType={pt} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-foreground">Black</p>
                <div className="grid grid-cols-6 gap-2 sm:max-w-md">
                  {BLACK_SPARE.map((pt) => (
                    <div
                      key={pt}
                      className="flex aspect-square min-h-[44px] items-center justify-center rounded-lg border border-border bg-card p-1 shadow-sm"
                    >
                      <div className="h-full w-full [&_svg]:h-full [&_svg]:w-full">
                        <SparePiece pieceType={pt} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetStart}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/60"
            >
              <RotateCcw className="h-4 w-4" />
              Starting position
            </button>
            <button
              type="button"
              onClick={clearBoard}
              className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-card px-4 py-2.5 text-sm font-semibold text-destructive shadow-sm transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Clear board
            </button>
            <button
              type="button"
              onClick={copyFen}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Copy className="h-4 w-4" />
              Copy FEN
            </button>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Current FEN</p>
            <p className="break-all font-mono text-xs leading-relaxed text-foreground">{fen}</p>
          </div>
        </div>
      </div>
    </ChessboardProvider>
  );
}
