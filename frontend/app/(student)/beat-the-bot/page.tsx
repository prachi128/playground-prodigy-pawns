// app/(student)/beat-the-bot/page.tsx - Beat the Bot Page

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { gameAPI } from '@/lib/api';
import { Chessboard } from 'react-chessboard';
import { Bot, Loader2, Shuffle, Trophy, Zap } from 'lucide-react';
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
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedBotId, setSelectedBotId] = useState(BOT_OPPONENTS[0].id);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [colorChoice, setColorChoice] = useState<PlayColorChoice>('white');
  const selectedBot = getBotById(selectedBotId);

  const boardPreviewOrientation = colorChoice === 'black' ? 'black' : 'white';

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
      const game = await gameAPI.createBotGame({
        bot_difficulty: selectedBot.id,
        bot_depth: selectedBot.depth,
        player_color: playerColor,
      });
      
      toast.success(`Starting game against ${selectedBot.name}!`);
      router.push(`/chess-game/${game.id}`);
    } catch (error: any) {
      console.error('Failed to create bot game:', error);
      const message = error.response?.data?.detail || 'Failed to start game';
      toast.error(message);
    } finally {
      setIsCreatingGame(false);
    }
  };

  const turnLabel = sideToMoveLabelFromFen(PREVIEW_START_FEN);

  return (
    <div className="mx-auto max-w-6xl pt-0">
      {/* Split setup: board left, bot options right */}
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-3xl border-2 border-border bg-card px-3 pb-3 pt-1 shadow-xl sm:px-4 sm:pb-4 sm:pt-1.5">
            <div className="mx-auto w-full max-w-[min(100%,430px)] sm:max-w-[500px]">
              <Chessboard
                options={{
                  position: PREVIEW_START_FEN,
                  arePiecesDraggable: false,
                  boardOrientation: boardPreviewOrientation,
                  boardStyle: {
                    borderRadius: '12px',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.22)',
                  },
                  darkSquareStyle: { backgroundColor: selectedBot.boardDark },
                  lightSquareStyle: { backgroundColor: selectedBot.boardLight },
                }}
              />
            </div>
          </div>

          <div className="rounded-3xl border-2 border-border bg-card shadow-sm">
            <div className="p-5">
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

              <div
                className={`mt-4 rounded-2xl border-2 p-4 bg-gradient-to-br ${selectedBot.panelGradient} ${selectedBot.borderColor}`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Selected Bot
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 text-2xl shadow">
                    {selectedBot.avatar}
                  </div>
                  <div>
                    <p className="font-heading text-lg font-bold text-card-foreground">
                      {selectedBot.name}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {selectedBot.tagline}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{selectedBot.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                    <Trophy className="mr-1 inline h-3.5 w-3.5" />
                    {selectedBot.rating}
                  </span>
                  <span className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                    {BOT_TIER_LABELS[selectedBot.tier]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info Section */}
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
              <span>Start instantly from this page with one click</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 font-bold">•</span>
              <span>Win games to earn XP and improve your rating!</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
