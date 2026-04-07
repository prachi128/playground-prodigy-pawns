// lib/utils.ts - Utility Functions

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Chess } from "chess.js"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Level is determined by rating only (matches backend main.py)
const RATING_THRESHOLDS = [300, 500, 700, 900, 1100, 1300, 1500, 1700, 1900, 2100, 2300, 2500, 2700, 2900];
const LEVEL_MAX = 15;

/** Get rating band for a level: { min, max } (max is null for level 15 = 2900+). */
export function getRatingBandForLevel(level: number): { min: number; max: number | null } {
  if (level <= 1) return { min: 100, max: 299 };
  if (level >= LEVEL_MAX) return { min: RATING_THRESHOLDS[LEVEL_MAX - 2], max: null };
  const min = RATING_THRESHOLDS[level - 2];
  const max = RATING_THRESHOLDS[level - 1] - 1;
  return { min, max };
}

/** Progress within current level (0–100). For level 15, returns 100. */
export function getRatingProgressToNextLevel(rating: number, level: number): number {
  const band = getRatingBandForLevel(level);
  if (band.max == null) return 100; // max level
  const range = band.max - band.min + 1;
  const into = Math.max(0, rating - band.min);
  return Math.min(100, Math.round((into / range) * 100));
}

/** Rating needed for next level (for display). */
export function getRatingForNextLevel(level: number): number | null {
  if (level >= LEVEL_MAX) return null;
  return RATING_THRESHOLDS[level - 1];
}

// Legacy XP helpers (XP is for hints/rewards only, not for level)
export function getXPForNextLevel(currentLevel: number): number {
  return currentLevel * 100;
}

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

/** Split space-separated theme string into array of theme labels (e.g. "fork endgame" → ["fork", "endgame"]). */
export function parseThemeList(theme?: string | null): string[] {
  if (!theme || typeof theme !== 'string') return [];
  return theme.trim().split(/\s+/).filter(Boolean);
}

const UCI_MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/i

function normalizeMoveToken(game: Chess, token: string): string {
  const cleaned = token.trim()
  if (!cleaned) throw new Error("Empty move token")

  let moveResult = null
  if (UCI_MOVE_RE.test(cleaned)) {
    moveResult = game.move({
      from: cleaned.slice(0, 2),
      to: cleaned.slice(2, 4),
      promotion: cleaned.length > 4 ? cleaned[4].toLowerCase() : "q",
    })
  } else {
    moveResult = game.move(cleaned, { sloppy: true })
  }

  if (!moveResult) {
    throw new Error(`Could not normalize move token: ${cleaned}`)
  }

  return `${moveResult.from}${moveResult.to}${moveResult.promotion ?? ""}`
}

export function normalizePuzzleMoves(fen: string, moves: string | null | undefined): string[] {
  const game = new Chess(fen)
  if (!moves) return []
  return moves
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => normalizeMoveToken(game, token))
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
