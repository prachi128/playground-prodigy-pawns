// app/(student)/chess-game/[gameId]/page.tsx - Chess Game Page

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { gameAPI, Game } from '@/lib/api';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { ArrowLeft, Loader2, Trophy, Users } from 'lucide-react';
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
  const [whitePlayer, setWhitePlayer] = useState<any>(null);
  const [blackPlayer, setBlackPlayer] = useState<any>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameStatus, setGameStatus] = useState<string>('');
  const [isMakingMove, setIsMakingMove] = useState(false);
  const [isBotGame, setIsBotGame] = useState(false);
  const [botName, setBotName] = useState<string>('Pawny');
  const [botAvatar, setBotAvatar] = useState<string>('♟️');
  
  // Map bot difficulty to friendly name and avatar
  const getBotInfo = (difficulty: string | null | undefined): { name: string; avatar: string } => {
    if (!difficulty) return { name: 'Pawny', avatar: '♟️' };
    const difficultyLower = difficulty.toLowerCase();
    if (difficultyLower === 'beginner') return { name: 'Pawny', avatar: '♟️' };
    if (difficultyLower === 'intermediate') return { name: 'Knighty', avatar: '♞' };
    if (difficultyLower === 'advanced') return { name: 'Rookie', avatar: '♜' };
    if (difficultyLower === 'expert') return { name: 'Queen Chess', avatar: '♛' };
    return { name: 'Pawny', avatar: '♟️' };
  };
  const lastMoveCountRef = useRef<number>(0);

  useEffect(() => {
    loadGame();
  }, [gameId]);

  const loadGame = async () => {
    try {
      setIsLoading(true);
      const gameData = await gameAPI.getGame(gameId);
      setGame(gameData);
      
      // Initialize chess board with starting position or current FEN
      const startingFen = gameData.starting_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const currentFen = gameData.final_fen || startingFen;
      
      const chessInstance = new Chess(currentFen);
      setChess(chessInstance);
      setChessFen(chessInstance.fen());
      
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
      
      // Load player info - mark bot players
      if (isBotGameCheck) {
        // We need to check which player is the bot
        // The bot user has username "__BOT__"
        // For now, we'll check by trying to load player data or use a heuristic
        // Since we can't easily check here, we'll mark based on game structure
        // The bot will be the player that's not the current user
        if (gameData.white_player_id === user?.id) {
          setWhitePlayer({ id: gameData.white_player_id });
          setBlackPlayer({ id: gameData.black_player_id, full_name: botName, isBot: true });
        } else {
          setWhitePlayer({ id: gameData.white_player_id, full_name: botName, isBot: true });
          setBlackPlayer({ id: gameData.black_player_id });
        }
      } else {
        setWhitePlayer({ id: gameData.white_player_id });
        setBlackPlayer({ id: gameData.black_player_id });
      }
      
      // Set game status
      if (gameData.result) {
        setGameStatus(`Game Over: ${gameData.result}`);
      } else if (chessInstance.isCheckmate()) {
        setGameStatus('Checkmate!');
      } else if (chessInstance.isCheck()) {
        setGameStatus('Check!');
      } else {
        setGameStatus('Game in progress');
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
      if (currentMoveCount > lastMoveCountRef.current) {
        // Game state has changed - update the board
        const startingFen = updatedGameData.starting_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const currentFen = updatedGameData.final_fen || startingFen;
        
        const newChess = new Chess(currentFen);
        setChess(newChess);
        setChessFen(newChess.fen());
        setGame(updatedGameData);
        lastMoveCountRef.current = currentMoveCount;

        // Update turn status
        const isBotGameCheck = !!updatedGameData.bot_difficulty;
        
        // Update bot name and avatar if needed
        if (isBotGameCheck && updatedGameData.bot_difficulty) {
          const botInfo = getBotInfo(updatedGameData.bot_difficulty);
          setBotName(botInfo.name);
          setBotAvatar(botInfo.avatar);
        }
        const isWhite = updatedGameData.white_player_id === user.id;
        const isBlack = updatedGameData.black_player_id === user.id;
        const isWhiteTurn = newChess.turn() === 'w';
        setIsMyTurn((isWhite && isWhiteTurn) || (isBlack && !isWhiteTurn));
        
        // If it's a bot game and bot's turn, trigger bot move
        if (isBotGameCheck && !isMyTurn && !updatedGameData.result) {
          setTimeout(async () => {
            try {
              await gameAPI.getBotMove(gameId);
              loadGame();
            } catch (error) {
              console.error('Failed to get bot move:', error);
            }
          }, 500);
        }

        // Update game status
        if (updatedGameData.result) {
          setGameStatus(`Game Over: ${updatedGameData.result}`);
          if (updatedGameData.winner_id === user.id) {
            toast.success('You won! 🎉');
          } else {
            toast('Game ended');
          }
        } else if (newChess.isCheckmate()) {
          setGameStatus('Checkmate!');
          toast.success('Checkmate!');
        } else if (newChess.isCheck()) {
          setGameStatus('Check!');
          toast('Check!');
        } else if (newChess.isDraw()) {
          setGameStatus('Draw!');
          toast('Game ended in a draw');
        } else {
          setGameStatus('Game in progress');
          // Show notification that opponent made a move
          toast('Opponent made a move!');
        }
      }
    } catch (error) {
      console.error('Failed to check for game updates:', error);
    }
  }, [game, gameId, user?.id]);

  // Poll for game updates when it's not the user's turn
  useEffect(() => {
    if (!game || isMyTurn || game.result) return; // Don't poll if game ended or it's user's turn

    const pollInterval = setInterval(() => {
      checkForGameUpdates();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(pollInterval);
  }, [game, isMyTurn, checkForGameUpdates]);

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
      
      let move = chess.move(moveOptions);
      
      // If move failed and we're on a promotion rank, try with promotion
      if (move === null && isPromotionRank) {
        moveOptions.promotion = 'q';
        move = chess.move(moveOptions);
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

        // Update game state
        setGame(updatedGame);
        
        // Update chess instance with new FEN from backend
        const newChess = new Chess(updatedGame.final_fen || chess.fen());
        setChess(newChess);
        setChessFen(newChess.fen());

        // Update turn - check if it's still user's turn
        const isBotGameCheck = !!updatedGame.bot_difficulty;
        
        // Update bot name and avatar if needed
        if (isBotGameCheck && updatedGame.bot_difficulty) {
          const botInfo = getBotInfo(updatedGame.bot_difficulty);
          setBotName(botInfo.name);
          setBotAvatar(botInfo.avatar);
        }
        const isWhite = updatedGame.white_player_id === user?.id;
        const isBlack = updatedGame.black_player_id === user?.id;
        const isWhiteTurn = newChess.turn() === 'w';
        setIsMyTurn((isWhite && isWhiteTurn) || (isBlack && !isWhiteTurn));
        
        // If it's a bot game and bot's turn, trigger bot move
        if (isBotGameCheck && !isMyTurn && !updatedGame.result) {
          // Wait a bit then trigger bot move
          setTimeout(async () => {
            try {
              await gameAPI.getBotMove(gameId);
              // Refresh game state
              loadGame();
            } catch (error) {
              console.error('Failed to get bot move:', error);
            }
          }, 500);
        }
        
        // Check game status
        if (updatedGame.result) {
          setGameStatus(`Game Over: ${updatedGame.result}`);
          if (updatedGame.winner_id === user?.id) {
            toast.success('You won! 🎉');
          } else {
            toast('Game ended');
          }
        } else if (newChess.isCheckmate()) {
          setGameStatus('Checkmate!');
          toast.success('Checkmate!');
        } else if (newChess.isDraw()) {
          setGameStatus('Draw!');
          toast('Game ended in a draw');
        } else if (newChess.isCheck()) {
          setGameStatus('Check!');
          toast('Check!');
        } else {
          setGameStatus('Game in progress');
        }

        return true;
      } catch (apiError: any) {
        // Revert the move if API call failed
        chess.undo();
        setChessFen(chess.fen());
        const errorMessage = apiError.response?.data?.detail || 'Failed to make move';
        toast.error(errorMessage);
        return false;
      } finally {
        setIsMakingMove(false);
      }
    } catch (error) {
      console.error('Invalid move:', error);
      toast.error('Invalid move');
      setIsMakingMove(false);
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl pt-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="font-heading font-semibold text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game || !chess) {
    return (
      <div className="mx-auto max-w-6xl pt-6">
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
  const isWhite = game.white_player_id === user?.id;
  const isBlack = game.black_player_id === user?.id;

  return (
    <div className="mx-auto max-w-6xl pt-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/chess-game"
          className="flex items-center gap-2 rounded-lg border-2 border-border bg-background px-4 py-2 font-heading font-bold transition-all hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lobby
        </Link>
        <div className="rounded-lg bg-gradient-to-r from-orange-400 to-pink-500 px-4 py-2">
          <span className="font-heading font-bold text-white">Game #{game.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chess Board */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-xl">
            {/* Player Info - Black (top) */}
            <div className="mb-4 flex items-center justify-between rounded-xl border-2 border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
                  blackPlayer?.isBot 
                    ? 'bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg' 
                    : 'bg-gray-700'
                } text-white`}>
                  {blackPlayer?.isBot ? botAvatar : (blackPlayer?.full_name?.charAt(0) || 'B')}
                </div>
                <div>
                  <p className="font-heading font-bold text-white">
                    {isBlack ? 'You (Black)' : (blackPlayer?.isBot ? `${botName} (Black)` : 'Opponent (Black)')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isBlack && !isMyTurn ? 'Your turn' : isBlack && isMyTurn ? 'Waiting...' : (blackPlayer?.isBot ? 'Bot thinking...' : 'Opponent')}
                  </p>
                </div>
              </div>
              {isBlack && (
                <div className="rounded-lg bg-gray-700 px-3 py-1">
                  <span className="font-heading text-sm font-bold text-white">You</span>
                </div>
              )}
            </div>

            {/* Chess Board */}
            <div className="flex justify-center">
              <div className="w-full max-w-[500px] relative">
                {isMakingMove && (
                  <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                {/* @ts-expect-error - react-chessboard types are incomplete */}
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
                    arePiecesDraggable: isMyTurn && !isMakingMove,
                    boardStyle: {
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                      opacity: isMakingMove ? 0.7 : 1,
                    },
                    darkSquareStyle: { backgroundColor: '#769656' },
                    lightSquareStyle: { backgroundColor: '#eeeed2' },
                  }}
                />
              </div>
            </div>

            {/* Player Info - White (bottom) */}
            <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
                  whitePlayer?.isBot 
                    ? 'bg-gradient-to-br from-gray-100 to-gray-200 shadow-lg' 
                    : 'bg-gray-100'
                } text-gray-800`}>
                  {whitePlayer?.isBot ? botAvatar : (whitePlayer?.full_name?.charAt(0) || 'W')}
                </div>
                <div>
                  <p className="font-heading font-bold text-gray-900">
                    {isWhite ? 'You (White)' : (whitePlayer?.isBot ? `${botName} (White)` : 'Opponent (White)')}
                  </p>
                  <p className="text-xs text-gray-600">
                    {isWhite && isMyTurn ? 'Your turn' : isWhite && !isMyTurn ? 'Waiting...' : (whitePlayer?.isBot ? 'Bot thinking...' : 'Opponent')}
                  </p>
                </div>
              </div>
              {isWhite && (
                <div className="rounded-lg bg-orange-100 px-3 py-1">
                  <span className="font-heading text-sm font-bold text-orange-700">You</span>
                </div>
              )}
            </div>

            {/* Game Status */}
            {gameStatus && (
              <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-4 text-center border-2 border-blue-200">
                <p className="font-heading font-bold text-blue-900">{gameStatus}</p>
              </div>
            )}
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
                <span className="font-heading font-bold">{game.time_control || 'Unlimited'}</span>
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

          {/* Move History (placeholder) */}
          <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm">
            <h3 className="font-heading text-lg font-bold text-card-foreground mb-4">
              Move History
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center py-4">
                Move history will appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
