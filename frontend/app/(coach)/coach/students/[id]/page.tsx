// app/(coach)/coach/students/[id]/page.tsx - Student detail (coach layout)

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Award, TrendingUp, Target, Calendar, Zap, Trophy, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import ConfirmDialog from '@/components/ConfirmDialog';

interface StudentDetails {
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
  days_since_active: number;
}

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = parseInt(params.id as string);
  const { isAuthenticated, user } = useAuthStore();
  
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAwardDialog, setShowAwardDialog] = useState(false);
  const [xpAmount, setXpAmount] = useState(10);
  const [isAwarding, setIsAwarding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coach' && user?.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }
    loadStudent();
  }, [isAuthenticated, user, router, studentId]);

  const loadStudent = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/coach/students/${studentId}`);
      setStudent(response.data);
    } catch (error) {
      toast.error('Failed to load student details');
      router.push('/coach/students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAwardXP = async () => {
    if (!xpAmount || xpAmount < 1 || xpAmount > 100) {
      toast.error('XP must be between 1 and 100');
      return;
    }

    setIsAwarding(true);
    try {
      await api.post(`/api/coach/students/${studentId}/award-xp?xp_amount=${xpAmount}`);
      toast.success(`Awarded ${xpAmount} XP to ${student?.username}!`);
      setShowAwardDialog(false);
      loadStudent();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to award XP');
    } finally {
      setIsAwarding(false);
    }
  };

  if (isLoading || !student) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const difficultyData = [
    { name: 'Beginner', solved: student.beginner_solved, color: 'bg-green-500' },
    { name: 'Intermediate', solved: student.intermediate_solved, color: 'bg-yellow-500' },
    { name: 'Advanced', solved: student.advanced_solved, color: 'bg-orange-500' },
    { name: 'Expert', solved: student.expert_solved, color: 'bg-red-500' },
  ];

  const maxSolved = Math.max(...difficultyData.map(d => d.solved), 1);

  return (
    <div>
      {/* Header */}
        <div className="mb-6">
          <Link
            href="/coach/students"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Students
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {student.username}'s Profile
              </h1>
              <p className="text-gray-600">{student.email}</p>
            </div>
            <button
              onClick={() => setShowAwardDialog(true)}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-lg flex items-center gap-2"
            >
              <Award className="w-5 h-5" />
              Award XP
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-yellow-200">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-yellow-600" />
              <h3 className="font-bold text-gray-700">Total XP</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{student.xp}</p>
            <p className="text-xs text-gray-500 mt-1">+{student.xp_this_week} this week</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-blue-600" />
              <h3 className="font-bold text-gray-700">Puzzles Solved</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">{student.total_puzzles_solved}</p>
            <p className="text-xs text-gray-500 mt-1">
              of {student.total_puzzles_attempted} attempted
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h3 className="font-bold text-gray-700">Success Rate</h3>
            </div>
            <p className={`text-3xl font-bold ${
              student.success_rate >= 70 ? 'text-green-600' :
              student.success_rate >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {student.success_rate}%
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-purple-200">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-purple-600" />
              <h3 className="font-bold text-gray-700">Last Active</h3>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {student.days_since_active === 0 ? 'Today' : 
               student.days_since_active === 1 ? 'Yesterday' :
               `${student.days_since_active} days ago`}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Performance by Difficulty */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-4 border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary-600" />
              Performance by Difficulty
            </h2>
            
            <div className="space-y-4">
              {difficultyData.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-700">{item.name}</span>
                    <span className="text-sm font-bold text-gray-600">{item.solved} solved</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${(item.solved / maxSolved) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-4 border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📊 Activity Summary
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-bold text-gray-700">Member Since</span>
                <span className="text-sm text-gray-600">
                  {new Date(student.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-bold text-gray-700">Puzzles This Week</span>
                <span className="text-sm font-bold text-green-600">
                  {student.puzzles_this_week}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-bold text-gray-700">XP This Week</span>
                <span className="text-sm font-bold text-yellow-600">
                  {student.xp_this_week} XP
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-bold text-gray-700">Average per Puzzle</span>
                <span className="text-sm text-gray-600">
                  {student.total_puzzles_attempted > 0
                    ? Math.round(student.xp / student.total_puzzles_attempted)
                    : 0} XP
                </span>
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-4 border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              💪 Strengths & Weaknesses
            </h2>
            
            <div className="space-y-4">
              {/* Strongest */}
              {(() => {
                const strongest = [...difficultyData].sort((a, b) => b.solved - a.solved)[0];
                return strongest.solved > 0 && (
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                    <p className="text-sm font-bold text-green-700 mb-1">✓ Strongest Area</p>
                    <p className="text-lg font-bold text-gray-800">{strongest.name} Puzzles</p>
                    <p className="text-sm text-gray-600">{strongest.solved} solved</p>
                  </div>
                );
              })()}

              {/* Needs Improvement */}
              {(() => {
                const weakest = [...difficultyData].sort((a, b) => a.solved - b.solved)[0];
                return weakest.solved === 0 && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                    <p className="text-sm font-bold text-red-700 mb-1">⚠ Needs Practice</p>
                    <p className="text-lg font-bold text-gray-800">{weakest.name} Puzzles</p>
                    <p className="text-sm text-gray-600">No puzzles solved yet</p>
                  </div>
                );
              })()}

              {/* Activity Warning */}
              {student.days_since_active > 7 && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-yellow-700 mb-1">Inactive Student</p>
                    <p className="text-sm text-gray-600">
                      Last active {student.days_since_active} days ago. Consider reaching out!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl p-6 shadow-lg text-white">
            <h2 className="text-xl font-bold mb-4">🎯 Quick Stats</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-90">Total Attempts</span>
                <span className="text-2xl font-bold">{student.total_puzzles_attempted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-90">Successful</span>
                <span className="text-2xl font-bold">{student.total_puzzles_solved}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-90">Failed</span>
                <span className="text-2xl font-bold">
                  {student.total_puzzles_attempted - student.total_puzzles_solved}
                </span>
              </div>
              
              <div className="pt-3 mt-3 border-t border-white/20">
                <p className="text-sm opacity-90 mb-2">Overall Performance</p>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div
                    className="bg-white h-full rounded-full transition-all"
                    style={{ width: `${student.success_rate}%` }}
                  />
                </div>
                <p className="text-xs opacity-75 mt-1 text-right">{student.success_rate}% success</p>
              </div>
            </div>
          </div>
        </div>

        {/* Award XP Dialog */}
        {showAwardDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl border-4 border-yellow-300 max-w-md w-full mx-4 p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-500" />
                Award Bonus XP
              </h3>
              
              <p className="text-gray-600 mb-4">
                Award bonus XP to <span className="font-bold">{student.username}</span> for good performance!
              </p>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  XP Amount (1-100)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={xpAmount}
                  onChange={(e) => setXpAmount(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yellow-500 focus:outline-none text-lg font-bold"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAwardDialog(false)}
                  disabled={isAwarding}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAwardXP}
                  disabled={isAwarding}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAwarding ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Awarding...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Award {xpAmount} XP
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
