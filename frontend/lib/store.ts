// lib/store.ts - Zustand Store for State Management (Cookie-Based Session Auth)
// Auth state is in memory only; session is validated via GET /api/auth/me (cookies sent automatically).

import { create } from 'zustand';
import { User } from './api';
import { authAPI } from './api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: User) => void;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: true }),

  login: (user) => {
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    if (typeof window !== 'undefined') {
      try {
        await authAPI.logout();
      } catch {
        // ignore network errors; still clear state
      }
      localStorage.removeItem('sidebar-collapsed');
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),

  loadSession: async () => {
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }
    try {
      const user = await authAPI.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
