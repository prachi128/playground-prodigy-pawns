import type { RunnerState } from "./types"

export function shouldTriggerCheckpoint(playerX: number, nextCheckpointX: number): boolean {
  return playerX >= nextCheckpointX
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function expectedNextCheckpointX(checkpointSpacingPx: number, checkpointsCleared: number): number {
  return checkpointSpacingPx * (checkpointsCleared + 1)
}

export function createInitialRunnerState(runNumber = 1): RunnerState {
  const checkpointSpacingPx = 580
  return {
    playerX: 120,
    playerY: 220,
    playerVY: 0,
    grounded: false,
    speed: 5.8,
    jumpSpeed: -15,
    gravity: 0.58,
    fuel: 1,
    fuelDrainPerSec: 0.0069,
    score: 0,
    combo: 0,
    maxCombo: 0,
    puzzlesSolved: 0,
    solveStreak: 0,
    checkpointsCleared: 0,
    nextCheckpointX: checkpointSpacingPx,
    retryUsedForCheckpoint: false,
    currentCheckpointAttempt: 1,
    gameSpeedScale: 1,
    runNumber,
    checkpointSpacingPx,
    over: false,
  }
}
