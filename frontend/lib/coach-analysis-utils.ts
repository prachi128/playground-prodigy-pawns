import { Chess } from 'chess.js';

export interface HistoryMove {
  san: string;
  from: string;
  to: string;
  promotion?: string;
}

export interface StockfishEval {
  type?: string;
  value?: number;
}

export interface StockfishTopMove {
  Move: string;
  Centipawn?: number;
  Mate?: number;
}

export interface StockfishAnalysisResult {
  success?: boolean;
  best_move?: string;
  evaluation?: StockfishEval;
  top_moves?: StockfishTopMove[];
  is_mate?: boolean;
  error?: string;
}

const START_FEN = new Chess().fen();

export function defaultStartFen(): string {
  return START_FEN;
}

export function buildChessAtPly(rootFen: string, moves: HistoryMove[], ply: number): Chess {
  let chess: Chess;
  try {
    chess = new Chess(rootFen);
  } catch {
    chess = new Chess(rootFen, { skipValidation: true });
  }
  const cap = Math.max(0, Math.min(ply, moves.length));
  for (let i = 0; i < cap; i++) {
    const m = moves[i];
    const result = chess.move({
      from: m.from,
      to: m.to,
      promotion: m.promotion,
    });
    if (!result) break;
  }
  return chess;
}

export function parsePgnToMoves(pgn: string, startingFen?: string | null): {
  rootFen: string;
  moves: HistoryMove[];
} | null {
  const chess = new Chess();
  if (startingFen?.trim()) {
    try {
      chess.load(startingFen.trim());
    } catch {
      return null;
    }
  }
  const rootFen = chess.fen();
  try {
    chess.loadPgn(pgn.trim());
  } catch {
    return null;
  }
  const moves: HistoryMove[] = chess.history({ verbose: true }).map((m) => ({
    san: m.san,
    from: m.from,
    to: m.to,
    promotion: m.promotion,
  }));
  return { rootFen, moves };
}

export function formatEvalDisplay(
  evaluation: StockfishEval | undefined,
  isMate?: boolean,
  perspective: 'white' | 'black' = 'white',
): string {
  if (!evaluation) return '—';
  if (isMate || evaluation.type === 'mate') {
    const v = evaluation.value ?? 0;
    return `M${Math.abs(v)}`;
  }
  let cp = evaluation.value ?? 0;
  if (perspective === 'black') cp = -cp;
  const pawns = cp / 100;
  if (pawns > 0) return `+${pawns.toFixed(2)}`;
  return pawns.toFixed(2);
}

export function evalToBarPercent(
  evaluation: StockfishEval | undefined,
  isMate?: boolean,
  perspective: 'white' | 'black' = 'white',
): number {
  if (!evaluation) return 50;
  if (isMate || evaluation.type === 'mate') {
    const v = evaluation.value ?? 0;
    const whiteWinning = v > 0;
    const adjusted = perspective === 'black' ? !whiteWinning : whiteWinning;
    return adjusted ? 95 : 5;
  }
  let cp = evaluation.value ?? 0;
  if (perspective === 'black') cp = -cp;
  const clamped = Math.max(-800, Math.min(800, cp));
  return 50 + (clamped / 800) * 45;
}

export function uciToSquares(uci: string): { from: string; to: string } | null {
  if (!uci || uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}

export function formatTopMoveScore(move: StockfishTopMove): string {
  if (move.Mate != null) return `M${Math.abs(move.Mate)}`;
  if (move.Centipawn != null) {
    const p = move.Centipawn / 100;
    return p > 0 ? `+${p.toFixed(2)}` : p.toFixed(2);
  }
  return '—';
}
