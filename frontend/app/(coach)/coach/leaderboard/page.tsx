// app/coach/leaderboard/page.tsx - Class Leaderboard

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Trophy, Medal, Star, TrendingUp, Zap, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface LeaderboardEntry {
  rank: number;
  id: number;
  username: string;
  email: string;
  xp: number;
  total_puzzles_solved: number;
  success_rate: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<'xp' | 'puzzles' | 'success'>('xp');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coach' && user?.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }
    loadLeaderboard();
  }, [isAuthenticated, user, router, sortBy]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/coach/students');
      const students = response.data;
      
      // Sort based on selected criteria
      let sorted = [...students];
      if (sortBy === 'xp') {
        sorted.sort((a, b) => b.xp - a.xp);
      } else if (sortBy === 'puzzles') {
        sorted.sort((a, b) => b.total_puzzles_solved - a.total_puzzles_solved);
      } else {
        sorted.sort((a, b) => b.success_rate - a.success_rate);
      }
      
      // Add ranks
      const withRanks = sorted.map((student, index) => ({
        rank: index + 1,
        ...student
      }));
      
      setLeaderboard(withRanks);
    } catch (error) {
      toast.error('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400';
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-500';
    return 'bg-gray-100';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-500" />
            Class Leaderboard
          </h1>
          <p className="text-gray-600 text-lg">
            Top performers in your class
          </p>
        </div>

        {/* Sort Options */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-gray-200 mb-6">
          <p className="text-sm font-bold text-gray-700 mb-3">Sort by:</p>
          <div className="flex gap-3">
            <button
              onClick={() => setSortBy('xp')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                sortBy === 'xp'
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Zap className="w-5 h-5 inline mr-2" />
              Total XP
            </button>
            <button
              onClick={() => setSortBy('puzzles')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                sortBy === 'puzzles'
                  ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Target className="w-5 h-5 inline mr-2" />
              Puzzles Solved
            </button>
            <button
              onClick={() => setSortBy('success')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                sortBy === 'success'
                  ? 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Success Rate
            </button>
          </div>
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* 2nd Place */}
            <div className="pt-12">
              <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl p-6 shadow-xl border-4 border-gray-400 text-center">
                <div className="text-5xl mb-3">🥈</div>
                <p className="font-bold text-xl text-gray-800 mb-1">{leaderboard[1].username}</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  {sortBy === 'xp' && (
                    <>
                      <Zap className="w-5 h-5 text-yellow-600" />
                      <span className="text-2xl font-bold text-gray-700">{leaderboard[1].xp}</span>
                    </>
                  )}
                  {sortBy === 'puzzles' && (
                    <span className="text-2xl font-bold text-gray-700">{leaderboard[1].total_puzzles_solved}</span>
                  )}
                  {sortBy === 'success' && (
                    <span className="text-2xl font-bold text-gray-700">{leaderboard[1].success_rate}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* 1st Place */}
            <div>
              <div className="bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-2xl p-6 shadow-xl border-4 border-yellow-500 text-center relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Trophy className="w-10 h-10 text-yellow-600 animate-bounce" />
                </div>
                <div className="text-6xl mb-3 mt-2">🥇</div>
                <p className="font-bold text-2xl text-gray-800 mb-1">{leaderboard[0].username}</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  {sortBy === 'xp' && (
                    <>
                      <Zap className="w-6 h-6 text-yellow-700" />
                      <span className="text-3xl font-bold text-gray-800">{leaderboard[0].xp}</span>
                    </>
                  )}
                  {sortBy === 'puzzles' && (
                    <span className="text-3xl font-bold text-gray-800">{leaderboard[0].total_puzzles_solved}</span>
                  )}
                  {sortBy === 'success' && (
                    <span className="text-3xl font-bold text-gray-800">{leaderboard[0].success_rate}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="pt-12">
              <div className="bg-gradient-to-br from-orange-200 to-orange-300 rounded-2xl p-6 shadow-xl border-4 border-orange-400 text-center">
                <div className="text-5xl mb-3">🥉</div>
                <p className="font-bold text-xl text-gray-800 mb-1">{leaderboard[2].username}</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  {sortBy === 'xp' && (
                    <>
                      <Zap className="w-5 h-5 text-yellow-600" />
                      <span className="text-2xl font-bold text-gray-700">{leaderboard[2].xp}</span>
                    </>
                  )}
                  {sortBy === 'puzzles' && (
                    <span className="text-2xl font-bold text-gray-700">{leaderboard[2].total_puzzles_solved}</span>
                  )}
                  {sortBy === 'success' && (
                    <span className="text-2xl font-bold text-gray-700">{leaderboard[2].success_rate}%</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Rankings Table */}
        <div className="bg-white rounded-2xl shadow-lg border-4 border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-purple-600 p-4">
            <h2 className="text-xl font-bold text-white">Complete Rankings</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">XP</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Puzzles</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`border-t-2 border-gray-100 hover:bg-gray-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className={`w-10 h-10 rounded-full ${getRankColor(entry.rank)} flex items-center justify-center text-white font-bold shadow-md`}>
                        {getMedalIcon(entry.rank)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-gray-800">{entry.username}</p>
                      <p className="text-xs text-gray-500">{entry.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="font-bold text-yellow-600">{entry.xp}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-blue-600">{entry.total_puzzles_solved}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`font-bold ${
                        entry.success_rate >= 70 ? 'text-green-600' :
                        entry.success_rate >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {entry.success_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {leaderboard.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No students yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
