'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  readCoachTheme,
  writeCoachTheme,
  type CoachTheme,
} from '@/lib/coach-theme';

interface CoachThemeContextValue {
  theme: CoachTheme;
  setTheme: (theme: CoachTheme) => void;
  isDark: boolean;
}

const CoachThemeContext = createContext<CoachThemeContextValue | null>(null);

export function CoachThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<CoachTheme>('light');

  useEffect(() => {
    setThemeState(readCoachTheme());
  }, []);

  const setTheme = useCallback((next: CoachTheme) => {
    setThemeState(next);
    writeCoachTheme(next);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, isDark: theme === 'dark' }),
    [theme, setTheme],
  );

  return <CoachThemeContext.Provider value={value}>{children}</CoachThemeContext.Provider>;
}

export function useCoachTheme(): CoachThemeContextValue {
  const ctx = useContext(CoachThemeContext);
  if (!ctx) {
    throw new Error('useCoachTheme must be used within CoachThemeProvider');
  }
  return ctx;
}
