// app/(student)/chess-game/page.tsx - Chess Game Invite Page

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { gameAPI, Game, User, usersAPI } from '@/lib/api';
import { usernameInitial } from '@/lib/avatar';
import { Search, UserPlus, Loader2, CheckCircle, XCircle, Clock, Flag, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

const PREVIEW_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const INITIAL_CLOCK_MS = 10 * 60 * 1000;

const parseBaseClockMs = (timeControl?: string): number => {
  if (!timeControl || timeControl === 'unlimited') return 0;
  const [baseRaw] = String(timeControl).split('+');
  const baseMinutes = Number.parseInt(baseRaw || '0', 10);
  if (!Number.isFinite(baseMinutes) || baseMinutes <= 0) return 0;
  return baseMinutes * 60 * 1000;
};

const formatClock = (ms?: number | null): string => {
  if (ms == null || ms <= 0) return '00:00';
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const clockClassName = (isTimed: boolean, ms?: number | null): string => {
  if (!isTimed) {
    return 'rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-sm font-bold tabular-nums tracking-[0.08em] text-muted-foreground';
  }
  const isLow = (ms ?? 0) <= 60_000;
  return isLow
    ? 'rounded-md border border-red-400 bg-red-950 px-2 py-0.5 font-mono text-base font-extrabold tabular-nums tracking-[0.1em] text-red-300'
    : 'rounded-md border border-emerald-500 bg-slate-950 px-2 py-0.5 font-mono text-base font-extrabold tabular-nums tracking-[0.1em] text-emerald-300';
};

type QueuedPremove = { from: string; to: string };

export default function ChessGamePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(true);
  const [selectedTimeControl, setSelectedTimeControl] = useState('unlimited');
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [opponentUser, setOpponentUser] = useState<User | null>(null);
  const [chess, setChess] = useState<Chess | null>(null);
  const [chessFen, setChessFen] = useState(PREVIEW_START_FEN);
  const [displayWhiteTimeMs, setDisplayWhiteTimeMs] = useState<number>(INITIAL_CLOCK_MS);
  const [displayBlackTimeMs, setDisplayBlackTimeMs] = useState<number>(INITIAL_CLOCK_MS);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isMakingMove, setIsMakingMove] = useState(false);
  const [isResigning, setIsResigning] = useState(false);
  const [isOfferingDraw, setIsOfferingDraw] = useState(false);
  const [isRejectingDraw, setIsRejectingDraw] = useState(false);
  const [isSendingRematchInvite, setIsSendingRematchInvite] = useState(false);
  const [showDrawOfferDialog, setShowDrawOfferDialog] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [captureTargets, setCaptureTargets] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string; color: 'w' | 'b' } | null>(null);
  const [queuedPremoves, setQueuedPremoves] = useState<QueuedPremove[]>([]);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const [analysisPly, setAnalysisPly] = useState<number | null>(null);
  const handledInviteIds = useRef<Set<number>>(new Set());
  const knownPendingSentInviteIds = useRef<Set<number>>(new Set());
  const previousResultRef = useRef<string | null>(null);
  const previousDrawOfferedByRef = useRef<number | null>(null);
  const inGame = !!activeGameId && !!activeGame;

  const hydrateFromGame = useCallback((g: Game) => {
    const startingFen = g.starting_fen || PREVIEW_START_FEN;
    let instance = new Chess(startingFen);
    let hydratedFromPgn = false;

    // Prefer PGN so chess.js keeps full move history.
    // Using only final_fen loses history, which desyncs board replay/move list.
    if (g.pgn && String(g.pgn).trim().length > 0) {
      try {
        instance.loadPgn(g.pgn, { strict: false });
        hydratedFromPgn = true;
      } catch {
        hydratedFromPgn = false;
      }
    }

    if (!hydratedFromPgn) {
      const currentFen = g.final_fen || startingFen;
      instance = new Chess(currentFen);
    }
    setActiveGame(g);
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

    const baseMs = parseBaseClockMs(g.time_control);
    const fallback = baseMs > 0 ? baseMs : INITIAL_CLOCK_MS;
    setDisplayWhiteTimeMs(g.white_time_ms ?? fallback);
    setDisplayBlackTimeMs(g.black_time_ms ?? fallback);
  }, [PREVIEW_START_FEN, user]);

  const loadActiveGame = useCallback(async (gameId: number): Promise<Game | null> => {
    try {
      const g = await gameAPI.getGame(gameId);
      hydrateFromGame(g);
      setActiveGameId(gameId);
      return g;
    } catch (error) {
      console.error('Failed to load game:', error);
      toast.error('Failed to load game');
      return null;
    }
  }, [hydrateFromGame]);

  useEffect(() => {
    const gameIdParam = searchParams.get('gameId');
    if (!gameIdParam) return;
    const parsed = Number.parseInt(gameIdParam, 10);
    if (!Number.isFinite(parsed)) return;
    if (activeGameId === parsed) return;
    void loadActiveGame(parsed);
  }, [activeGameId, loadActiveGame, searchParams]);
  useEffect(() => {
    if (!user?.id) return;
    if (activeGameId) return;
    let cancelled = false;
    (async () => {
      try {
        const games = await gameAPI.getGames({ user_id: user.id, limit: 50 });
        if (cancelled) return;
        const ongoing = (games || []).filter((g) => {
          const hasResult = g.result != null && String(g.result).trim() !== '';
          const hasEnded = g.ended_at != null && String(g.ended_at).trim() !== '';
          const isBotGame = !!g.bot_difficulty;
          return !hasResult && !hasEnded && !isBotGame;
        });
        if (ongoing.length > 0) {
          await loadActiveGame(ongoing[0].id);
        }
      } catch {
        // silent; user stays on invite lobby when no ongoing game
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeGameId, loadActiveGame, user?.id]);

  // Load pending invites on mount
  useEffect(() => {
    loadInvites();
  }, []);

  // Search users with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      // Double-check query length before making API call
      if (searchQuery.length >= 2) {
        searchUsers();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadInvites = async () => {
    try {
      setIsLoadingInvites(true);
      const invites = await gameAPI.getInvites('pending');
      setPendingInvites(invites);
      if (user?.id) {
        // Track only invites that are currently pending and sent by this user.
        const pendingSentIds = invites
          .filter((invite) => invite.inviter_id === user.id && invite.status === 'pending')
          .map((invite) => invite.id);
        // Keep a running session memory of invite IDs we observed as pending.
        // If we overwrite this set on every poll, an accepted invite can disappear
        // from "pending" before acceptance detection runs, causing sender auto-start to miss.
        pendingSentIds.forEach((id) => knownPendingSentInviteIds.current.add(id));
      }
    } catch (error) {
      console.error('Failed to load invites:', error);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  const checkForAcceptedInvites = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get all invites (not just pending) to check for accepted ones
      const allInvites = await gameAPI.getInvites();
      
      // Find invites where:
      // 1. Current user is the inviter (sent invites)
      // 2. Status is "accepted"
      // 3. Has a game_id
      // 4. We haven't already handled this invite
      const acceptedInvites = allInvites.filter(
        invite => 
          invite.inviter_id === user.id && 
          invite.status === 'accepted' && 
          invite.game_id &&
          // Only auto-start if this invite was observed as pending in this session.
          knownPendingSentInviteIds.current.has(invite.id) &&
          !handledInviteIds.current.has(invite.id) &&
          activeGameId !== invite.game_id
      );

      // If we found a newly accepted invite, load it inline on this page
      if (acceptedInvites.length > 0) {
        // Do not interrupt an active in-page game with another accepted invite.
        if (inGame) {
          acceptedInvites.forEach((invite) => handledInviteIds.current.add(invite.id));
          return;
        }
        const acceptedInvite = acceptedInvites[0]; // Take the first one
        handledInviteIds.current.add(acceptedInvite.id);
        const loadedGame = await loadActiveGame(acceptedInvite.game_id);
        if (loadedGame && !loadedGame.result) {
          toast.success('Your invite was accepted! Starting game...');
        } else if (loadedGame?.result) {
          toast('An older accepted invite was found. Opening game history.');
        }
        return; // Exit early since we're navigating
      }

      // Update pending invites list (remove accepted ones)
      const stillPending = allInvites.filter(invite => invite.status === 'pending');
      setPendingInvites(stillPending);
    } catch (error) {
      console.error('Failed to check for accepted invites:', error);
    }
  }, [activeGameId, inGame, user?.id, loadActiveGame]);

  // Poll for new received invites so they appear in real-time without refresh (Student B sees invite when A sends)
  useEffect(() => {
    if (!user?.id) return;

    const pollInterval = setInterval(() => {
      loadInvites();
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [user?.id]);

  // Poll for invite status changes (check every 2 seconds)
  useEffect(() => {
    if (!user?.id) return;

    const pollInterval = setInterval(() => {
      checkForAcceptedInvites();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(pollInterval);
  }, [user?.id, checkForAcceptedInvites]);

  useEffect(() => {
    if (!activeGameId || !activeGame || activeGame.result) return;
    const id = window.setInterval(async () => {
      try {
        const updated = await gameAPI.getGame(activeGameId);
        const currentMoves = activeGame.total_moves || 0;
        const nextMoves = updated.total_moves || 0;
        const drawOfferChanged = activeGame.draw_offered_by !== updated.draw_offered_by;
        if (nextMoves !== currentMoves || activeGame.result !== updated.result || drawOfferChanged) {
          hydrateFromGame(updated);
        }
      } catch {
        // silent poll failure
      }
    }, 2000);
    return () => clearInterval(id);
  }, [activeGameId, activeGame, hydrateFromGame]);

  useEffect(() => {
    if (!activeGame || !user?.id) {
      setOpponentUser(null);
      return;
    }
    const opponentId =
      activeGame.white_player_id === user.id
        ? activeGame.black_player_id
        : activeGame.white_player_id;
    let cancelled = false;
    (async () => {
      try {
        const profile = await usersAPI.getById(opponentId);
        if (!cancelled) setOpponentUser(profile);
      } catch {
        if (!cancelled) setOpponentUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeGame, user?.id]);

  useEffect(() => {
    if (!activeGame || activeGame.result) return;
    if (!activeGame.time_control || activeGame.time_control === 'unlimited') return;
    const id = window.setInterval(() => {
      const turn = chess?.turn();
      if (turn === 'w') {
        setDisplayWhiteTimeMs((prev) => Math.max(0, prev - 1000));
      } else if (turn === 'b') {
        setDisplayBlackTimeMs((prev) => Math.max(0, prev - 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [activeGame, chess]);

  const searchUsers = async () => {
    // Prevent API call if query is too short
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await gameAPI.searchUsers(searchQuery.trim());
      setSearchResults(results);
    } catch (error: any) {
      console.error('Failed to search users:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        query: searchQuery
      });
      // Only show error if it's not a validation error (422)
      if (error.response?.status !== 422) {
        toast.error('Failed to search users');
      } else {
        // Log validation error details
        console.warn('Validation error (422):', error.response?.data);
      }
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async (inviteeId: number, inviteeName: string) => {
    try {
      await gameAPI.createInvite(inviteeId, selectedTimeControl);
      toast.success(`Invite sent to ${inviteeName}!`);
      setSearchQuery('');
      setSearchResults([]);
      loadInvites(); // Refresh invites list
    } catch (error: any) {
      console.error('Failed to send invite:', error);
      const message = error.response?.data?.detail || 'Failed to send invite';
      toast.error(message);
    }
  };

  const handleAcceptInvite = async (inviteId: number) => {
    try {
      const game = await gameAPI.acceptInvite(inviteId);
      toast.success('Invite accepted! Starting game...');
      hydrateFromGame(game);
      setActiveGameId(game.id);
    } catch (error: any) {
      console.error('Failed to accept invite:', error);
      const message = error.response?.data?.detail || 'Failed to accept invite';
      toast.error(message);
      loadInvites(); // Refresh invites list
    }
  };

  const handleRejectInvite = async (inviteId: number) => {
    try {
      await gameAPI.rejectInvite(inviteId);
      toast.success('Invite rejected');
      loadInvites(); // Refresh invites list
    } catch (error: any) {
      console.error('Failed to reject invite:', error);
      toast.error('Failed to reject invite');
    }
  };

  const getLegalTargets = useCallback((square: string) => {
    if (!chess || !activeGame || activeGame.result || !isMyTurn) return [];
    const piece = chess.get(square);
    if (!piece || piece.color !== chess.turn()) return [];
    const moves = chess.moves({ square, verbose: true });
    return moves.map((move) => ({
      to: move.to,
      isCapture: Boolean(move.captured) || move.flags.includes('e'),
    }));
  }, [activeGame, chess, isMyTurn]);

  const isPromotionMove = useCallback((sourceSquare: string, targetSquare: string) => {
    if (!chess) return false;
    const piece = chess.get(sourceSquare);
    if (!piece || piece.type !== 'p') return false;
    return targetSquare[1] === '8' || targetSquare[1] === '1';
  }, [chess]);

  const executeMove = useCallback(async (sourceSquare: string, targetSquare: string, promotion?: 'q' | 'r' | 'b' | 'n') => {
    if (!activeGameId || !chess || !activeGame || activeGame.result || !isMyTurn || isMakingMove) return false;
    try {
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion });
      if (!move) return false;
      setIsMakingMove(true);
      const updated = await gameAPI.makeMove(activeGameId, { from: sourceSquare, to: targetSquare, promotion });
      hydrateFromGame(updated);
      setSelectedSquare(null);
      setLegalTargets([]);
      setCaptureTargets([]);
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
  }, [activeGame, activeGameId, chess, hydrateFromGame, isMakingMove, isMyTurn]);

  const queuePremove = useCallback((from: string, to: string) => {
    if (!chess || !activeGame || activeGame.result || isMyTurn) return false;
    const piece = chess.get(from);
    if (!piece) return false;
    // Only allow queuing your own pieces while waiting.
    const myColor = activeGame.white_player_id === user?.id ? 'w' : 'b';
    if (piece.color !== myColor) return false;
    setQueuedPremoves((prev) => [...prev, { from, to }]);
    setSelectedSquare(null);
    setLegalTargets([]);
    setCaptureTargets([]);
    toast('Premove queued');
    return true;
  }, [activeGame, chess, isMyTurn, user?.id]);

  const handlePieceDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    if (!sourceSquare || !targetSquare) return false;
    if (!isMyTurn) {
      return queuePremove(sourceSquare, targetSquare);
    }
    if (isPromotionMove(sourceSquare, targetSquare) && chess) {
      const piece = chess.get(sourceSquare);
      if (piece?.type === 'p') {
        setPendingPromotion({ from: sourceSquare, to: targetSquare, color: piece.color });
        return false;
      }
    }
    void executeMove(sourceSquare, targetSquare);
    return true;
  }, [chess, executeMove, isMyTurn, isPromotionMove, queuePremove]);

  const handleSquareClick = useCallback((square: string) => {
    if (!chess || !activeGame || activeGame.result || isMakingMove) return;
    if (!isMyTurn) {
      if (!selectedSquare) {
        const piece = chess.get(square);
        if (!piece) return;
        const myColor = activeGame.white_player_id === user?.id ? 'w' : 'b';
        if (piece.color !== myColor) return;
        setSelectedSquare(square);
        return;
      }
      if (square === selectedSquare) {
        setSelectedSquare(null);
        return;
      }
      void queuePremove(selectedSquare, square);
      return;
    }
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
  }, [activeGame, captureTargets, chess, executeMove, getLegalTargets, isMakingMove, isMyTurn, isPromotionMove, legalTargets, queuePremove, selectedSquare, user?.id]);

  useEffect(() => {
    if (queuedPremoves.length === 0 || !isMyTurn || !chess || !activeGame || activeGame.result || isMakingMove) return;
    const nextPremove = queuedPremoves[0];
    const candidateMoves = chess.moves({ square: nextPremove.from, verbose: true });
    const legal = candidateMoves.find((m) => m.to === nextPremove.to);
    if (!legal) {
      setQueuedPremoves((prev) => prev.slice(1));
      toast('Queued premove cancelled');
      return;
    }
    setQueuedPremoves((prev) => prev.slice(1));
    void executeMove(nextPremove.from, nextPremove.to);
  }, [activeGame, chess, executeMove, isMakingMove, isMyTurn, queuedPremoves]);

  const handleResign = async () => {
    if (!activeGameId || !activeGame || activeGame.result || isResigning) return;
    try {
      setIsResigning(true);
      const updated = await gameAPI.resign(activeGameId);
      hydrateFromGame(updated);
      toast('You resigned');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to resign');
    } finally {
      setIsResigning(false);
    }
  };

  const handleDraw = async () => {
    if (!activeGameId || !activeGame || activeGame.result || isOfferingDraw) return;
    try {
      setIsOfferingDraw(true);
      const updated = await gameAPI.draw(activeGameId);
      hydrateFromGame(updated);
      if (updated.result === '1/2-1/2') {
        toast('Draw agreed');
      } else if (updated.draw_offered_by === user?.id) {
        toast('Draw offer sent');
      } else {
        toast('Draw status updated');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to end game as draw');
    } finally {
      setIsOfferingDraw(false);
    }
  };

  const handleRejectDraw = async () => {
    if (!activeGameId || !activeGame || activeGame.result || isRejectingDraw) return;
    try {
      setIsRejectingDraw(true);
      const updated = await gameAPI.rejectDraw(activeGameId);
      hydrateFromGame(updated);
      setShowDrawOfferDialog(false);
      toast('Draw offer rejected');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to reject draw offer');
    } finally {
      setIsRejectingDraw(false);
    }
  };

  // Filter out invites where current user is the inviter (only show received invites)
  const receivedInvites = pendingInvites.filter(
    invite => invite.invitee_id === user?.id && invite.status === 'pending'
  );

  // Filter out invites where current user is the invitee (only show sent invites)
  const sentInvites = pendingInvites.filter(
    invite => invite.inviter_id === user?.id && invite.status === 'pending'
  );
  const currentHistory = useMemo(() => (chess ? chess.history({ verbose: true }) : []), [chess, chessFen]);
  const maxPly = currentHistory.length;
  const viewPly = analysisPly == null ? maxPly : Math.max(0, Math.min(analysisPly, maxPly));
  const isReviewMode = viewPly !== maxPly;
  const displayChess = useMemo(() => {
    const replay = new Chess(activeGame?.starting_fen || PREVIEW_START_FEN);
    for (let i = 0; i < viewPly; i += 1) {
      const move = currentHistory[i];
      replay.move({ from: move.from, to: move.to, promotion: move.promotion });
    }
    return replay;
  }, [activeGame?.starting_fen, currentHistory, viewPly]);
  const displayFen = displayChess.fen();
  const displayLastMove = viewPly > 0 ? currentHistory[viewPly - 1] : null;
  const boardOrientation: 'white' | 'black' = activeGame && user && activeGame.white_player_id !== user.id ? 'black' : 'white';
  const isTimedGame = !!activeGame && !!activeGame.time_control && activeGame.time_control !== 'unlimited';
  const whitePlayerName = activeGame
    ? (activeGame.white_player_id === user?.id ? user?.username || 'You' : opponentUser?.username || 'Opponent')
    : 'White';
  const blackPlayerName = activeGame
    ? (activeGame.black_player_id === user?.id ? user?.username || 'You' : opponentUser?.username || 'Opponent')
    : 'Black';
  const whiteRating = activeGame
    ? (activeGame.white_player_id === user?.id ? user?.rating : opponentUser?.rating)
    : undefined;
  const blackRating = activeGame
    ? (activeGame.black_player_id === user?.id ? user?.rating : opponentUser?.rating)
    : undefined;
  const checkedKingSquare = useMemo(() => {
    if (!displayChess.isCheck()) return null;
    const checkedColor = displayChess.turn();
    const board = displayChess.board();
    for (let rank = 0; rank < board.length; rank += 1) {
      for (let file = 0; file < board[rank].length; file += 1) {
        const piece = board[rank][file];
        if (piece && piece.type === 'k' && piece.color === checkedColor) {
          return `${String.fromCharCode(97 + file)}${String(8 - rank)}`;
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
    if (selectedSquare) styles[selectedSquare] = { ...(styles[selectedSquare] || {}), backgroundColor: 'rgba(190,242,100,0.38)' };
    legalTargets.forEach((s) => {
      styles[s] = { ...(styles[s] || {}), backgroundImage: 'radial-gradient(circle, rgba(163,230,53,0.82) 18%, rgba(163,230,53,0) 22%)' };
    });
    captureTargets.forEach((s) => {
      styles[s] = { ...(styles[s] || {}), backgroundColor: 'rgba(251,191,36,0.45)' };
    });
    if (checkedKingSquare) styles[checkedKingSquare] = { ...(styles[checkedKingSquare] || {}), backgroundColor: 'rgba(220,38,38,0.58)' };
    return styles;
  }, [captureTargets, checkedKingSquare, displayLastMove, lastMove, legalTargets, selectedSquare]);
  const moveRows = useMemo(() => {
    const history = currentHistory.map((m) => m.san);
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

  useEffect(() => {
    const currentResult = activeGame?.result || null;
    const previousResult = previousResultRef.current;
    if (currentResult && currentResult !== previousResult) {
      setShowGameOverDialog(true);
      setAnalysisPly(maxPly);
    }
    previousResultRef.current = currentResult;
  }, [activeGame?.result, maxPly]);

  useEffect(() => {
    const currentOfferBy = activeGame?.draw_offered_by ?? null;
    const previousOfferBy = previousDrawOfferedByRef.current;

    // Opponent offered draw -> show accept/reject popup.
    if (
      activeGame &&
      !activeGame.result &&
      currentOfferBy != null &&
      currentOfferBy !== user?.id
    ) {
      setShowDrawOfferDialog(true);
    }

    // My outstanding offer disappeared without result -> opponent rejected.
    if (
      activeGame &&
      !activeGame.result &&
      previousOfferBy === user?.id &&
      currentOfferBy == null
    ) {
      toast('Your draw offer was rejected');
      setShowDrawOfferDialog(false);
    }

    // Any terminal result closes draw dialog.
    if (activeGame?.result) {
      setShowDrawOfferDialog(false);
    }

    previousDrawOfferedByRef.current = currentOfferBy;
  }, [activeGame, user?.id]);

  const startRematch = async () => {
    if (!activeGame || !user?.id || isSendingRematchInvite) return;
    const opponentId =
      activeGame.white_player_id === user.id
        ? activeGame.black_player_id
        : activeGame.white_player_id;
    if (!opponentId) {
      toast.error('Unable to identify opponent for rematch');
      return;
    }
    try {
      setIsSendingRematchInvite(true);
      await gameAPI.createInvite(opponentId, activeGame.time_control || 'unlimited');
      setShowGameOverDialog(false);
      setActiveGameId(null);
      setActiveGame(null);
      setChess(null);
      setChessFen(PREVIEW_START_FEN);
      setIsMyTurn(false);
      setSelectedSquare(null);
      setLegalTargets([]);
      setCaptureTargets([]);
      setLastMove(null);
      setPendingPromotion(null);
      setQueuedPremoves([]);
      setShowDrawOfferDialog(false);
      setAnalysisPly(null);
      previousResultRef.current = null;
      previousDrawOfferedByRef.current = null;
      toast.success('Rematch invite sent! Waiting for opponent...');
      void loadInvites();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to send rematch invite');
    } finally {
      setIsSendingRematchInvite(false);
    }
  };

  const goToLobby = () => {
    setShowGameOverDialog(false);
    setActiveGameId(null);
    setActiveGame(null);
    setChess(null);
    setChessFen(PREVIEW_START_FEN);
    setIsMyTurn(false);
    setSelectedSquare(null);
    setLegalTargets([]);
    setCaptureTargets([]);
    setLastMove(null);
    setPendingPromotion(null);
    setQueuedPremoves([]);
    setShowDrawOfferDialog(false);
    setAnalysisPly(null);
    previousResultRef.current = null;
    previousDrawOfferedByRef.current = null;
  };

  return (
    <div className="mx-auto max-w-6xl pt-0">
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-3xl border-2 border-border bg-card px-3 pb-3 pt-0.5 shadow-xl sm:px-4 sm:pb-4 sm:pt-1">
            <div className="mx-auto w-full max-w-[min(100%,410px)] sm:max-w-[480px]">
              {inGame && (
                <div className="mb-2 flex items-center justify-between rounded-md border border-border bg-background/80 px-2 py-1 text-xs">
                  <span className="font-semibold text-card-foreground">
                    {boardOrientation === 'white' ? blackPlayerName : whitePlayerName}
                    {boardOrientation === 'white'
                      ? (blackRating != null ? ` (${blackRating})` : '')
                      : (whiteRating != null ? ` (${whiteRating})` : '')}
                  </span>
                  <span className={`font-mono font-bold ${isTimedGame ? 'text-card-foreground' : 'text-muted-foreground'}`}>
                    <span
                      className={clockClassName(
                        isTimedGame,
                        boardOrientation === 'white' ? displayBlackTimeMs : displayWhiteTimeMs
                      )}
                    >
                      {isTimedGame
                        ? (boardOrientation === 'white' ? formatClock(displayBlackTimeMs) : formatClock(displayWhiteTimeMs))
                        : '--:--'}
                    </span>
                  </span>
                </div>
              )}
              <Chessboard
                options={{
                  position: inGame ? displayFen : PREVIEW_START_FEN,
                  boardOrientation,
                  arePiecesDraggable: inGame && !isReviewMode && !activeGame?.result,
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
                  squareStyles,
                }}
              />
              {inGame && (
                <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-background/80 px-2 py-1 text-xs">
                  <span className="font-semibold text-card-foreground">
                    {boardOrientation === 'white' ? whitePlayerName : blackPlayerName}
                    {boardOrientation === 'white'
                      ? (whiteRating != null ? ` (${whiteRating})` : '')
                      : (blackRating != null ? ` (${blackRating})` : '')}
                  </span>
                  <span className={`font-mono font-bold ${isTimedGame ? 'text-card-foreground' : 'text-muted-foreground'}`}>
                    <span
                      className={clockClassName(
                        isTimedGame,
                        boardOrientation === 'white' ? displayWhiteTimeMs : displayBlackTimeMs
                      )}
                    >
                      {isTimedGame
                        ? (boardOrientation === 'white' ? formatClock(displayWhiteTimeMs) : formatClock(displayBlackTimeMs))
                        : '--:--'}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border-2 border-border bg-card shadow-sm">
            <div className="p-5">
              <div className="mb-4 rounded-xl border border-border bg-muted/60 px-3 py-2.5">
                <p className="font-heading text-sm font-bold text-card-foreground">
                  {inGame ? (activeGame?.result ? 'Game Over' : (isMyTurn ? 'Your turn' : 'Opponent thinking...')) : 'Invite a Friend'}
                </p>
                {!inGame && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Search students and send a game invite.
                  </p>
                )}
              </div>

              {inGame && (
                <div className="mb-4 rounded-xl border border-border bg-background/70 p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Moves</span>
                    <span className="font-bold text-card-foreground">{activeGame?.total_moves || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Result</span>
                    <span className="font-bold text-card-foreground">{activeGame?.result || 'In progress'}</span>
                  </div>
                  {activeGame?.draw_offered_by && !activeGame?.result && (
                    <p className="text-xs font-semibold text-muted-foreground">
                      {activeGame.draw_offered_by === user?.id
                        ? 'Draw offered. Waiting for opponent response...'
                        : 'Opponent offered a draw.'}
                    </p>
                  )}
                  {queuedPremoves.length > 0 && !activeGame?.result && (
                    <p className="text-xs font-semibold text-amber-700">
                      Premoves queued: {queuedPremoves.length}
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDraw}
                      disabled={!activeGame || !!activeGame.result || isOfferingDraw || activeGame.draw_offered_by === user?.id}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 disabled:opacity-50"
                    >
                      {isOfferingDraw ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      {isOfferingDraw
                        ? 'Updating...'
                        : activeGame?.draw_offered_by && activeGame.draw_offered_by !== user?.id
                          ? 'Accept Draw'
                          : activeGame?.draw_offered_by === user?.id
                            ? 'Draw Offered'
                            : 'Offer Draw'}
                    </button>
                    <button
                      type="button"
                      onClick={handleResign}
                      disabled={!activeGame || !!activeGame.result || isResigning}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50"
                    >
                      {isResigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                      {isResigning ? 'Resigning...' : 'Resign'}
                    </button>
                  </div>
                </div>
              )}

              {inGame && (
                <div className="mb-4 rounded-2xl border border-border bg-background/60 p-3">
                  <div className="mb-3 grid w-full grid-cols-4 gap-2">
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
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    Move {viewPly} / {maxPly}
                  </p>
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

              {!inGame && (
              <div className="mb-4 rounded-xl border border-border bg-background/70 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Time Control</p>
                <div className="grid grid-cols-2 gap-2">
                  {['unlimited', '3+0', '5+0', '10+0', '15+10', '30+0'].map((tc) => (
                    <button
                      key={tc}
                      type="button"
                      onClick={() => setSelectedTimeControl(tc)}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-bold transition-colors ${
                        selectedTimeControl === tc
                          ? 'border-orange-300 bg-orange-100 text-orange-800'
                          : 'border-border bg-white text-card-foreground hover:bg-muted'
                      }`}
                    >
                      {tc === 'unlimited' ? 'Unlimited' : tc}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {!inGame && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by username or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-background px-10 py-3 font-heading text-base focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              )}

              {!inGame && searchResults.length > 0 && (
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-background p-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-sm font-bold text-white">
                          {usernameInitial(result.username)}
                        </div>
                        <div>
                          <p className="font-heading text-sm font-bold text-card-foreground">{result.full_name}</p>
                          <p className="text-xs text-muted-foreground">@{result.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInvite(result.id, result.full_name)}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-400 to-pink-500 px-3 py-1.5 text-xs font-bold text-white transition-all hover:shadow-md"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!inGame && searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <p className="mt-3 text-center text-xs text-muted-foreground">No users found</p>
              )}

              <div className="mt-4 rounded-2xl border border-border bg-background/60 p-3">
                <p className="mb-2 font-heading text-sm font-bold text-card-foreground">
                  Invites Received ({receivedInvites.length})
                </p>
                {receivedInvites.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pending invites</p>
                ) : (
                  <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                    {receivedInvites.map((invite) => (
                      <div key={invite.id} className="rounded-lg border border-green-200 bg-green-50 p-2.5">
                        <p className="text-xs font-bold text-card-foreground">
                          {invite.inviter?.full_name || 'Unknown'} invited you
                        </p>
                        <p className="mb-2 text-[11px] text-muted-foreground">
                          Time: {invite.time_control || 'unlimited'}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptInvite(invite.id)}
                            className="flex items-center gap-1 rounded-md bg-green-500 px-2 py-1 text-[11px] font-bold text-white"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectInvite(invite.id)}
                            className="flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-[11px] font-bold text-red-600"
                          >
                            <XCircle className="h-3 w-3" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-2xl border border-border bg-background/60 p-3">
                <p className="mb-2 font-heading text-sm font-bold text-card-foreground">
                  Invites Sent ({sentInvites.length})
                </p>
                {sentInvites.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pending sent invites</p>
                ) : (
                  <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
                    {sentInvites.map((invite) => (
                      <div key={invite.id} className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                        <p className="text-xs font-bold text-card-foreground">
                          {invite.invitee?.full_name || 'Unknown'}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Waiting... Time: {invite.time_control || 'unlimited'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {showGameOverDialog && activeGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div
            className="relative w-full max-w-md rounded-3xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-100 via-teal-50 to-lime-100 p-6 text-center shadow-2xl"
            style={{ animation: 'winPop 500ms cubic-bezier(0.2, 0.9, 0.2, 1)' }}
          >
            <button
              type="button"
              onClick={() => {
                goToLobby();
              }}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300 bg-white/90 text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50"
              aria-label="Close and go to play"
            >
              <X className="h-4 w-4" />
            </button>
            {activeGame.result === '1/2-1/2' ? (
              <p className="text-5xl">😐♟️</p>
            ) : activeGame.winner_id === user?.id ? (
              <p className="text-5xl">🎉🏆🎉</p>
            ) : (
              <p className="text-5xl">😔♟️</p>
            )}
            <h3 className="mt-2 font-heading text-3xl font-extrabold text-emerald-700">
              {activeGame.result === '1/2-1/2'
                ? "It's a draw!"
                : activeGame.winner_id === user?.id
                  ? 'You won!'
                  : 'You lost'}
            </h3>
            <p className="mt-2 text-sm font-semibold text-emerald-900">
              {activeGame.result === '1/2-1/2'
                ? 'Great effort from both sides.'
                : `Winner: ${activeGame.winner_id === activeGame.white_player_id ? 'White' : 'Black'}`}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-800">
              {activeGame.result_reason === 'checkmate'
                ? "That's a checkmate!"
                : activeGame.result_reason === 'resign'
                  ? 'Game ended by resignation.'
                  : activeGame.result_reason === 'auto_resign'
                    ? 'Game ended by auto-resign.'
                    : 'Game finished.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowGameOverDialog(false);
                  setAnalysisPly(0);
                }}
                className="rounded-full border border-emerald-400 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                Analyze your Game
              </button>
              <button
                type="button"
                onClick={startRematch}
                disabled={isSendingRematchInvite}
                className="rounded-full border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingRematchInvite ? 'Sending invite...' : 'Re-match'}
              </button>
              <button
                type="button"
                onClick={goToLobby}
                className="rounded-full bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:from-emerald-500 hover:to-green-400"
              >
                Play again
              </button>
            </div>
          </div>
        </div>
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

      {showDrawOfferDialog && activeGame && !activeGame.result && activeGame.draw_offered_by && activeGame.draw_offered_by !== user?.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-md rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 p-6 shadow-2xl">
            <h3 className="text-center font-heading text-2xl font-extrabold text-blue-700">
              Draw Offered
            </h3>
            <p className="mt-2 text-center text-sm font-semibold text-blue-900">
              Your opponent is offering a draw. Do you want to accept it?
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDraw}
                disabled={isOfferingDraw || isRejectingDraw}
                className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isOfferingDraw ? 'Accepting...' : 'Accept'}
              </button>
              <button
                type="button"
                onClick={handleRejectDraw}
                disabled={isOfferingDraw || isRejectingDraw}
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 shadow-sm transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRejectingDraw ? 'Rejecting...' : 'Reject'}
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
      `}</style>
    </div>
  );
}
