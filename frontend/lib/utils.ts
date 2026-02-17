// lib/utils.ts - Utility Functions

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Calculate XP needed for next level (100 XP per level)
export function getXPForNextLevel(currentLevel: number): number {
  return currentLevel * 100;
}

// Calculate progress percentage to next level
export function getXPProgress(totalXP: number, currentLevel: number): number {
  const xpForCurrentLevel = (currentLevel - 1) * 100;
  const xpForNextLevel = currentLevel * 100;
  const xpInCurrentLevel = totalXP - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  
  return Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100);
}

// Get level color based on level
export function getLevelColor(level: number): string {
  if (level < 3) return "bg-gray-400";
  if (level < 5) return "bg-green-500";
  if (level < 7) return "bg-blue-500";
  if (level < 10) return "bg-purple-500";
  return "bg-yellow-500";
}

// Format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Get difficulty color
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'beginner':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'advanced':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'expert':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

// Get theme emoji
export function getThemeEmoji(theme?: string): string {
  if (!theme) return '♟️';
  
  const themeMap: Record<string, string> = {
    'fork': '🍴',
    'pin': '📌',
    'checkmate': '👑',
    'endgame': '🏁',
    'combination': '🎯',
    'tactics': '⚡',
    'opening': '🚀',
    'middlegame': '⚔️',
  };
  
  return themeMap[theme.toLowerCase()] || '♟️';
}

// Calculate accuracy percentage
export function calculateAccuracy(solved: number, attempts: number): number {
  if (attempts === 0) return 0;
  return Math.round((solved / attempts) * 100);
}

// Get rank suffix (1st, 2nd, 3rd, etc.)
export function getRankSuffix(rank: number): string {
  const j = rank % 10;
  const k = rank % 100;
  
  if (j === 1 && k !== 11) return `${rank}st`;
  if (j === 2 && k !== 12) return `${rank}nd`;
  if (j === 3 && k !== 13) return `${rank}rd`;
  return `${rank}th`;
}
