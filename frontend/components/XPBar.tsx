// components/XPBar.tsx - XP Progress Bar Component

'use client';

import { getXPProgress, getXPForNextLevel } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface XPBarProps {
  totalXP: number;
  currentLevel: number;
}

export default function XPBar({ totalXP, currentLevel }: XPBarProps) {
  const progress = getXPProgress(totalXP, currentLevel);
  const xpForNext = getXPForNextLevel(currentLevel);
  const xpInCurrentLevel = totalXP - ((currentLevel - 1) * 100);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border-4 border-primary-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-bold text-gray-800">XP Progress</h3>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            {xpInCurrentLevel} / {100} XP
          </p>
          <p className="text-xs text-gray-500">
            {100 - xpInCurrentLevel} XP to Level {currentLevel + 1}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 transition-all duration-500 ease-out flex items-center justify-end pr-3"
          style={{ width: `${progress}%` }}
        >
          {progress > 15 && (
            <span className="text-white font-bold text-sm drop-shadow-lg">
              {Math.round(progress)}%
            </span>
          )}
        </div>
        
        {/* Shine effect */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
      </div>

      {/* Total XP Display */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-600">
          Total XP: <span className="text-primary-600">{totalXP}</span>
        </p>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < (progress / 20) ? 'bg-yellow-400' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
