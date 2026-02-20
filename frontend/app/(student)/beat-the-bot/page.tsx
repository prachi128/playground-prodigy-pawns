// app/(student)/beat-the-bot/page.tsx - Beat the Bot Page

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { gameAPI } from '@/lib/api';
import { Bot, Loader2, Trophy, Zap, Star, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface BotOption {
  id: string;
  name: string;
  difficulty: string;
  description: string;
  rating: number;
  depth: number;
  avatar: string; // Chess piece emoji for avatar
  emoji: string; // Decorative emoji
  color: string;
  borderColor: string;
  bgGradient: string; // Background gradient for avatar
  tagline: string; // Fun tagline for each bot
}

const botOptions: BotOption[] = [
  {
    id: 'beginner',
    name: 'Pawny',
    difficulty: 'Beginner',
    description: 'Perfect for learning the basics. Makes occasional mistakes.',
    rating: 400,
    depth: 5,
    avatar: '♟️',
    emoji: '🌱',
    color: 'from-green-400 to-emerald-500',
    borderColor: 'border-green-300',
    bgGradient: 'from-green-100 to-emerald-100',
    tagline: 'Your friendly first opponent!',
  },
  {
    id: 'intermediate',
    name: 'Knighty',
    difficulty: 'Intermediate',
    description: 'A solid opponent. Good for practicing your skills.',
    rating: 800,
    depth: 10,
    avatar: '♞',
    emoji: '⚔️',
    color: 'from-blue-400 to-cyan-500',
    borderColor: 'border-blue-300',
    bgGradient: 'from-blue-100 to-cyan-100',
    tagline: 'Ready for a real challenge?',
  },
  {
    id: 'advanced',
    name: 'Rookie',
    difficulty: 'Advanced',
    description: 'A strong opponent. Will challenge even experienced players.',
    rating: 1200,
    depth: 15,
    avatar: '♜',
    emoji: '🔥',
    color: 'from-orange-400 to-red-500',
    borderColor: 'border-orange-300',
    bgGradient: 'from-orange-100 to-red-100',
    tagline: 'Think you can handle this?',
  },
  {
    id: 'expert',
    name: 'Queen Chess',
    difficulty: 'Expert',
    description: 'Very strong! Only for the bravest challengers.',
    rating: 1800,
    depth: 20,
    avatar: '♛',
    emoji: '👑',
    color: 'from-purple-400 to-indigo-500',
    borderColor: 'border-purple-300',
    bgGradient: 'from-purple-100 to-indigo-100',
    tagline: 'The ultimate challenge awaits!',
  },
];

export default function BeatTheBotPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedBot, setSelectedBot] = useState<BotOption | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [colorChoice, setColorChoice] = useState<'white' | 'black' | null>(null);

  const handleStartGame = async () => {
    if (!selectedBot || !colorChoice || !user) {
      toast.error('Please select a bot and your color');
      return;
    }

    setIsCreatingGame(true);
    try {
      const game = await gameAPI.createBotGame({
        bot_difficulty: selectedBot.id,
        bot_depth: selectedBot.depth,
        player_color: colorChoice,
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

  return (
    <div className="mx-auto max-w-6xl pt-6">
      {/* Header */}
      <section className="mb-6">
        <div className="flex items-start gap-3">
          <div className="animate-mascot-bounce shrink-0 text-5xl">{"♞"}</div>
          <div className="relative flex-1">
            <div className="absolute -left-2 top-4 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-white" />
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-heading text-2xl font-bold text-card-foreground">
                    Beat the Bot! 🤖
                  </h1>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    Challenge AI opponents of varying difficulty levels
                  </p>
                </div>
                <Link
                  href="/play"
                  className="flex items-center gap-2 rounded-lg border-2 border-border bg-background px-4 py-2 font-heading font-bold transition-all hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bot Selection */}
      <section className="mb-6">
        <div className="rounded-3xl border-2 border-border bg-card shadow-sm">
          <div className="bg-gradient-to-r from-purple-400 to-indigo-500 px-5 py-4">
            <h2 className="font-heading text-lg font-bold text-white">
              Choose Your Opponent
            </h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {botOptions.map((bot, index) => (
                <button
                  key={bot.id}
                  onClick={() => setSelectedBot(bot)}
                  className={`group relative overflow-hidden rounded-2xl border-3 p-5 text-left transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                    selectedBot?.id === bot.id
                      ? `${bot.borderColor} bg-gradient-to-br ${bot.color} text-white shadow-2xl scale-[1.02] ring-4 ring-opacity-50 ${bot.borderColor.replace('border-', 'ring-')}`
                      : `border-border bg-white hover:${bot.borderColor} hover:shadow-xl`
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Decorative background pattern */}
                  <div className={`absolute inset-0 opacity-5 ${
                    selectedBot?.id === bot.id ? 'bg-white' : `bg-gradient-to-br ${bot.color}`
                  }`} style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, currentColor 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }} />
                  
                  <div className="relative flex items-start gap-4">
                    {/* Avatar Circle */}
                    <div className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-4xl transition-all duration-300 ${
                      selectedBot?.id === bot.id
                        ? 'bg-white/20 backdrop-blur-sm scale-110 shadow-lg'
                        : `bg-gradient-to-br ${bot.bgGradient} group-hover:scale-110 group-hover:shadow-md`
                    }`}>
                      <div className="relative z-10">{bot.avatar}</div>
                      {/* Glow effect when selected */}
                      {selectedBot?.id === bot.id && (
                        <div className="absolute inset-0 rounded-2xl bg-white/30 animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Name and Tagline */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h3 className={`font-heading text-xl font-bold mb-1 ${
                            selectedBot?.id === bot.id ? 'text-white' : 'text-card-foreground'
                          }`}>
                            {bot.name}
                          </h3>
                          <p className={`text-xs font-semibold ${
                            selectedBot?.id === bot.id ? 'text-white/80' : 'text-muted-foreground'
                          }`}>
                            {bot.tagline}
                          </p>
                        </div>
                        {/* Decorative emoji */}
                        <div className={`text-2xl transition-transform duration-300 ${
                          selectedBot?.id === bot.id ? 'scale-125' : 'group-hover:scale-110'
                        }`}>
                          {bot.emoji}
                        </div>
                      </div>
                      
                      {/* Description */}
                      <p className={`text-sm mb-4 leading-relaxed ${
                        selectedBot?.id === bot.id ? 'text-white/90' : 'text-muted-foreground'
                      }`}>
                        {bot.description}
                      </p>
                      
                      {/* Stats Row */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                          selectedBot?.id === bot.id
                            ? 'bg-white/20 backdrop-blur-sm'
                            : 'bg-gradient-to-r from-amber-50 to-orange-50'
                        }`}>
                          <Trophy className={`h-4 w-4 ${
                            selectedBot?.id === bot.id ? 'text-white' : 'text-amber-600'
                          }`} />
                          <span className={`text-xs font-bold ${
                            selectedBot?.id === bot.id ? 'text-white' : 'text-amber-700'
                          }`}>
                            {bot.rating}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                          selectedBot?.id === bot.id
                            ? 'bg-white/20 backdrop-blur-sm'
                            : 'bg-gradient-to-r from-blue-50 to-cyan-50'
                        }`}>
                          <Star className={`h-4 w-4 ${
                            selectedBot?.id === bot.id ? 'text-white' : 'text-blue-600'
                          }`} />
                          <span className={`text-xs font-bold ${
                            selectedBot?.id === bot.id ? 'text-white' : 'text-blue-700'
                          }`}>
                            {bot.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Selection indicator */}
                  {selectedBot?.id === bot.id && (
                    <div className="absolute top-3 right-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm">
                        <div className="h-3 w-3 rounded-full bg-white" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Color Selection */}
      {selectedBot && (
        <section className="mb-6">
          <div className="rounded-3xl border-2 border-border bg-card shadow-sm">
            <div className="bg-gradient-to-r from-orange-400 to-pink-500 px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-white">
                Choose Your Color
              </h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setColorChoice('white')}
                  className={`rounded-xl border-2 p-6 text-center transition-all hover:shadow-lg ${
                    colorChoice === 'white'
                      ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-pink-50 shadow-lg scale-105'
                      : 'border-border bg-background hover:border-orange-300'
                  }`}
                >
                  <div className="text-4xl mb-2">♔</div>
                  <p className={`font-heading font-bold ${
                    colorChoice === 'white' ? 'text-orange-700' : 'text-card-foreground'
                  }`}>
                    White (First Move)
                  </p>
                </button>
                <button
                  onClick={() => setColorChoice('black')}
                  className={`rounded-xl border-2 p-6 text-center transition-all hover:shadow-lg ${
                    colorChoice === 'black'
                      ? 'border-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg scale-105'
                      : 'border-border bg-background hover:border-gray-400'
                  }`}
                >
                  <div className="text-4xl mb-2">♚</div>
                  <p className={`font-heading font-bold ${
                    colorChoice === 'black' ? 'text-gray-700' : 'text-card-foreground'
                  }`}>
                    Black (Second Move)
                  </p>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Start Game Button */}
      {selectedBot && colorChoice && (
        <section className="mb-6">
          <div className="rounded-3xl border-2 border-green-200 bg-card shadow-sm">
            <div className="p-5 text-center">
              <button
                onClick={handleStartGame}
                disabled={isCreatingGame}
                className="w-full rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-4 font-heading text-lg font-bold text-white transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {isCreatingGame ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Starting Game...
                  </>
                ) : (
                  <>
                    <Bot className="h-5 w-5" />
                    Start Game Against {selectedBot.name}
                  </>
                )}
              </button>
              <p className="mt-3 text-sm text-muted-foreground">
                You'll play as <span className="font-bold">{colorChoice === 'white' ? 'White' : 'Black'}</span> against{' '}
                <span className="font-bold">{selectedBot.name}</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Info Section */}
      <section className="mb-6">
        <div className="rounded-3xl border-2 border-blue-200 bg-card p-5 shadow-sm">
          <h3 className="font-heading text-lg font-bold text-card-foreground mb-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            How It Works
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>Select a bot difficulty level that matches your skill</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>Choose whether you want to play as White or Black</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>The bot will automatically make its moves after yours</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>Win games to earn XP and improve your rating!</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
