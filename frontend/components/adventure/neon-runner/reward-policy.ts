import type { RewardOutcome } from "./types"

export function getDistanceBand(playerX: number): number {
  if (playerX < 2500) return 1
  if (playerX < 6000) return 2
  if (playerX < 10000) return 3
  if (playerX < 16000) return 4
  return 5
}

export function calculateSolveReward(params: {
  solveStreak: number
  distanceBand: number
  baseFuel: number
  baseScore: number
}): RewardOutcome {
  const streakMult = 1 + Math.min(params.solveStreak, 8) * 0.12
  const distanceMult = 1 + (params.distanceBand - 1) * 0.08
  const mult = streakMult * distanceMult

  return {
    fuelGain: Math.min(0.45, params.baseFuel * mult),
    scoreGain: Math.round(params.baseScore * mult),
    xpBonus: Math.round(8 * mult),
  }
}
