export type CoachTheme = 'light' | 'dark';

export const COACH_THEME_STORAGE_KEY = 'coach-theme';

export function readCoachTheme(): CoachTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    return window.localStorage.getItem(COACH_THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function writeCoachTheme(theme: CoachTheme): void {
  try {
    window.localStorage.setItem(COACH_THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}
