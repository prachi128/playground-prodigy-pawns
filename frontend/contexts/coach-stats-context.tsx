'use client';

import { createContext, useContext } from 'react';

export interface CoachStatsData {
  total_puzzles: number;
  active_puzzles: number;
  inactive_puzzles: number;
  difficulty_distribution: Record<string, number>;
  total_attempts: number;
  total_success: number;
  overall_success_rate: number;
}

export const CoachStatsContext = createContext<{
  stats: CoachStatsData | null;
  statsLoading: boolean;
}>({ stats: null, statsLoading: true });

export function useCoachStats() {
  return useContext(CoachStatsContext);
}
