'use server'

import { addXpAndCoins } from '@/app/actions/update-progress'

/**
 * Update student stats after completing a lesson/game.
 * @param coins - Coins to add
 * @param xp - XP to add
 */
export async function updateStudentStats(coins: number, xp: number) {
  return addXpAndCoins(xp, coins)
}
