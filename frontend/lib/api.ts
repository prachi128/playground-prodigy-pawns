// lib/api.ts - API Client for Prodigy Pawns Backend

import axios from 'axios';

// Use localhost (not 127.0.0.1) to match frontend origin for cookie-based auth
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance (Cookie-Based Session Auth: cookies sent via withCredentials)
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 401 handling: try refresh once, then redirect to login
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v?: unknown) => void; reject: (e: unknown) => void }> = [];

const processQueue = (err: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isSessionCheck = originalRequest?.url?.includes('/api/auth/me') && originalRequest?.method === 'get';
    if (isSessionCheck) {
      return Promise.reject(error);
    }
    if (error.response?.status !== 401 || originalRequest._retry) {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => api(originalRequest))
        .catch((e) => Promise.reject(e));
    }
    originalRequest._retry = true;
    isRefreshing = true;
    try {
      await api.post('/api/auth/refresh');
      processQueue(null, null);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Types
export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: string;
  age?: number;
  avatar_url: string;
  total_xp: number;
  level: number;
  rating: number;
  created_at: string;
  is_active: boolean;
}

export interface LoginResponse {
  user: User;
}

export interface Puzzle {
  id: number;
  title: string;
  description?: string;
  fen: string;
  moves: string;
  difficulty: string;
  rating: number;
  theme?: string;
  xp_reward: number;
  attempts_count: number;
  success_count: number;
  created_at: string;
  is_active?: boolean;
}

export interface UserStats {
  games_played: number;
  games_won: number;
  win_rate: number;
  puzzles_solved: number;
  puzzle_attempts: number;
  puzzle_accuracy: number;
  total_xp: number;
  level: number;
  rating: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  full_name: string;
  avatar_url: string;
  score: number;
  level: number;
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // OAuth2PasswordRequestForm expects form data, not JSON
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 uses 'username' field
    formData.append('password', password);
    
    const response = await api.post('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  signup: async (data: {
    email: string;
    username: string;
    full_name: string;
    password: string;
    age?: number;
  }): Promise<LoginResponse> => {
    const response = await api.post('/api/auth/signup', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  refresh: async (): Promise<{ user: User }> => {
    const response = await api.post('/api/auth/refresh');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout');
  },
};

// User API
export const userAPI = {
  getStats: async (): Promise<UserStats> => {
    const response = await api.get('/api/users/me/stats');
    return response.data;
  },

  updateProfile: async (data: {
    full_name?: string;
    avatar_url?: string;
    age?: number;
  }): Promise<User> => {
    const response = await api.put('/api/users/me', data);
    return response.data;
  },
};

// Puzzle API
export const puzzleAPI = {
  getAll: async (difficulty?: string, theme?: string): Promise<Puzzle[]> => {
    const params = new URLSearchParams();
    if (difficulty) params.append('difficulty', difficulty);
    if (theme) params.append('theme', theme);
    const response = await api.get(`/api/puzzles?${params.toString()}`);
    return response.data;
  },

  getById: async (id: number): Promise<Puzzle> => {
    const response = await api.get(`/api/puzzles/${id}`);
    return response.data;
  },

  submitAttempt: async (
    puzzleId: number,
    data: {
      is_solved: boolean;
      moves_made: string;
      time_taken: number;
      hints_used?: number;
    }
  ) => {
    const response = await api.post(`/api/puzzles/${puzzleId}/attempt`, {
      puzzle_id: puzzleId,
      ...data,
    });
    return response.data;
  },
};

// Leaderboard API
export const leaderboardAPI = {
  get: async (type: 'xp' | 'rating' = 'xp', limit = 10): Promise<LeaderboardEntry[]> => {
    const response = await api.get(`/api/leaderboard?leaderboard_type=${type}&limit=${limit}`);
    return response.data;
  },
};

// Achievements API
export const achievementAPI = {
  getAll: async () => {
    const response = await api.get('/api/achievements');
    return response.data;
  },
};

// Daily Challenge API
export const dailyChallengeAPI = {
  getToday: async () => {
    const response = await api.get('/api/daily-challenge');
    return response.data;
  },
};

// Coach API
export const coachAPI = {
  // Get coach statistics
  getStats: async () => {
    const response = await api.get('/api/coach/stats');
    return response.data;
  },

  // Get all puzzles (including inactive)
  getAllPuzzles: async (includeInactive: boolean = true) => {
    const response = await api.get('/api/coach/puzzles', {
      params: { include_inactive: includeInactive }
    });
    return response.data;
  },

  // Create new puzzle
  createPuzzle: async (data: {
    title: string;
    description?: string;
    fen: string;
    difficulty?: string;
    theme?: string;
    xp_reward?: number;
  }) => {
    const response = await api.post('/api/coach/puzzles', data);
    return response.data;
  },

  // Update puzzle
  updatePuzzle: async (id: number, data: any) => {
    const response = await api.put(`/api/coach/puzzles/${id}`, data);
    return response.data;
  },

  // Delete puzzle (deactivate)
  deletePuzzle: async (id: number) => {
    const response = await api.delete(`/api/coach/puzzles/${id}`);
    return response.data;
  },

  // Revalidate puzzle with Stockfish
  revalidatePuzzle: async (id: number) => {
    const response = await api.post(`/api/coach/puzzles/${id}/revalidate`);
    return response.data;
  },

  // Analyze position with Stockfish
  analyzePosition: async (fen: string, depth: number = 15) => {
    const response = await api.post('/api/puzzles/analyze', { fen, depth });
    return response.data;
  },

  // Auto-solve puzzle
  autoSolve: async (fen: string) => {
    const response = await api.post('/api/puzzles/auto-solve', { fen });
    return response.data;
  }
};

export default api;