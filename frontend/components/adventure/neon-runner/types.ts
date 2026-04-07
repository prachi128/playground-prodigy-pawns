import type { Puzzle } from "@/lib/api"

export type RunnerPlatform = {
  x: number
  y: number
  w: number
  h: number
}

export type RunnerOrb = {
  x: number
  y: number
  collected: boolean
}

export type RunnerState = {
  playerX: number
  playerY: number
  playerVY: number
  grounded: boolean
  speed: number
  jumpSpeed: number
  gravity: number
  fuel: number
  fuelDrainPerSec: number
  score: number
  combo: number
  maxCombo: number
  puzzlesSolved: number
  solveStreak: number
  checkpointsCleared: number
  nextCheckpointX: number
  retryUsedForCheckpoint: boolean
  currentCheckpointAttempt: number
  lastCheckpointSolvedAt?: number
  gameSpeedScale: number
  runNumber: number
  checkpointSpacingPx: number
  over: boolean
}

export type RewardOutcome = {
  fuelGain: number
  scoreGain: number
  xpBonus: number
}

export type ActivePuzzleSession = {
  puzzle: Puzzle
  startedAtMs: number
  attemptNumber: 1 | 2
  timeLimitSec: number
}
