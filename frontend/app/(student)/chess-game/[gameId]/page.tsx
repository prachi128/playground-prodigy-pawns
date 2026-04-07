// app/(student)/chess-game/[gameId]/page.tsx - Chess Game Page

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { gameAPI, Game, User, usersAPI } from '@/lib/api';
import { getAvatarDisplayUrl, isDefaultOrEmptyAvatar, usernameInitial } from '@/lib/avatar';
import { getBotById } from '@/lib/bot-opponents';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Loader2, Trophy, Users, Flag, X, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ChessGamePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = parseInt(params.gameId as string);
  
  const { user } = useAuthStore();
  
  const [game, setGame] = useState<Game | null>(null);
  const [chess, setChess] = useState<Chess | null>(null);
  const [chessFen, setChessFen] = useState<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [isLoading, setIsLoading] = useState(true);
  const [whitePlayer, setWhitePlayer] = useState<User | { id: number; full_name?: string; avatar_url?: string; isBot?: boolean } | null>(null);
  const [blackPlayer, setBlackPlayer] = useState<User | { id: number; full_name?: string; avatar_url?: string; isBot?: boolean } | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isMakingMove, setIsMakingMove] = useState(false);
  const [isResigning, setIsResigning] = useState(false);
  const [isBotGame, setIsBotGame] = useState(false);
  const [botName, setBotName] = useState<string>('Pawny');
  const [botAvatar, setBotAvatar] = useState<string>('♟️');
  const [opponentAvatarError, setOpponentAvatarError] = useState(false);
  const [myAvatarError, setMyAvatarError] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [clockTick, setClockTick] = useState(0);

  // Reset avatar error state when game or players change
  useEffect(() => {
    setOpponentAvatarError(false);
    setMyAvatarError(false);
  }, [gameId, whitePlayer?.id, blackPlayer?.id]);

  // Map bot difficulty to friendly name and avatar
  const getBotInfo = (difficulty: string | null | undefined): { name: string; avatar: string } => {
    const bot = getBotById(difficulty);
    return { name: bot.name, avatar: bot.avatar };
  };

  // Show the result modal for any finished game so draws, checkmates, timeouts,
  // resignations, and other terminal states all get the same clear end screen.
  const shouldShowGameOverModal = (g: Game | null | undefined): boolean => {
    return !!g?.result;
  };

  // chess.js loadPgn expects PGN to end with a game termination (*, 1-0, 0-1, 1/2-1/2). Backend may not send it.
  const normalizePgnForChessJs = (pgn: string): string => {
    const trimmed = pgn.trim();
    if (!trimmed) return trimmed;
    if (/\s*(\*|1-0|0-1|1\/2-1\/2)\s*$/.test(trimmed)) return trimmed;
    return `${trimmed} *`;
  };
  const lastMoveCountRef = useRef<number>(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const INITIAL_CLOCK_MS = 10 * 60 * 1000;

  useEffect(() => {
    loadGame();
  }, [gameId]);

  // Tick every 500ms so effective clocks (and low-time styling) update smoothly
  useEffect(() => {
    if (!game || game.result || !!game.bot_difficulty) return;
    const id = window.setInterval(() => setClockTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [game?.id, game?.result]);

  // Get last move from chess instance for highlighting
  const getLastMove = useCallback(() => {
    if (!chess) return null;
    const history = chess.history({ verbose: true });
    if (history.length === 0) return null;
    const lastMoveObj = history[history.length - 1];
    return {
      from: lastMoveObj.from,
      to: lastMoveObj.to,
    };
  }, [chess]);

  const loadGame = async () => {
    try {
      setIsLoading(true);
      const gameData = await gameAPI.getGame(gameId);
      if (!gameData.bot_difficulty) {
        router.replace(`/chess-game?gameId=${gameId}`);
        return;
      }
      setGame(gameData);
      // Initialize chess board: use PGN when available (preserves move history), else FEN
      const startingFen = gameData.starting_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const currentFen = gameData.final_fen || startingFen;
      let chessInstance: Chess;
      if (gameData.pgn && gameData.pgn.trim()) {
        try {
          chessInstance = new Chess();
          chessInstance.loadPgn(normalizePgnForChessJs(gameData.pgn));
        } catch {
          chessInstance = new Chess(currentFen);
        }
      } else {
        chessInstance = new Chess(currentFen);
      }
      setChess(chessInstance);
      setChessFen(chessInstance.fen());
      
      // Update last move for highlighting
      const history = chessInstance.history({ verbose: true });
      if (history.length > 0) {
        const lastMoveObj = history[history.length - 1];
        setLastMove({ from: lastMoveObj.from, to: lastMoveObj.to });
      } else {
        setLastMove(null);
      }
      
      // Check if this is a bot game - we'll check by loading player info
      // For now, assume it's a bot game if we can't find player info
      // We'll check this properly after loading player data
      let isBotGameCheck = false;
      
      // Determine if it's user's turn
      const isWhite = gameData.white_player_id === user?.id;
      const isBlack = gameData.black_player_id === user?.id;
      const isWhiteTurn = chessInstance.turn() === 'w';
      setIsMyTurn((isWhite && isWhiteTurn) || (isBlack && !isWhiteTurn));
      
      // Check if this is a bot game by checking if bot_difficulty is set
      isBotGameCheck = !!gameData.bot_difficulty;
      setIsBotGame(isBotGameCheck);
      
      // Set bot name and avatar if bot game based on difficulty
      if (isBotGameCheck) {
        const botInfo = getBotInfo(gameData.bot_difficulty);
        setBotName(botInfo.name);
        setBotAvatar(botInfo.avatar);
      }
      
      // Load player info - include names/avatars when available, and mark bot player
      if (isBotGameCheck) {
        // One player is the current user, the other is the bot
        const botInfo = getBotInfo(gameData.bot_difficulty);
        if (gameData.white_player_id === user?.id) {
          setWhitePlayer(user as User);
          setBlackPlayer({ id: gameData.black_player_id, full_name: botInfo.name, avatar_url: '', isBot: true });
        } else if (gameData.black_player_id === user?.id) {
          setBlackPlayer(user as User);
          setWhitePlayer({ id: gameData.white_player_id, full_name: botInfo.name, avatar_url: '', isBot: true });
        } else {
          // Fallback: treat non-current user as bot
          setWhitePlayer({ id: gameData.white_player_id, full_name: botInfo.name, avatar_url: '', isBot: true });
          setBlackPlayer({ id: gameData.black_player_id });
        }
      } else {
        // Human vs human: fetch full user profiles so we have names and avatars
        try {
          const [whiteUser, blackUser] = await Promise.all([
            usersAPI.getById(gameData.white_player_id),
            usersAPI.getById(gameData.black_player_id),
          ]);
          setWhitePlayer(whiteUser);
          setBlackPlayer(blackUser);
        } catch {
          // Fallback to minimal info if fetching users fails
          setWhitePlayer((prev) => prev ?? { id: gameData.white_player_id });
          setBlackPlayer((prev) => prev ?? { id: gameData.black_player_id });
        }
      }
      
      // Open auto-resign modal if the game already ended due to auto-resign (no moves were played)
      if (shouldShowGameOverModal(gameData)) {
        setShowGameOverModal(true);
      }

      // Update last move count for change detection
      lastMoveCountRef.current = gameData.total_moves || 0;
    } catch (error) {
      console.error('Failed to load game:', error);
      toast.error('Failed to load game');
      router.push('/chess-game');
    } finally {
      setIsLoading(false);
    }
  };

  const checkForGameUpdates = useCallback(async () => {
    if (!game || !user?.id) return;

    try {
      const updatedGameData = await gameAPI.getGame(gameId);
      
      // Check if game state has changed (new moves made)
      const currentMoveCount = updatedGameData.total_moves || 0;

      // Always handle game end/result changes, even if no new moves were made (e.g. auto_resign / timeout).
      const hadResult = !!game.result;
      const hasResultNow = !!updatedGameData.result;
      const resultChanged =
        hasResultNow &&
        (!hadResult ||
          game.result !== updatedGameData.result ||
          game.result_reason !== updatedGameData.result_reason);

      if (currentMoveCount > lastMoveCountRef.current) {
        // Game state has changed - update the board (use PGN when available for move history)
        const startingFen = updatedGameData.starting_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const currentFen = updatedGameData.final_fen || startingFen;
        let newChess: Chess | null = null;
        if (updatedGameData.pgn && updatedGameData.pgn.trim()) {
          try {
            newChess = new Chess();
            newChess.loadPgn(normalizePgnForChessJs(updatedGameData.pgn));
          } catch {
            if (updatedGameData.final_fen || currentMoveCount === 0) newChess = new Chess(currentFen);
          }
        } else {
          if (updatedGameData.final_fen || currentMoveCount === 0) newChess = new Chess(currentFen);
        }
        // Don't reset board to starting position when game has progressed but API sent no valid PGN/FEN
        if (newChess) {
          setChess(newChess);
          setChessFen(newChess.fen());
          const history = newChess.history({ verbose: true });
          if (history.length > 0) {
            const lastMoveObj = history[history.length - 1];
            setLastMove({ from: lastMoveObj.from, to: lastMoveObj.to });
          } else {
            setLastMove(null);
          }
        }
        lastMoveCountRef.current = currentMoveCount;
        setGame(updatedGameData);

        // Update turn status (infer from FEN or newChess when available)
        const isBotGameCheck = !!updatedGameData.bot_difficulty;
        if (isBotGameCheck && updatedGameData.bot_difficulty) {
          const botInfo = getBotInfo(updatedGameData.bot_difficulty);
          setBotName(botInfo.name);
          setBotAvatar(botInfo.avatar);
        }
        const isWhite = updatedGameData.white_player_id === user.id;
        const isBlack = updatedGameData.black_player_id === user.id;
        if (newChess) {
          const isWhiteTurn = newChess.turn() === 'w';
          setIsMyTurn((isWhite && isWhiteTurn) || (isBlack && !isWhiteTurn));
        } else {
          // Infer turn from move count when we couldn't build board (even = white, odd = black)
          setIsMyTurn((isWhite && currentMoveCount % 2 === 0) || (isBlack && currentMoveCount % 2 === 1));
        }
        
        if (isBotGameCheck && !updatedGameData.result) {
          const myTurn = newChess ? ((isWhite && newChess.turn() === 'w') || (isBlack && newChess.turn() === 'b')) : ((isWhite && currentMoveCount % 2 === 0) || (isBlack && currentMoveCount % 2 === 1));
          if (!myTurn) {
            setTimeout(async () => {
              try {
                await gameAPI.getBotMove(gameId);
                loadGame();
              } catch (error) {
                console.error('Failed to get bot move:', error);
              }
            }, 500);
          }
        }

        // Update game status toasts when a move was made (non-terminal)
        if (!updatedGameData.result && newChess) {
          if (newChess.isCheckmate()) {
            toast.success('Checkmate!');
          } else if (newChess.isCheck()) {
            toast('Check!');
          } else if (newChess.isDraw()) {
            toast('Game ended in a draw');
          } else {
            toast('Opponent made a move!');
          }
        } else {
          toast('Opponent made a move!');
        }
      }

      // If the game just ended on the server (auto_resign / timeout / resign / checkmate, etc.),
      // update state and show the game-over modal, even if no new moves were made.
      if (resultChanged) {
        setGame(updatedGameData);
        if (shouldShowGameOverModal(updatedGameData)) {
          setShowGameOverModal(true);
        }
        if (updatedGameData.winner_id === user.id) {
          toast.success('You won! 🎉');
        } else {
          toast('Game ended');
        }
      }
    } catch (error) {
      console.error('Failed to check for game updates:', error);
    }
  }, [game, gameId, user?.id]);

  // Poll for game updates while the game is in progress (both players).
  useEffect(() => {
    if (!game || game.result) return; // Don't poll if game ended

    const pollInterval = setInterval(() => {
      checkForGameUpdates();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(pollInterval);
  }, [game, checkForGameUpdates]);

  const onDrop = async (sourceSquare: string, targetSquare: string) => {
    if (!chess || !isMyTurn || isMakingMove) return false;
    
    // Ignore moves where source and target are the same (piece dropped back on same square)
    if (sourceSquare === targetSquare) {
      return false;
    }
    
    try {
      // Check if this is a promotion move (pawn reaching 8th/1st rank)
      // We'll try the move first without promotion, and if it fails and target is rank 8/1, add promotion
      const targetRank = targetSquare[1];
      const isPromotionRank = targetRank === '8' || targetRank === '1';
      
      // Try move without promotion first
      let moveOptions: any = {
        from: sourceSquare,
        to: targetSquare,
      };
      
      let move = null;
      try {
        move = chess.move(moveOptions);
      } catch (error) {
        // chess.js throws error for invalid moves - catch it and set move to null
        move = null;
      }
      
      // If move failed and we're on a promotion rank, try with promotion
      if (move === null && isPromotionRank) {
        try {
          moveOptions.promotion = 'q';
          move = chess.move(moveOptions);
        } catch (error) {
          // Still invalid even with promotion
          move = null;
        }
      }

      if (move === null) {
        toast.error('Invalid move');
        return false;
      }

      setIsMakingMove(true);

      // Send move to backend - only include promotion if it was used
      try {
        const movePayload: any = {
          from: sourceSquare,
          to: targetSquare,
        };
        
        // Only add promotion if the move actually used promotion
        if (moveOptions.promotion) {
          movePayload.promotion = moveOptions.promotion;
        }
        
        const updatedGame = await gameAPI.makeMove(gameId, movePayload);

        // Helper function to update game state
        const updateGameState = (gameData: Game) => {
          // Update game state
          setGame(gameData);
          
          // Update chess instance: use PGN when available (for move history), else FEN
          const fenToUse = gameData.final_fen || gameData.starting_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
          let newChess: Chess;
          if (gameData.pgn && gameData.pgn.trim()) {
            try {
              newChess = new Chess();
              newChess.loadPgn(normalizePgnForChessJs(gameData.pgn));
              // If server sent final_fen and it differs from PGN result, trust final_fen for board position
              if (gameData.final_fen && newChess.fen() !== gameData.final_fen) {
                newChess = new Chess(gameData.final_fen);
              }
            } catch {
              newChess = new Chess(fenToUse);
            }
          } else {
            newChess = new Chess(fenToUse);
          }
          setChess(newChess);
          setChessFen(newChess.fen());
          
          // Update last move for highlighting
          const history = newChess.history({ verbose: true });
          if (history.length > 0) {
            const lastMoveObj = history[history.length - 1];
            setLastMove({ from: lastMoveObj.from, to: lastMoveObj.to });
          } else {
            setLastMove(null);
          }
          
          // Update last move count
          lastMoveCountRef.current = gameData.total_moves || 0;

          // Update bot name and avatar if needed
          const isBotGameCheck = !!gameData.bot_difficulty;
          if (isBotGameCheck && gameData.bot_difficulty) {
            const botInfo = getBotInfo(gameData.bot_difficulty);
            setBotName(botInfo.name);
            setBotAvatar(botInfo.avatar);
          }
          
          // Update turn status
          const isWhite = gameData.white_player_id === user?.id;
          const isBlack = gameData.black_player_id === user?.id;
          const isWhiteTurn = newChess.turn() === 'w';
          setIsMyTurn((isWhite && isWhiteTurn) || (isBlack && !isWhiteTurn));
          
          // Check game status (toasts only) and open auto-resign modal when relevant
          if (gameData.result) {
            if (shouldShowGameOverModal(gameData)) {
              setShowGameOverModal(true);
            }
            if (gameData.winner_id === user?.id) {
              toast.success('You won! 🎉');
            } else {
              toast('Game ended');
            }
          } else if (newChess.isCheckmate()) {
            toast.success('Checkmate!');
          } else if (newChess.isDraw()) {
            toast('Game ended in a draw');
          } else if (newChess.isCheck()) {
            toast('Check!');
          }
        };

        // Update with player's move immediately
        updateGameState(updatedGame);

        // For bot games, trigger bot move after a delay so player can see their move first
        const isBotGameCheck = !!updatedGame.bot_difficulty;
        
        if (isBotGameCheck) {
          // Check if it's bot's turn (player just moved, so it should be bot's turn)
          const isWhite = updatedGame.white_player_id === user?.id;
          const isBlack = updatedGame.black_player_id === user?.id;
          const newChess = new Chess(updatedGame.final_fen || chess.fen());
          const isWhiteTurn = newChess.turn() === 'w';
          const isBotTurn = (isWhite && !isWhiteTurn) || (isBlack && isWhiteTurn);
          
          if (isBotTurn && !updatedGame.result) {
            const movesBeforeBot = updatedGame.total_moves ?? 0;
            // Wait 1.5 seconds so player can see their move, then trigger bot move
            setTimeout(async () => {
              try {
                await gameAPI.getBotMove(gameId);
                // Always refetch so we have the latest board state (avoids board not updating)
                const latestGame = await gameAPI.getGame(gameId);
                updateGameState(latestGame);
                const movesAfter = latestGame.total_moves ?? 0;
                if (movesAfter > movesBeforeBot) {
                  toast('Bot made a move!');
                }
              } catch (error) {
                console.error('Failed to get bot move:', error);
                // Refresh game state as fallback
                try {
                  const latestGame = await gameAPI.getGame(gameId);
                  updateGameState(latestGame);
                } catch (refreshError) {
                  console.error('Failed to refresh game:', refreshError);
                }
              }
            }, 1500); // 1.5 second delay
          }
        }

        return true;
      } catch (apiError: any) {
        // Revert the move if API call failed (only if move was successfully made)
        try {
          if (move && chess.history().length > 0) {
            chess.undo();
            setChessFen(chess.fen());
          }
        } catch (undoError) {
          // If undo fails, just reload the chess state from FEN
          const currentFen = game?.final_fen || game?.starting_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
          const resetChess = new Chess(currentFen);
          setChess(resetChess);
          setChessFen(resetChess.fen());
        }
        const errorMessage = apiError.response?.data?.detail || 'Failed to make move';
        toast.error(errorMessage);
        return false;
      } finally {
        setIsMakingMove(false);
      }
    } catch (error) {
      // Handle any errors during move validation (invalid moves, etc.)
      console.error('Move validation error:', error);
      toast.error('Invalid move');
      setIsMakingMove(false);
      return false;
    }
  };

  const handleResign = async () => {
    if (!game || game.result || isResigning) return;
    if (!confirm('Are you sure you want to resign? Your opponent will win.')) return;
    try {
      setIsResigning(true);
      const updatedGame = await gameAPI.resign(gameId);
      setGame(updatedGame);
      setIsMyTurn(false);
      toast('You resigned');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to resign';
      toast.error(message);
    } finally {
      setIsResigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl pt-0 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="font-heading font-semibold text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game || !chess) {
    return (
      <div className="mx-auto max-w-6xl pt-0 -mx-2 -mt-3 lg:-mx-4 lg:-mt-4">
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6 text-center">
          <p className="font-heading font-bold text-red-700">Game not found</p>
          <Link href="/chess-game" className="mt-4 inline-block text-blue-600 hover:underline">
            Return to game lobby
          </Link>
        </div>
      </div>
    );
  }

  const isBotGameCheck = !!game.bot_difficulty;
  const botTheme = getBotById(game.bot_difficulty);
  const isWhite = game.white_player_id === user?.id;
  const isBlack = game.black_player_id === user?.id;
  const myColor = isWhite ? 'white' : 'black';
  const opponentColor = isWhite ? 'black' : 'white';
  const myPlayer = isWhite ? whitePlayer : blackPlayer;
  const opponentPlayer = isWhite ? blackPlayer : whitePlayer;
  const showClock = !isBotGameCheck;

  // Parse backend datetimes as UTC so client clock matches server clock.
  const toUtcMs = (value: string | Date | null | undefined): number => {
    if (!value) return Date.now();
    if (value instanceof Date) return value.getTime();
    const str = String(value);
    const iso = str.endsWith('Z') || str.includes('+') ? str : `${str}Z`;
    return new Date(iso).getTime();
  };

  // Effective clocks: only the side to move ticks; the other is paused (stored value only).
  // For move 0 we use the server's game.started_at; after that we use last_move_at, just like major sites.
  const noMovesYet = (game.total_moves ?? 0) === 0;
  const turnStartedMs =
    !noMovesYet && game.last_move_at
      ? toUtcMs(game.last_move_at as any)
      : toUtcMs(game.started_at as any);
  const elapsedMs = Date.now() - turnStartedMs;
  const fenParts = (game.final_fen || game.starting_fen || '').trim().split(/\s/);
  const whiteToMove = (fenParts[1] || 'w').toLowerCase() === 'w';
  const whiteStored = game.white_time_ms ?? INITIAL_CLOCK_MS;
  const blackStored = game.black_time_ms ?? INITIAL_CLOCK_MS;
  const effectiveWhiteMs = Math.max(0, whiteStored - (whiteToMove ? elapsedMs : 0));
  const effectiveBlackMs = Math.max(0, blackStored - (!whiteToMove ? elapsedMs : 0));

  const formatClock = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const clockClass = (ms: number) =>
    ms <= 10 * 1000 ? 'text-red-600 font-bold' : ms <= 60 * 1000 ? 'text-orange-600 font-semibold' : '';

  const getGameOverCopy = (
    g: Game,
    currentUserId?: number
  ): { title: string; subtitle: string; badge: string; badgeTone: 'win' | 'loss' | 'draw' } => {
    const isWinner = currentUserId != null && g.winner_id === currentUserId;
    const reason = g.result_reason || '';

    // Auto-resign and timeout feel like "lost on time" to one person, "won on time" to the other.
    if (reason === 'auto_resign' || reason === 'timeout') {
      if (isWinner) {
        return {
          title: 'You won on time!',
          subtitle: 'Great job staying focused and making your moves in time.',
          badge: 'Victory on Time',
          badgeTone: 'win',
        };
      }
      return {
        title: "Time's up this game",
        subtitle: "You ran out of time, and that's okay—next game, try to play a tiny bit faster.",
        badge: 'Learn from This Game',
        badgeTone: 'loss',
      };
    }

    if (reason === 'resign') {
      if (isWinner) {
        return {
          title: 'You won the game!',
          subtitle: 'Your opponent resigned. Nicely played—take a moment to spot what went well.',
          badge: 'Well Played',
          badgeTone: 'win',
        };
      }
      return {
        title: 'You chose to resign',
        subtitle: 'Every strong player sometimes resigns and learns. You can review this game and come back stronger.',
        badge: 'Good Sportsmanship',
        badgeTone: 'loss',
      };
    }

    // Checkmate / normal results
    if (g.result === '1-0' || g.result === '0-1') {
      if (isWinner) {
        return {
          title: 'Checkmate – You win!',
          subtitle: 'That was a strong finish. See if you can spot your best move from the game.',
          badge: 'Winner',
          badgeTone: 'win',
        };
      }
      return {
        title: 'Checkmated this time',
        subtitle: "Nice effort—every game is practice. See if you can find where the game started to turn.",
        badge: 'Keep Going',
        badgeTone: 'loss',
      };
    }

    // Draw or any other result
    if (g.result === '1/2-1/2') {
      return {
        title: "It's a draw!",
        subtitle: 'You both defended well. Draws mean the game was very balanced—great job.',
        badge: 'Even Game',
        badgeTone: 'draw',
      };
    }

    return {
      title: 'Game over',
      subtitle: 'This game has ended. You can hop into a new game or review this one.',
      badge: 'Game Finished',
      badgeTone: 'draw',
    };
  };

  return (
    <div className="relative min-h-full w-full bg-background">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col pb-6 px-2 lg:px-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chess Board */}
        <div className="lg:col-span-2">
          <div className={`rounded-2xl border-2 p-4 shadow-xl ${
            isBotGameCheck ? `${botTheme.borderColor} bg-gradient-to-br ${botTheme.panelGradient}` : 'border-border bg-card'
          }`}>
            {/* Player Info - Opponent (top); style by opponent's piece color (white = light bar, black = dark bar) */}
            <div className={`mb-1.5 flex items-center justify-between rounded-lg border-2 p-1.5 ${
              opponentColor === 'white'
                ? 'border-gray-200 bg-white'
                : 'border-gray-800 bg-gray-900'
            }`}>
              <div className="flex items-center gap-1.5">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold overflow-hidden ${
                  (opponentPlayer as any)?.isBot
                    ? opponentColor === 'white'
                      ? 'bg-gradient-to-br from-gray-100 to-gray-200 shadow-lg text-gray-800'
                      : 'bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg text-white'
                    : opponentColor === 'white'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-gray-700 text-white'
                }`}>
                  {(opponentPlayer as any)?.isBot
                    ? botAvatar
                    : getAvatarDisplayUrl((opponentPlayer as User | null)?.avatar_url) &&
                        !isDefaultOrEmptyAvatar((opponentPlayer as User | null)?.avatar_url) &&
                        !opponentAvatarError
                      ? (
                        <img
                          src={getAvatarDisplayUrl((opponentPlayer as User).avatar_url)}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover"
                          onError={() => setOpponentAvatarError(true)}
                        />
                      )
                      : (opponentPlayer as User)?.username?.trim()
                        ? usernameInitial((opponentPlayer as User).username)
                        : opponentColor === 'white'
                          ? 'W'
                          : 'B'}
                </div>
                <div className="min-w-0">
                  <p className={`font-heading text-xs font-bold truncate ${opponentColor === 'white' ? 'text-gray-900' : 'text-white'}`}>
                    {((opponentPlayer as any)?.full_name || (opponentPlayer as any)?.username || 'Opponent')}{' '}
                    ({opponentColor === 'white' ? 'White' : 'Black'})
                  </p>
                  <p className={opponentColor === 'white' ? 'text-[10px] text-gray-600' : 'text-[10px] text-gray-400'}>
                    {(opponentPlayer as any)?.isBot
                      ? (isMyTurn ? 'Waiting...' : 'Bot thinking...')
                      : (isMyTurn ? 'Waiting...' : 'Their turn')}
                  </p>
                </div>
              </div>
              {showClock ? (
                <div className={`shrink-0 font-mono text-sm font-bold tabular-nums ${opponentColor === 'white' ? 'text-gray-900' : 'text-white'} ${clockClass(opponentColor === 'white' ? effectiveWhiteMs : effectiveBlackMs)}`}>
                  {formatClock(opponentColor === 'white' ? effectiveWhiteMs : effectiveBlackMs)}
                </div>
              ) : (
                <div className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  No clock
                </div>
              )}
            </div>

            {/* Chess Board */}
            <div className="flex justify-center">
              <div className="w-full max-w-[420px] relative">
                {isMakingMove && (
                  <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center z-10">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                <Chessboard
                  key={chessFen}
                  options={{
                    position: chessFen,
                    onPieceDrop: ({ sourceSquare, targetSquare }) => {
                      if (!sourceSquare || !targetSquare) return false;
                      // Call async function but return immediately - the function handles state updates
                      onDrop(sourceSquare, targetSquare).catch(err => {
                        console.error('Move failed:', err);
                      });
                      return true; // Optimistically return true, actual validation happens in onDrop
                    },
                    boardOrientation: isWhite ? 'white' : 'black',
                    boardStyle: {
                      borderRadius: '8px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                      opacity: isMakingMove ? 0.7 : 1,
                    },
                    darkSquareStyle: { backgroundColor: isBotGameCheck ? botTheme.boardDark : '#769656' },
                    lightSquareStyle: { backgroundColor: isBotGameCheck ? botTheme.boardLight : '#eeeed2' },
                    squareStyles: lastMove ? {
                      [lastMove.from]: {
                        backgroundColor: 'rgba(255, 255, 0, 0.4)',
                        borderRadius: '4px',
                      },
                      [lastMove.to]: {
                        backgroundColor: 'rgba(255, 255, 0, 0.4)',
                        borderRadius: '4px',
                      },
                    } : {},
                  }}
                />
              </div>
            </div>

            {/* Player Info - You (bottom); style by your piece color (white = light bar, black = dark bar) */}
            <div className={`mt-1.5 flex items-center justify-between rounded-lg border-2 p-1.5 ${
              myColor === 'white'
                ? 'border-gray-200 bg-white'
                : 'border-gray-800 bg-gray-900'
            }`}>
              <div className="flex items-center gap-1.5">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold overflow-hidden ${
                  (myPlayer as any)?.isBot
                    ? myColor === 'white'
                      ? 'bg-gradient-to-br from-gray-100 to-gray-200 shadow-lg text-gray-800'
                      : 'bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg text-white'
                    : myColor === 'white'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-gray-700 text-white'
                }`}>
                  {(myPlayer as any)?.isBot
                    ? botAvatar
                    : getAvatarDisplayUrl((myPlayer as User | null)?.avatar_url) &&
                        !isDefaultOrEmptyAvatar((myPlayer as User | null)?.avatar_url) &&
                        !myAvatarError
                      ? (
                        <img
                          src={getAvatarDisplayUrl((myPlayer as User).avatar_url)}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover"
                          onError={() => setMyAvatarError(true)}
                        />
                      )
                      : (myPlayer as User)?.username?.trim() || user?.username?.trim()
                        ? usernameInitial(
                            (myPlayer as User)?.username ?? user?.username,
                          )
                        : myColor === 'white'
                          ? 'W'
                          : 'B'}
                </div>
                <div className="min-w-0">
                  <p className={`font-heading text-xs font-bold truncate ${myColor === 'white' ? 'text-gray-900' : 'text-white'}`}>
                    {((myPlayer as any)?.full_name || user?.full_name || 'You')}{' '}
                    ({myColor === 'white' ? 'White' : 'Black'})
                  </p>
                  <p className={myColor === 'white' ? 'text-[10px] text-gray-600' : 'text-[10px] text-gray-400'}>
                    {(myPlayer as any)?.isBot
                      ? (isMyTurn ? 'Your turn' : 'Bot thinking...')
                      : (isMyTurn ? 'Your turn' : 'Waiting...')}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {showClock ? (
                  <span className={`font-mono text-sm font-bold tabular-nums ${myColor === 'white' ? 'text-gray-900' : 'text-white'} ${clockClass(myColor === 'white' ? effectiveWhiteMs : effectiveBlackMs)}`}>
                    {formatClock(myColor === 'white' ? effectiveWhiteMs : effectiveBlackMs)}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    No clock
                  </span>
                )}
                <div className={`rounded px-1.5 py-0.5 ${myColor === 'white' ? 'bg-orange-100' : 'bg-gray-700'}`}>
                  <span className={`font-heading text-[10px] font-bold ${myColor === 'white' ? 'text-orange-700' : 'text-white'}`}>You</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Game Info Sidebar */}
        <div className="space-y-4">
          {/* Game Details */}
          <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm">
            <h3 className="font-heading text-lg font-bold text-card-foreground mb-4">
              Game Info
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Time Control</span>
                <span className="font-heading font-bold">{isBotGameCheck ? 'Unlimited' : (game.time_control || 'Unlimited')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Moves</span>
                <span className="font-heading font-bold">{game.total_moves || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="font-heading font-bold text-green-600">
                  {game.result || 'In Progress'}
                </span>
              </div>
            </div>
          </div>

          {/* Turn Indicator */}
          <div className={`rounded-3xl border-2 p-5 shadow-sm ${
            isMyTurn 
              ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' 
              : 'border-border bg-card'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                isMyTurn ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {isMyTurn ? (
                  <Trophy className="h-6 w-6 text-white" />
                ) : (
                  <Users className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <p className="font-heading font-bold text-card-foreground">
                  {isMyTurn ? 'Your Turn!' : 'Waiting for Opponent'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isMyTurn ? 'Make your move' : 'Opponent is thinking...'}
                </p>
              </div>
            </div>
          </div>

          {/* Resign - visible always; disabled when game is over or resigning */}
          <div className="rounded-3xl border-2 border-border bg-card p-4 shadow-sm">
            <button
              type="button"
              onClick={handleResign}
              disabled={!!game.result || isResigning}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2.5 font-heading text-sm font-bold text-red-700 transition-colors hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Flag className="h-4 w-4" />
              )}
              {isResigning ? 'Resigning...' : 'Resign'}
            </button>
          </div>

          {/* Move History */}
          <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm">
            <h3 className="font-heading text-lg font-bold text-card-foreground mb-4">
              Move History
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {(() => {
                const history = chess.history({ verbose: true });
                if (history.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No moves yet
                    </p>
                  );
                }
                // Group into (white, black?) pairs per move number
                const rows: { num: number; white: string; black?: string }[] = [];
                let num = 1;
                let i = 0;
                while (i < history.length) {
                  const whiteSan = history[i].san;
                  const blackSan = i + 1 < history.length ? history[i + 1].san : undefined;
                  rows.push({ num, white: whiteSan, black: blackSan });
                  i += 2;
                  num += 1;
                }
                return rows.map((row) => (
                  <div
                    key={row.num}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5 text-sm"
                  >
                    <span className="font-heading font-bold text-muted-foreground w-6 shrink-0">
                      {row.num}.
                    </span>
                    <span className="font-mono">{row.white}</span>
                    {row.black != null && (
                      <span className="font-mono">{row.black}</span>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Close inner layout wrapper */}
      </div>
      {/* Game over modal (auto_resign, timeout, resign, checkmate, draw) */}
      {showGameOverModal && game && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          {(() => {
            const { title, subtitle, badge, badgeTone } = getGameOverCopy(game, user?.id);
            const badgeClasses =
              badgeTone === 'win'
                ? 'bg-green-100 text-green-800 border-green-200'
                : badgeTone === 'loss'
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : 'bg-blue-100 text-blue-800 border-blue-200';

            return (
              <div className="relative max-w-sm rounded-3xl border border-border bg-gradient-to-b from-white via-slate-50 to-slate-100 px-6 py-7 text-center shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setShowGameOverModal(false);
                    router.push('/play');
                  }}
                  className="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-slate-500 hover:bg-black/10 hover:text-slate-700"
                  aria-label="Close game over dialog"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mb-4 flex flex-col items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-heading font-bold uppercase tracking-wide ${badgeClasses}`}
                  >
                    {badge}
                  </span>
                  <h2 className="font-heading text-2xl font-extrabold text-card-foreground">
                    {title}
                  </h2>
                  <p className="mx-auto max-w-xs text-xs font-heading font-semibold text-muted-foreground">
                    {subtitle}
                  </p>
                </div>

                {(() => {
                  const isWinner = user?.id != null && game.winner_id === user.id;
                  const isDraw = game.result === '1/2-1/2';
                  const label = isDraw
                    ? 'You Drew!'
                    : isWinner
                      ? '🎉 You Won!'
                      : '😔 You Lost';

                  return (
                    <div className="mb-5">
                      <p className="font-heading text-xl font-extrabold text-slate-900">
                        {label}
                      </p>
                    </div>
                  );
                })()}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGameOverModal(false);
                      router.push(`/chess-game/${game.id}/analysis`);
                    }}
                    className="w-full rounded-full bg-emerald-500 px-4 py-2.5 font-heading text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-600 sm:w-auto"
                  >
                    Learn from this game
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGameOverModal(false);
                      router.push('/chess-game');
                    }}
                    className="w-full rounded-full border border-border bg-muted px-4 py-2.5 font-heading text-sm font-bold text-card-foreground transition-colors hover:bg-muted/80 sm:w-auto"
                  >
                    Play again
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
