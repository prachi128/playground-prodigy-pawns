export interface ThemePerformanceRow {
  theme_key: string;
  attempts: number;
  solved: number;
  accuracy_pct: number;
}

export interface WeeklyBucket {
  period_label: string;
  start_date: string;
  attempts: number;
  solved: number;
  accuracy_pct: number;
}

export interface StudentProgressReportData {
  id: number;
  username: string;
  email: string;
  xp: number;
  created_at: string;
  last_active: string;
  total_puzzles_attempted: number;
  total_puzzles_solved: number;
  success_rate: number;
  beginner_solved: number;
  intermediate_solved: number;
  advanced_solved: number;
  expert_solved: number;
  puzzles_this_week: number;
  xp_this_week: number;
  games_played: number;
  games_won: number;
  game_win_rate: number;
  games_this_week: number;
  days_since_active: number;
  is_active?: boolean;
  theme_performance?: ThemePerformanceRow[];
  weekly_buckets?: WeeklyBucket[];
  weekly_trend?: string;
}
