'use server'

/**
 * Add XP and coins for the current user (e.g. after completing a lesson or game).
 * Can be extended to call a backend endpoint when one is available.
 * @param xp - XP to add
 * @param coins - Coins to add
 */
export async function addXpAndCoins(xp: number, coins: number): Promise<void> {
  // TODO: call backend API when endpoint exists (e.g. POST /api/users/me/rewards)
  await Promise.resolve()
}
