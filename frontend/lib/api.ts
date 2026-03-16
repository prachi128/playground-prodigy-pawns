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
  /** Category from rating: Pawn, Knight, Bishop, Rook, Queen, King */
  level_category?: string;
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

// Users API
export const usersAPI = {
  getById: async (userId: number): Promise<User> => {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },
};

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

  signupParent: async (data: {
    email: string;
    username: string;
    full_name: string;
    password: string;
    child_emails: string[];
  }): Promise<LoginResponse> => {
    const response = await api.post('/api/auth/signup/parent', data);
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
const PUZZLES_PAGE_SIZE = 20;

export const puzzleAPI = {
  getAll: async (
    difficulty?: string,
    theme?: string,
    skip: number = 0,
    limit: number = PUZZLES_PAGE_SIZE
  ): Promise<Puzzle[]> => {
    const params = new URLSearchParams();
    if (difficulty) params.append('difficulty', difficulty);
    if (theme) params.append('theme', theme);
    params.append('skip', String(skip));
    params.append('limit', String(limit));
    const response = await api.get(`/api/puzzles?${params.toString()}`);
    return response.data;
  },

  get pageSize() {
    return PUZZLES_PAGE_SIZE;
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

// Notifications API (in-app bell dropdown)
export interface ApiNotification {
  id: number;
  user_id: number;
  category: 'coach' | 'achievement' | 'system';
  title: string;
  message: string;
  read: boolean;
  link_url: string | null;
  created_at: string;
}

export const notificationsAPI = {
  getList: async (limit = 50): Promise<ApiNotification[]> => {
    const response = await api.get('/api/notifications', { params: { limit } });
    return response.data;
  },
  markAsRead: async (id: number): Promise<ApiNotification> => {
    const response = await api.patch(`/api/notifications/${id}`, { read: true });
    return response.data;
  },
  markAllRead: async (): Promise<{ marked: number }> => {
    const response = await api.post('/api/notifications/mark-all-read');
    return response.data;
  },
  dismiss: async (id: number): Promise<void> => {
    await api.delete(`/api/notifications/${id}`);
  },
};

// Game API
export interface GameInvite {
  id: number;
  inviter_id: number;
  invitee_id: number;
  status: string;
  game_id?: number;
  created_at: string;
  responded_at?: string;
  inviter?: User;
  invitee?: User;
}

export interface GameInviteCreate {
  invitee_id: number;
}

export interface Game {
  id: number;
  white_player_id: number;
  black_player_id: number;
  result?: string;
  time_control: string;
  total_moves: number;
  started_at: string;
  ended_at?: string;
  pgn?: string;
  starting_fen?: string;
  final_fen?: string;
  winner_id?: number;
  bot_difficulty?: string;
  bot_depth?: number;
}

export const gameAPI = {
  getGames: async (params?: { user_id?: number; skip?: number; limit?: number }): Promise<Game[]> => {
    const response = await api.get('/api/games', { params: params ?? {} });
    return response.data;
  },

  getGame: async (gameId: number): Promise<Game> => {
    const response = await api.get(`/api/games/${gameId}`);
    return response.data;
  },

  createGame: async (data: { white_player_id: number; black_player_id: number; time_control: string }): Promise<Game> => {
    const response = await api.post('/api/games', data);
    return response.data;
  },

  searchUsers: async (query: string, limit: number = 20): Promise<User[]> => {
    // Don't make API call if query is too short
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    // Ensure limit is a valid number
    const validLimit = Math.max(1, Math.min(100, limit || 20));
    const trimmedQuery = query.trim();
    
    try {
      const response = await api.get(`/api/users/search`, {
        params: {
          query: trimmedQuery,
          limit: validLimit
        }
      });
      return response.data;
    } catch (error: any) {
      // Log detailed error for debugging
      const errorDetails = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        query: trimmedQuery,
        limit: validLimit,
        url: error.config?.url,
        params: error.config?.params
      };
      console.error('Search users API error:', errorDetails);
      // Log the full error object
      console.error('Full error object:', error);
      throw error;
    }
  },

  createInvite: async (inviteeId: number): Promise<GameInvite> => {
    const response = await api.post('/api/game-invites', { invitee_id: inviteeId });
    return response.data;
  },

  getInvites: async (status?: string): Promise<GameInvite[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/api/game-invites${params}`);
    return response.data;
  },

  acceptInvite: async (inviteId: number): Promise<Game> => {
    const response = await api.post(`/api/game-invites/${inviteId}/accept`);
    return response.data;
  },

  rejectInvite: async (inviteId: number): Promise<void> => {
    await api.post(`/api/game-invites/${inviteId}/reject`);
  },

  makeMove: async (gameId: number, move: { from: string; to: string; promotion?: string }): Promise<Game> => {
    const response = await api.post(`/api/games/${gameId}/move`, {
      from_square: move.from,
      to_square: move.to,
      promotion: move.promotion || undefined,
    });
    return response.data;
  },

  resign: async (gameId: number): Promise<Game> => {
    const response = await api.post(`/api/games/${gameId}/resign`);
    return response.data;
  },

  createBotGame: async (data: { bot_difficulty: string; bot_depth: number; player_color: 'white' | 'black' }): Promise<Game> => {
    const response = await api.post('/api/games/bot', data);
    return response.data;
  },

  getBotMove: async (gameId: number): Promise<Game> => {
    const response = await api.post(`/api/games/${gameId}/bot-move`);
    return response.data;
  },
};

// ==================== PARENT DASHBOARD TYPES & API ====================

export interface Batch {
  id: number;
  name: string;
  description?: string;
  schedule?: string;
  coach_id: number;
  monthly_fee: number;
  is_active: boolean;
  created_at: string;
  student_count?: number;
}

export interface ClassSession {
  id: number;
  batch_id: number;
  date: string;
  duration_minutes: number;
  topic?: string;
  meeting_link?: string;
  notes?: string;
  created_at: string;
  batch_name?: string;
}

export interface AnnouncementItem {
  id: number;
  batch_id?: number;
  title: string;
  message: string;
  created_by: number;
  created_at: string;
  batch_name?: string;
  coach_name?: string;
}

export interface PaymentRecord {
  id: number;
  parent_id: number;
  student_id: number;
  batch_id: number;
  amount: number;
  currency: string;
  billing_month: string;
  status: string;
  paid_at?: string;
  created_at: string;
  student_name?: string;
  batch_name?: string;
}

export interface ChildInfo {
  id: number;
  full_name: string;
  username: string;
  avatar_url: string;
  rating: number;
  level: number;
  level_category?: string;
  total_xp: number;
  batch_name?: string;
  batch_id?: number;
  payment_status?: string;
}

export interface ParentDashboard {
  parent_name: string;
  children: ChildInfo[];
  upcoming_classes: ClassSession[];
  announcements: AnnouncementItem[];
  current_month: string;
  payment_deadline_day: number;
}

export const parentAPI = {
  getDashboard: async (): Promise<ParentDashboard> => {
    const response = await api.get('/api/parent/dashboard');
    return response.data;
  },
  getChildren: async (): Promise<ChildInfo[]> => {
    const response = await api.get('/api/parent/children');
    return response.data;
  },
  getClasses: async (): Promise<ClassSession[]> => {
    const response = await api.get('/api/parent/classes');
    return response.data;
  },
  getAnnouncements: async (): Promise<AnnouncementItem[]> => {
    const response = await api.get('/api/parent/announcements');
    return response.data;
  },
  createCheckout: async (data: { student_id: number; batch_id: number; billing_month: string }): Promise<{ checkout_url: string; session_id: string }> => {
    const response = await api.post('/api/parent/payments/create-checkout', data);
    return response.data;
  },
  getPaymentHistory: async (): Promise<PaymentRecord[]> => {
    const response = await api.get('/api/parent/payments/history');
    return response.data;
  },
};

// Batch Management API (Coach)
export interface StudentBatchInfo {
  student_id: number;
  student_name: string;
  student_username: string;
  batch_id: number;
  payment_status: string;
  joined_at: string;
  is_active: boolean;
}

export interface PaymentStatusOverview {
  batch_id: number;
  batch_name: string;
  billing_month: string;
  is_past_deadline: boolean;
  students: Array<{
    student_id: number;
    student_name: string;
    student_username: string;
    payment_status: string;
    billing_month: string;
    is_overdue: boolean;
  }>;
  total_students: number;
  paid_count: number;
  overdue_count: number;
}

export const batchAPI = {
  create: async (data: { name: string; description?: string; schedule?: string; monthly_fee?: number }): Promise<Batch> => {
    const response = await api.post('/api/batches', data);
    return response.data;
  },
  list: async (): Promise<Batch[]> => {
    const response = await api.get('/api/batches');
    return response.data;
  },
  get: async (id: number): Promise<Batch> => {
    const response = await api.get(`/api/batches/${id}`);
    return response.data;
  },
  update: async (id: number, data: Partial<Batch>): Promise<Batch> => {
    const response = await api.put(`/api/batches/${id}`, data);
    return response.data;
  },
  addStudent: async (batchId: number, studentId: number): Promise<StudentBatchInfo> => {
    const response = await api.post(`/api/batches/${batchId}/students`, { student_id: studentId });
    return response.data;
  },
  listStudents: async (batchId: number): Promise<StudentBatchInfo[]> => {
    const response = await api.get(`/api/batches/${batchId}/students`);
    return response.data;
  },
  removeStudent: async (batchId: number, studentId: number): Promise<void> => {
    await api.delete(`/api/batches/${batchId}/students/${studentId}`);
  },
  createClass: async (batchId: number, data: { date: string; duration_minutes?: number; topic?: string; meeting_link?: string; notes?: string }): Promise<ClassSession> => {
    const response = await api.post(`/api/batches/${batchId}/classes`, data);
    return response.data;
  },
  listClasses: async (batchId: number): Promise<ClassSession[]> => {
    const response = await api.get(`/api/batches/${batchId}/classes`);
    return response.data;
  },
  createAnnouncement: async (batchId: number, data: { title: string; message: string }): Promise<AnnouncementItem> => {
    const response = await api.post(`/api/batches/${batchId}/announcements`, data);
    return response.data;
  },
  listAnnouncements: async (batchId: number): Promise<AnnouncementItem[]> => {
    const response = await api.get(`/api/batches/${batchId}/announcements`);
    return response.data;
  },
  getPaymentStatus: async (batchId: number): Promise<PaymentStatusOverview> => {
    const response = await api.get(`/api/batches/${batchId}/payment-status`);
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
  },

  // List students (for coach). Returns [] if endpoint is not implemented (404).
  getStudents: async (): Promise<User[]> => {
    try {
      const response = await api.get('/api/coach/students');
      return response.data?.students ?? response.data ?? [];
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return [];
      throw err;
    }
  },
};

export default api;