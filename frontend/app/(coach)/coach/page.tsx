// app/(coach)/coach/page.tsx - Coach Dashboard Main Page

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Plus, TrendingUp, Target, Trophy, Users, Layers } from 'lucide-react';
import Link from 'next/link';
import { coachAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface CoachStats {
  total_puzzles: number;
  active_puzzles: number;
  inactive_puzzles: number;
  difficulty_distribution: {
    [key: string]: number;
  };
  total_attempts: number;
  total_success: number;
  overall_success_rate: number;
}

export default function CoachDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();
  
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    useAuthStore.getState().loadSession();
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if user is coach or admin
    if (user && user.role !== 'coach' && user.role !== 'admin') {
      toast.error('Access denied. Coach privileges required.');
      router.push('/dashboard');
      return;
    }

    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated, authLoading, user, router]);

  const loadStats = async () => {
    try {
      const data = await coachAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-gray-600">
          Manage puzzles and track student progress
        </p>
      </div>

      {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Link
            href="/coach/puzzles/create"
            className="bg-gradient-to-r from-primary-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Create New Puzzle</h3>
                <p className="text-sm text-white/80">Use Stockfish to validate</p>
              </div>
            </div>
          </Link>

          <Link
            href="/coach/puzzles"
            className="bg-white p-6 rounded-2xl shadow-lg border-4 border-gray-200 hover:border-primary-400 transition-all hover:shadow-xl cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Manage Puzzles</h3>
                <p className="text-sm text-gray-600">Edit, delete, or revalidate</p>
              </div>
            </div>
          </Link>

          <Link
            href="/coach/students"
            className="bg-white p-6 rounded-2xl shadow-lg border-4 border-blue-200 hover:border-blue-400 transition-all hover:shadow-xl cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Manage Students</h3>
                <p className="text-sm text-gray-600">View and track student progress</p>
              </div>
            </div>
          </Link>

          <Link
            href="/coach/batches"
            className="bg-white p-6 rounded-2xl shadow-lg border-4 border-amber-200 hover:border-amber-400 transition-all hover:shadow-xl cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Layers className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Manage Batches</h3>
                <p className="text-sm text-gray-600">Classes, payments & groups</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Statistics</h2>
            
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              {/* Total Puzzles */}
              <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-purple-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-bold text-gray-700">Total Puzzles</h3>
                </div>
                <p className="text-3xl font-bold text-purple-600">{stats.total_puzzles}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {stats.active_puzzles} active, {stats.inactive_puzzles} inactive
                </p>
              </div>

              {/* Total Attempts */}
              <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-700">Attempts</h3>
                </div>
                <p className="text-3xl font-bold text-blue-600">{stats.total_attempts}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {stats.total_success} successful
                </p>
              </div>

              {/* Success Rate */}
              <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-700">Success Rate</h3>
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {stats.overall_success_rate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-600 mt-1">Overall performance</p>
              </div>

              {/* Active Puzzles */}
              <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-yellow-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                  </div>
                  <h3 className="font-bold text-gray-700">Active</h3>
                </div>
                <p className="text-3xl font-bold text-yellow-600">{stats.active_puzzles}</p>
                <p className="text-xs text-gray-600 mt-1">Available to students</p>
              </div>
            </div>

            {/* Difficulty Distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border-4 border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                📈 Difficulty Distribution
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.difficulty_distribution).map(([difficulty, count]) => (
                  <div key={difficulty} className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-primary-600">{count}</p>
                    <p className="text-sm text-gray-600 capitalize">{difficulty}</p>
                  </div>
                ))}
              </div>
          </div>
        </>
      )}
    </div>
  );
}
