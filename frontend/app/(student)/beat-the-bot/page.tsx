// app/(student)/beat-the-bot/page.tsx - Beat the Bot Page

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { useAuthStore } from '@/lib/store';
import { gameAPI, Game } from '@/lib/api';
import { Chessboard } from 'react-chessboard';
import { Bot, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Flag, Loader2, Shuffle, Trophy, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BOT_OPPONENTS,
  BOT_TIER_LABELS,
  BotTier,
  getBotById,
} from '@/lib/bot-opponents';

const BOT_TIERS: BotTier[] = ['beginner', 'intermediate', 'advanced', 'expert'];

type PlayColorChoice = 'white' | 'black' | 'random';

/** Full FEN so side-to-move is defined; preview is always the standard start. */
const PREVIEW_START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function sideToMoveLabelFromFen(fen: string): string {
  const stm = fen.trim().split(/\s+/)[1]?.toLowerCase();
  return stm === 'b' ? 'Black to move' : 'White to move';
}

export default function BeatTheBotPage() {
  const { user } = useAuthStore();
  const [selectedBotId, setSelectedBotId] = useState(BOT_OPPONENTS[0].id);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [colorChoice, setColorChoice] = useState<PlayColorChoice>('white');
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [chess, setChess] = useState<Chess | null>(null);
  const [chessFen, setChessFen] = useState(PREVIEW_START_FEN);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isMakingMove, setIsMakingMove] = useState(false);
  const [isResigning, setIsResigning] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [captureTargets, setCaptureTargets] = useState<string[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
    color: 'w' | 'b';
  } | null>(null);
  const [showWinCelebration, setShowWinCelebration] = useState(false);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [isGameAnalysisMode, setIsGameAnalysisMode] = useState(false);
  const previousResultRef = useRef<string | null>(null);
  const [analysisPly, setAnalysisPly] = useState<number | null>(null);
  const selectedBot = getBotById(selectedBotId);
  const activeBot = getBotById(game?.bot_difficulty || selectedBotId);

  const boardOrientation: 'white' | 'black' = useMemo(() => {
    if (activeGameId && game && user) {
      return game.white_player_id === user.id ? 'white' : 'black';
    }
    return colorChoice === 'black' ? 'black' : 'white';
  }, [activeGameId, game, user, colorChoice]);

  const normalizePgnForChessJs = (pgn: string): string => {
    const trimmed = pgn.trim();
    if (!trimmed) return trimmed;
    if (/\s*(\*|1-0|0-1|1\/2-1\/2)\s*$/.test(trimmed)) return trimmed;
    return `${trimmed} *`;
  };

  const hydrateFromGame = useCallback(
    (g: Game) => {
      const startingFen = g.starting_fen || PREVIEW_START_FEN;
      const currentFen = g.final_fen || startingFen;
      let instance: Chess;
      if (g.pgn && g.pgn.trim()) {
        try {
          instance = new Chess();
          instance.loadPgn(normalizePgnForChessJs(g.pgn));
        } catch {
          instance = new Chess(currentFen);
        }
      } else {
        instance = new Chess(currentFen);
      }

      setGame(g);
      setChess(instance);
      setChessFen(instance.fen());

      const history = instance.history({ verbose: true });
      if (history.length > 0) {
        const lm = history[history.length - 1];
        setLastMove({ from: lm.from, to: lm.to });
      } else {
        setLastMove(null);
      }
      if (user) {
        const isWhite = g.white_player_id === user.id;
        const isBlack = g.black_player_id === user.id;
        const isWhiteTurn = instance.turn() === 'w';
        setIsMyTurn((isWhite && isWhiteTurn) || (isBlack && !isWhiteTurn));
      } else {
        setIsMyTurn(false);
      }
      setAnalysisPly((prev) => (prev == null ? null : Math.min(prev, history.length)));
    },
    [user]
  );

  const loadActiveGame = useCallback(async () => {
    if (!activeGameId) return;
    try {
      const g = await gameAPI.getGame(activeGameId);
      hydrateFromGame(g);
    } catch (err) {
      console.error('Failed to load bot game:', err);
      toast.error('Failed to load bot game');
    }
  }, [activeGameId, hydrateFromGame]);

  useEffect(() => {
    loadActiveGame();
  }, [loadActiveGame]);

  useEffect(() => {
    if (!activeGameId || !game || game.result) return;
    const id = window.setInterval(async () => {
      try {
        const updated = await gameAPI.getGame(activeGameId);
        const currentMoves = game.total_moves || 0;
        const nextMoves = updated.total_moves || 0;
        const resultChanged = game.result !== updated.result;
        if (nextMoves !== currentMoves || resultChanged) {
          hydrateFromGame(updated);
        }
      } catch {
        // silent poll failure
      }
    }, 2000);
    return () => clearInterval(id);
  }, [activeGameId, game, hydrateFromGame]);

  const handleStartGame = async () => {
    if (!selectedBot || !user) {
      toast.error('Please select a bot and your color');
      return;
    }

    const playerColor: 'white' | 'black' =
      colorChoice === 'random'
        ? Math.random() < 0.5
          ? 'white'
          : 'black'
        : colorChoice;

    setIsCreatingGame(true);
    try {
      const created = await gameAPI.createBotGame({
        bot_difficulty: selectedBot.id,
        bot_depth: selectedBot.depth,
        player_color: playerColor,
      });
      setIsGameAnalysisMode(false);
      setAnalysisPly(null);
      setActiveGameId(created.id);
      hydrateFromGame(created);
      toast.success(`Game started against ${selectedBot.name}`);
    } catch (error: any) {
      console.error('Failed to create bot game:', error);
      const message = error.response?.data?.detail || 'Failed to start game';
      toast.error(message);
    } finally {
      setIsCreatingGame(false);
    }
  };

  const getLegalTargets = useCallback(
    (square: string) => {
      if (!chess || !game || game.result || !isMyTurn) return [];
      const piece = chess.get(square);
      if (!piece || piece.color !== chess.turn()) return [];
      const moves = chess.moves({ square, verbose: true });
      return moves.map((move) => ({
        to: move.to,
        isCapture: Boolean(move.captured) || move.flags.includes('e'),
      }));
    },
    [chess, game, isMyTurn]
  );

  const isPromotionMove = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!chess) return false;
      const piece = chess.get(sourceSquare);
      if (!piece || piece.type !== 'p') return false;
      return targetSquare[1] === '8' || targetSquare[1] === '1';
    },
    [chess]
  );

  const executeMove = useCallback(
    async (sourceSquare: string, targetSquare: string, promotion?: 'q' | 'r' | 'b' | 'n') => {
      if (!activeGameId || !chess || !game || game.result || !isMyTurn || isMakingMove) return false;
      if (sourceSquare === targetSquare) return false;

      try {
        let moveOptions: any = { from: sourceSquare, to: targetSquare };
        if (promotion) moveOptions.promotion = promotion;

        let move = null;
        try {
          move = chess.move(moveOptions);
        } catch {
          move = null;
        }
        if (!move) {
          toast.error('Invalid move');
          return false;
        }

        setIsMakingMove(true);
        const payload: any = { from: sourceSquare, to: targetSquare };
        if (promotion) payload.promotion = promotion;
        const updated = await gameAPI.makeMove(activeGameId, payload);
        hydrateFromGame(updated);
        setSelectedSquare(null);
        setLegalTargets([]);
        setCaptureTargets([]);
        setAnalysisPly(null);

        if (!updated.result) {
          const temp = new Chess(updated.final_fen || chess.fen());
          const isWhite = updated.white_player_id === user?.id;
          const isBlack = updated.black_player_id === user?.id;
          const isBotTurn = (isWhite && temp.turn() === 'b') || (isBlack && temp.turn() === 'w');
          if (isBotTurn) {
            setTimeout(async () => {
              try {
                await gameAPI.getBotMove(activeGameId);
                const latest = await gameAPI.getGame(activeGameId);
                hydrateFromGame(latest);
              } catch (err) {
                console.error('Failed to fetch bot move:', err);
              }
            }, 900);
          }
        }
        return true;
      } catch (error: any) {
        try {
          chess.undo();
          setChessFen(chess.fen());
        } catch {
          // ignore
        }
        toast.error(error?.response?.data?.detail || 'Failed to make move');
        return false;
      } finally {
        setIsMakingMove(false);
      }
    },
    [activeGameId, chess, game, hydrateFromGame, isMakingMove, isMyTurn, user?.id]
  );

  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!sourceSquare || !targetSquare) return false;
      if (isPromotionMove(sourceSquare, targetSquare) && chess) {
        const piece = chess.get(sourceSquare);
        if (piece?.type === 'p') {
          setPendingPromotion({ from: sourceSquare, to: targetSquare, color: piece.color });
          return false;
        }
      }
      void executeMove(sourceSquare, targetSquare);
      return true;
    },
    [chess, executeMove, isPromotionMove]
  );

  const handleSquareClick = useCallback(
    (square: string) => {
      if (!chess || !game || game.result || !isMyTurn || isMakingMove) return;
      if (!selectedSquare) {
        const targets = getLegalTargets(square);
        if (targets.length === 0) return;
        setSelectedSquare(square);
        setLegalTargets(targets.filter((m) => !m.isCapture).map((m) => m.to));
        setCaptureTargets(targets.filter((m) => m.isCapture).map((m) => m.to));
        return;
      }

      if (square === selectedSquare) {
        setSelectedSquare(null);
        setLegalTargets([]);
        setCaptureTargets([]);
        return;
      }

      if (legalTargets.includes(square) || captureTargets.includes(square)) {
        if (isPromotionMove(selectedSquare, square)) {
          const piece = chess.get(selectedSquare);
          if (piece?.type === 'p') {
            setPendingPromotion({ from: selectedSquare, to: square, color: piece.color });
            return;
          }
        }
        void executeMove(selectedSquare, square);
        return;
      }

      const targets = getLegalTargets(square);
      if (targets.length > 0) {
        setSelectedSquare(square);
        setLegalTargets(targets.filter((m) => !m.isCapture).map((m) => m.to));
        setCaptureTargets(targets.filter((m) => m.isCapture).map((m) => m.to));
      } else {
        setSelectedSquare(null);
        setLegalTargets([]);
        setCaptureTargets([]);
      }
    },
    [captureTargets, chess, executeMove, game, getLegalTargets, isMakingMove, isMyTurn, isPromotionMove, legalTargets, selectedSquare]
  );

  const confirmResign = async () => {
    if (!activeGameId || !game || game.result || isResigning) return;
    try {
      setIsResigning(true);
      const updated = await gameAPI.resign(activeGameId);
      hydrateFromGame(updated);
      setShowResignDialog(false);
      toast('You resigned');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to resign');
    } finally {
      setIsResigning(false);
    }
  };

  const startNewSetup = () => {
    setActiveGameId(null);
    setGame(null);
    setChess(null);
    setChessFen(PREVIEW_START_FEN);
    setLastMove(null);
    setIsMyTurn(false);
    setSelectedSquare(null);
    setLegalTargets([]);
    setCaptureTargets([]);
    setPendingPromotion(null);
    setShowResignDialog(false);
    setShowWinCelebration(false);
    setIsGameAnalysisMode(false);
    previousResultRef.current = null;
    setAnalysisPly(null);
  };

  useEffect(() => {
    const currentResult = game?.result || null;
    const previousResult = previousResultRef.current;
    if (currentResult && currentResult !== previousResult && game?.winner_id === user?.id) {
      setShowWinCelebration(true);
    }
    previousResultRef.current = currentResult;
  }, [game?.result, game?.winner_id, user?.id]);

  const currentHistory = useMemo(() => (chess ? chess.history({ verbose: true }) : []), [chess, chessFen]);
  const maxPly = currentHistory.length;
  const viewPly = analysisPly == null ? maxPly : Math.max(0, Math.min(analysisPly, maxPly));
  const isReviewMode = viewPly !== maxPly;
  const displayChess = useMemo(() => {
    const replay = new Chess(game?.starting_fen || PREVIEW_START_FEN);
    for (let i = 0; i < viewPly; i += 1) {
      const move = currentHistory[i];
      replay.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
    }
    return replay;
  }, [currentHistory, game?.starting_fen, viewPly]);
  const displayFen = displayChess.fen();
  const displayLastMove = viewPly > 0 ? currentHistory[viewPly - 1] : null;

  const checkedKingSquare = useMemo(() => {
    if (!displayChess.isCheck()) return null;
    const checkedColor = displayChess.turn();
    const board = displayChess.board();
    for (let rank = 0; rank < board.length; rank += 1) {
      for (let file = 0; file < board[rank].length; file += 1) {
        const piece = board[rank][file];
        if (piece && piece.type === 'k' && piece.color === checkedColor) {
          const fileChar = String.fromCharCode(97 + file);
          const rankChar = String(8 - rank);
          return `${fileChar}${rankChar}`;
        }
      }
    }
    return null;
  }, [displayChess]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (displayLastMove) {
      styles[displayLastMove.from] = { backgroundColor: 'rgba(255,255,0,0.35)' };
      styles[displayLastMove.to] = { backgroundColor: 'rgba(255,255,0,0.35)' };
    } else if (lastMove) {
      styles[lastMove.from] = { backgroundColor: 'rgba(255,255,0,0.35)' };
      styles[lastMove.to] = { backgroundColor: 'rgba(255,255,0,0.35)' };
    }
    if (selectedSquare) {
      styles[selectedSquare] = {
        ...(styles[selectedSquare] || {}),
        backgroundColor: 'rgba(190, 242, 100, 0.38)',
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
        backgroundColor: 'rgba(251, 191, 36, 0.45)',
      };
    });
    if (checkedKingSquare) {
      styles[checkedKingSquare] = {
        ...(styles[checkedKingSquare] || {}),
        backgroundColor: 'rgba(220, 38, 38, 0.58)',
      };
    }
    return styles;
  }, [captureTargets, checkedKingSquare, displayLastMove, lastMove, legalTargets, selectedSquare]);

  const turnLabel = sideToMoveLabelFromFen(PREVIEW_START_FEN);
  const inGame = !!activeGameId && !!game;
  const moveRows = useMemo(() => {
    const history = currentHistory.map((move) => move.san);
    const rows: Array<{ num: number; white: string; black?: string }> = [];
    let moveNumber = 1;
    for (let i = 0; i < history.length; i += 2) {
      rows.push({
        num: moveNumber,
        white: history[i],
        black: history[i + 1],
      });
      moveNumber += 1;
    }
    return rows;
  }, [currentHistory]);

  return (
    <div className="mx-auto max-w-6xl pt-0">
      {/* Split setup: board left, bot options right */}
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-3xl border-2 border-border bg-card px-3 pb-3 pt-1 shadow-xl sm:px-4 sm:pb-4 sm:pt-1.5">
            <div className="mx-auto w-full max-w-[min(100%,430px)] sm:max-w-[500px]">
              <Chessboard
                options={{
                  position: inGame ? displayFen : PREVIEW_START_FEN,
                  arePiecesDraggable: inGame && !isReviewMode,
                  boardOrientation,
                  onPieceDrop: ({ sourceSquare, targetSquare }) => {
                    if (!sourceSquare || !targetSquare) return false;
                    if (isReviewMode) return false;
                    return handlePieceDrop(sourceSquare, targetSquare);
                  },
                  onSquareClick: ({ square }) => {
                    if (!square) return;
                    if (isReviewMode) return;
                    handleSquareClick(square);
                  },
                  boardStyle: {
                    borderRadius: '12px',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.22)',
                    opacity: isMakingMove ? 0.75 : 1,
                  },
                  darkSquareStyle: { backgroundColor: activeBot.boardDark },
                  lightSquareStyle: { backgroundColor: activeBot.boardLight },
                  squareStyles,
                }}
              />
            </div>
          </div>

          <div className="rounded-3xl border-2 border-border bg-card shadow-sm">
            <div className="p-5">
              {!inGame ? (
                <>
                  <div className="mb-4 rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-center">
                    <p className="font-heading text-sm font-bold text-card-foreground">
                      {turnLabel}
                    </p>
                  </div>

                  <h2 className="mb-2 font-heading text-sm font-bold text-card-foreground">
                    Play As
                  </h2>
                  <div
                    className="mb-4 flex rounded-lg border border-border bg-muted/50 p-1"
                    role="group"
                    aria-label="Choose side to play"
                  >
                    <button
                      type="button"
                      onClick={() => setColorChoice('white')}
                      aria-label="Play as White"
                      aria-pressed={colorChoice === 'white'}
                      className={`flex flex-1 items-center justify-center rounded-md py-2 text-xl transition-colors ${
                        colorChoice === 'white'
                          ? 'bg-card text-orange-600 shadow-sm ring-2 ring-orange-400 ring-offset-1 ring-offset-background'
                          : 'text-card-foreground hover:bg-background/80'
                      }`}
                    >
                      ♔
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorChoice('black')}
                      aria-label="Play as Black"
                      aria-pressed={colorChoice === 'black'}
                      className={`flex flex-1 items-center justify-center rounded-md py-2 text-xl transition-colors ${
                        colorChoice === 'black'
                          ? 'bg-card text-gray-900 shadow-sm ring-2 ring-gray-600 ring-offset-1 ring-offset-background'
                          : 'text-card-foreground hover:bg-background/80'
                      }`}
                    >
                      ♚
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorChoice('random')}
                      aria-label="Random side"
                      aria-pressed={colorChoice === 'random'}
                      className={`flex flex-1 items-center justify-center rounded-md py-2 transition-colors ${
                        colorChoice === 'random'
                          ? 'bg-card text-violet-600 shadow-sm ring-2 ring-violet-500 ring-offset-1 ring-offset-background'
                          : 'text-card-foreground hover:bg-background/80'
                      }`}
                    >
                      <Shuffle className="h-5 w-5" aria-hidden />
                    </button>
                  </div>

                  <button
                    onClick={handleStartGame}
                    disabled={isCreatingGame}
                    className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-3 font-heading text-base font-bold text-white transition-all hover:scale-[1.01] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isCreatingGame ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Starting Game...
                      </>
                    ) : (
                      <>
                        <Bot className="h-5 w-5" />
                        Start Game vs {selectedBot.name}
                      </>
                    )}
                  </button>
                  <p className="mb-4 text-center text-xs text-muted-foreground">
                    {colorChoice === 'random' ? (
                      <>Your side is picked at random when you start.</>
                    ) : (
                      <>
                        You will play as{' '}
                        <span className="font-bold">{colorChoice === 'white' ? 'White' : 'Black'}</span>.
                      </>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-4 rounded-xl border border-border bg-muted/60 px-3 py-2.5">
                    <p className="font-heading text-sm font-bold text-card-foreground">
                      {isGameAnalysisMode ? 'Game Analysis' : game?.result ? 'Game Over' : isMyTurn ? 'Your turn' : `${activeBot.name} is thinking...`}
                    </p>
                  </div>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Moves</span>
                    <span className="font-bold text-card-foreground">{game?.total_moves || 0}</span>
                  </div>
                  <div className="mb-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Result</span>
                    <span className="font-bold text-card-foreground">{game?.result || 'In progress'}</span>
                  </div>
                  {!isGameAnalysisMode && (
                    <button
                      type="button"
                      onClick={() => setShowResignDialog(true)}
                      disabled={!game || !!game.result || isResigning}
                      className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isResigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                      {isResigning ? 'Resigning...' : 'Resign'}
                    </button>
                  )}
                  {game?.result_reason === 'resign' && (
                    <button
                      type="button"
                      onClick={startNewSetup}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-card-foreground"
                    >
                      New Beat-the-Bot Game
                    </button>
                  )}
                </>
              )}

              {!inGame && (
                <>
                  <h3 className="mb-2 font-heading text-sm font-bold text-card-foreground">
                    Choose Opponent
                  </h3>
                  <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                    {BOT_TIERS.map((tier) => (
                      <div key={tier}>
                        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {BOT_TIER_LABELS[tier]}
                        </p>
                        <div className="space-y-2">
                          {BOT_OPPONENTS.filter((bot) => bot.tier === tier).map((bot) => (
                            <button
                              key={bot.id}
                              onClick={() => setSelectedBotId(bot.id)}
                              className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                                selectedBot.id === bot.id
                                  ? `${bot.borderColor} bg-gradient-to-r ${bot.themeGradient} text-white shadow-lg`
                                  : 'border-border bg-white hover:border-primary/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{bot.avatar}</span>
                                  <div>
                                    <p className="font-heading text-sm font-bold">{bot.name}</p>
                                    <p
                                      className={`text-[11px] ${
                                        selectedBot.id === bot.id
                                          ? 'text-white/80'
                                          : 'text-muted-foreground'
                                      }`}
                                    >
                                      {bot.themeName}
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                    selectedBot.id === bot.id
                                      ? 'bg-white/20 text-white'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {bot.rating}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {inGame && (
                <div className="mt-4 rounded-2xl border border-border bg-background/60 p-3">
                  <div className="mb-3 flex items-center">
                    <div className="grid w-full grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSquare(null);
                          setLegalTargets([]);
                          setCaptureTargets([]);
                          setAnalysisPly(0);
                        }}
                        disabled={viewPly === 0}
                        className="flex items-center justify-center rounded-lg border border-lime-300 bg-gradient-to-br from-lime-100 to-emerald-100 px-2 py-1 text-emerald-800 shadow-sm transition-colors hover:from-lime-200 hover:to-emerald-200 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Go to first move"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSquare(null);
                          setLegalTargets([]);
                          setCaptureTargets([]);
                          setAnalysisPly(Math.max(0, viewPly - 1));
                        }}
                        disabled={viewPly === 0}
                        className="flex items-center justify-center rounded-lg border border-lime-300 bg-gradient-to-br from-lime-100 to-emerald-100 px-2 py-1 text-emerald-800 shadow-sm transition-colors hover:from-lime-200 hover:to-emerald-200 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Go to previous move"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSquare(null);
                          setLegalTargets([]);
                          setCaptureTargets([]);
                          setAnalysisPly(Math.min(maxPly, viewPly + 1));
                        }}
                        disabled={viewPly === maxPly}
                        className="flex items-center justify-center rounded-lg border border-lime-300 bg-gradient-to-br from-lime-100 to-emerald-100 px-2 py-1 text-emerald-800 shadow-sm transition-colors hover:from-lime-200 hover:to-emerald-200 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Go to next move"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSquare(null);
                          setLegalTargets([]);
                          setCaptureTargets([]);
                          setAnalysisPly(null);
                        }}
                        disabled={viewPly === maxPly}
                        className="flex items-center justify-center rounded-lg border border-lime-300 bg-gradient-to-br from-lime-100 to-emerald-100 px-2 py-1 text-emerald-800 shadow-sm transition-colors hover:from-lime-200 hover:to-emerald-200 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Go to latest move"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    Move {viewPly} / {maxPly}
                  </p>
                  {isReviewMode && (
                    <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                      Analysis view: return to latest move to continue playing.
                    </p>
                  )}
                  <p className="mb-2 font-heading text-sm font-bold text-card-foreground">
                    Move History
                  </p>
                  <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                    {moveRows.length === 0 ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">No moves yet</p>
                    ) : (
                      moveRows.map((row) => (
                        <div
                          key={row.num}
                          className="flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1 text-xs"
                        >
                          <span className="w-6 shrink-0 font-heading font-bold text-muted-foreground">
                            {row.num}.
                          </span>
                          <span className="min-w-[34px] font-mono text-card-foreground">{row.white}</span>
                          <span className="min-w-[34px] font-mono text-card-foreground">
                            {row.black || ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {!(inGame && isGameAnalysisMode) && (
                <div
                  className={`mt-4 rounded-2xl border-2 p-4 bg-gradient-to-br ${activeBot.panelGradient} ${activeBot.borderColor}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {inGame ? 'Current Opponent' : 'Selected Bot'}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 text-2xl shadow">
                      {activeBot.avatar}
                    </div>
                    <div>
                      <p className="font-heading text-lg font-bold text-card-foreground">
                        {activeBot.name}
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {activeBot.tagline}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{activeBot.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                      <Trophy className="mr-1 inline h-3.5 w-3.5" />
                      {activeBot.rating}
                    </span>
                    <span className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                      {BOT_TIER_LABELS[activeBot.tier]}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Info Section */}
      {!inGame && (
        <section className="mb-6">
          <div className="rounded-3xl border-2 border-cyan-200 bg-card p-5 shadow-sm">
            <h3 className="font-heading text-lg font-bold text-card-foreground mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-cyan-500" />
              How It Works
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Pick from multiple themed bots grouped by skill tier</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Preview the board theme on the left while selecting on the right</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>Start and play on this same page without opening a separate game route</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">•</span>
                <span>No clock is shown here - it is a casual bot game mode</span>
              </li>
            </ul>
          </div>
        </section>
      )}

      {pendingPromotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-pink-50 to-amber-50 p-6 shadow-2xl">
            <h3 className="text-center font-heading text-2xl font-extrabold text-fuchsia-700">
              Choose Promotion Piece
            </h3>
            <p className="mt-1 text-center text-sm font-semibold text-fuchsia-600/80">
              Your pawn reached the last rank.
            </p>
            <div className="mt-5 grid grid-cols-4 gap-3">
              {(['q', 'r', 'b', 'n'] as Array<'q' | 'r' | 'b' | 'n'>).map((piece) => {
                const symbols: Record<'q' | 'r' | 'b' | 'n', string> =
                  pendingPromotion.color === 'w'
                    ? { q: '♕', r: '♖', b: '♗', n: '♘' }
                    : { q: '♛', r: '♜', b: '♝', n: '♞' };
                return (
                  <button
                    key={piece}
                    type="button"
                    onClick={() => {
                      const promotionData = pendingPromotion;
                      setPendingPromotion(null);
                      void executeMove(promotionData.from, promotionData.to, piece);
                    }}
                    className="rounded-2xl border border-fuchsia-200 bg-gradient-to-b from-white to-fuchsia-100 py-4 text-5xl text-fuchsia-800 shadow-sm transition-all hover:-translate-y-0.5 hover:from-fuchsia-100 hover:to-fuchsia-200 hover:shadow-md"
                    aria-label={`Promote to ${piece}`}
                  >
                    {symbols[piece]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showWinCelebration && game?.winner_id === user?.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-100 via-teal-50 to-lime-100 p-6 text-center shadow-2xl"
            style={{ animation: 'winPop 500ms cubic-bezier(0.2, 0.9, 0.2, 1)' }}
          >
            <p className="text-5xl drop-shadow-sm" style={{ animation: 'bounceSoft 1200ms ease-in-out infinite' }}>
              🎉🏆🎉
            </p>
            <h3 className="mt-2 font-heading text-4xl font-extrabold text-emerald-700">
              You won!
            </h3>
            <p className="mt-2 text-base font-extrabold text-emerald-700">
              {game?.result_reason === 'checkmate' ? "That's a checkmate!" : 'What a brilliant finish!'}
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">
              Great game against {activeBot.name}!
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowWinCelebration(false);
                  setIsGameAnalysisMode(true);
                }}
                className="rounded-full border border-emerald-400 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                Analyze your Game
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWinCelebration(false);
                  startNewSetup();
                }}
                className="rounded-full bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:from-emerald-500 hover:to-green-400"
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {showResignDialog && inGame && !game?.result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-md rounded-3xl border-2 border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-3xl shadow-sm">
                {activeBot.avatar}
              </div>
              <div>
                <p className="font-heading text-lg font-bold text-card-foreground">
                  {activeBot.name} looks sad
                </p>
                <p className="text-xs text-muted-foreground">Do you really want to resign?</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              "Oh no... I was enjoying this game with you. Are you sure you want to leave?"
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResignDialog(false)}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-bold text-card-foreground"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={confirmResign}
                disabled={isResigning}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResigning ? 'Resigning...' : 'Yes, Resign'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes winPop {
          0% { opacity: 0; transform: scale(0.84) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes confettiFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(8deg); }
        }
        @keyframes bounceSoft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
