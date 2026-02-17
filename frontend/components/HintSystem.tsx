// components/HintSystem.tsx - Hint System Component

'use client';

import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface HintSystemProps {
  puzzleId: number;
  fen: string;
  userXP: number;
  onXPDeducted: (newXP: number) => void;
}

interface Hint {
  level: number;
  text: string;
  xpCost: number;
}

const HINT_COSTS = { 1: 2, 2: 4, 3: 8 };
const HINT_LABELS = {
  1: { label: 'Gentle Hint', color: 'green', description: 'A vague nudge in the right direction' },
  2: { label: 'Moderate Hint', color: 'yellow', description: 'More specific guidance about the tactic' },
  3: { label: 'Strong Hint', color: 'red', description: 'Tells you the piece to move' },
};

export default function HintSystem({ puzzleId, fen, userXP, onXPDeducted }: HintSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hints, setHints] = useState<Hint[]>([]);
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null);

  const requestHint = async (level: number) => {
    const cost = HINT_COSTS[level as keyof typeof HINT_COSTS];

    // Check if hint already revealed
    if (hints.find(h => h.level === level)) {
      toast('You already have this hint!', { icon: '💡' });
      return;
    }

    // Check XP
    if (userXP < cost) {
      toast.error(`Not enough XP! Need ${cost} XP but you have ${userXP}.`);
      return;
    }

    setLoadingLevel(level);
    try {
      const response = await api.post(`/api/puzzles/${puzzleId}/hint`, {
        fen,
        hint_level: level,
        puzzle_id: puzzleId,
      });

      const data = response.data;

      setHints(prev => [...prev, {
        level,
        text: data.hint_text,
        xpCost: data.xp_cost,
      }]);

      onXPDeducted(data.remaining_xp);
      toast.success(`Hint revealed! -${cost} XP`, { icon: '💡' });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to get hint');
    } finally {
      setLoadingLevel(null);
    }
  };

  const getButtonStyle = (level: number, color: string) => {
    const alreadyRevealed = hints.find(h => h.level === level);
    const cost = HINT_COSTS[level as keyof typeof HINT_COSTS];
    const canAfford = userXP >= cost;

    if (alreadyRevealed) {
      return 'bg-gray-100 border-gray-300 text-gray-500 cursor-default';
    }

    if (!canAfford) {
      return 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60';
    }

    const colors = {
      green: 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100',
      yellow: 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100',
      red: 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100',
    };

    return colors[color as keyof typeof colors] || colors.green;
  };

  return (
    <div className="bg-white rounded-xl border-2 border-yellow-200 shadow-md overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-yellow-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-yellow-600" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800 text-sm">Need a hint?</p>
            <p className="text-xs text-gray-500">Uses XP • {hints.length}/3 revealed</p>
          </div>
        </div>
        {isOpen
          ? <ChevronUp className="w-4 h-4 text-gray-500" />
          : <ChevronDown className="w-4 h-4 text-gray-500" />
        }
      </button>

      {/* Expandable Content */}
      {isOpen && (
        <div className="border-t-2 border-yellow-100 p-4 space-y-3">
          {/* XP Balance */}
          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-700">
              Your XP: {userXP}
            </span>
          </div>

          {/* Hint Buttons */}
          {Object.entries(HINT_LABELS).map(([levelStr, info]) => {
            const level = parseInt(levelStr);
            const cost = HINT_COSTS[level as keyof typeof HINT_COSTS];
            const revealed = hints.find(h => h.level === level);

            return (
              <div key={level} className="space-y-2">
                <button
                  onClick={() => requestHint(level)}
                  disabled={!!revealed || loadingLevel === level}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${getButtonStyle(level, info.color)}`}
                >
                  <div className="flex items-center gap-2">
                    {loadingLevel === level ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Lightbulb className="w-4 h-4" />
                    )}
                    <div className="text-left">
                      <p className="font-bold text-xs">{info.label}</p>
                      <p className="text-xs opacity-75">{info.description}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold whitespace-nowrap">
                    {revealed ? '✓ Revealed' : `-${cost} XP`}
                  </span>
                </button>

                {/* Revealed Hint Text */}
                {revealed && (
                  <div className="p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <p className="text-sm text-gray-700">
                      💡 {revealed.text}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Warning */}
          <p className="text-xs text-gray-400 text-center pt-1">
            Hints deduct XP from your balance permanently
          </p>
        </div>
      )}
    </div>
  );
}
