// app/dashboard/page.tsx - Student Dashboard

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { userAPI, UserStats } from '@/lib/api';
import XPBar from '@/components/XPBar';
import StatsCard from '@/components/StatsCard';
import { Gamepad2, Puzzle, Trophy, Target, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from storage on mount
    useAuthStore.getState().loadFromStorage();
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && user) {
      loadStats();
    }
  }, [isAuthenticated, authLoading, user, router]);

  const loadStats = async () => {
    try {
      const data = await userAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast.error('Failed to load your stats');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !stats) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Welcome back, {user.full_name}! 🎉
          </h1>
          <p className="text-gray-600 text-lg">
            Ready to level up your chess skills today?
          </p>
        </div>

        {/* Level Badge and XP */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Level Badge */}
          <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-2xl p-6 shadow-xl border-4 border-yellow-300 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold opacity-90 mb-1">Your Level</p>
                <p className="text-5xl font-bold drop-shadow-lg">
                  {user.level}
                </p>
                <p className="text-sm mt-2 opacity-90">
                  Rating: {user.rating}
                </p>
              </div>
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Trophy className="w-12 h-12" />
              </div>
            </div>
          </div>

          {/* XP Progress - spans 2 columns */}
          <div className="md:col-span-2">
            <XPBar totalXP={user.total_xp} currentLevel={user.level} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Games Played"
            value={stats.games_played}
            subtitle={`${stats.games_won} wins`}
            icon={Gamepad2}
            color="purple"
          />
          <StatsCard
            title="Win Rate"
            value={`${Math.round(stats.win_rate)}%`}
            subtitle="Keep it up!"
            icon={Trophy}
            color="yellow"
          />
          <StatsCard
            title="Puzzles Solved"
            value={stats.puzzles_solved}
            subtitle={`${stats.puzzle_attempts} attempts`}
            icon={Puzzle}
            color="blue"
          />
          <StatsCard
            title="Accuracy"
            value={`${Math.round(stats.puzzle_accuracy)}%`}
            subtitle="Puzzle solving"
            icon={Target}
            color="green"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Play Puzzles */}
          <button
            onClick={() => router.push('/puzzles')}
            className="bg-white rounded-2xl p-8 shadow-lg border-4 border-blue-200 hover:border-blue-400 transition-all hover:shadow-xl group"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Puzzle className="w-10 h-10 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  Solve Puzzles
                </h3>
                <p className="text-gray-600">
                  Practice tactics and earn XP! 🧩
                </p>
              </div>
            </div>
          </button>

          {/* View Leaderboard */}
          <button
            onClick={() => router.push('/leaderboard')}
            className="bg-white rounded-2xl p-8 shadow-lg border-4 border-yellow-200 hover:border-yellow-400 transition-all hover:shadow-xl group"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  Leaderboard
                </h3>
                <p className="text-gray-600">
                  See where you rank! 🏆
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
