// app/(parent)/parent/children/page.tsx - Children Progress View

'use client';

import { useEffect, useState } from 'react';
import { parentAPI, ChildInfo } from '@/lib/api';
import { Loader2, Users, Trophy, Star, TrendingUp, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const rankColors: Record<string, string> = {
  Pawn: 'from-gray-400 to-gray-500',
  Knight: 'from-green-400 to-green-600',
  Bishop: 'from-blue-400 to-blue-600',
  Rook: 'from-purple-400 to-purple-600',
  Queen: 'from-amber-400 to-amber-600',
  King: 'from-yellow-400 to-yellow-600',
};

const rankEmojis: Record<string, string> = {
  Pawn: '♟️',
  Knight: '♞',
  Bishop: '♝',
  Rook: '♜',
  Queen: '♛',
  King: '♚',
};

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentAPI.getChildren()
      .then(setChildren)
      .catch(() => toast.error('Failed to load children data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Your Children</h1>
        <p className="text-gray-500">Track your child&apos;s chess progress and batch information.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {children.map((child) => {
          const rank = child.level_category || 'Pawn';
          const gradient = rankColors[rank] || rankColors.Pawn;
          const emoji = rankEmojis[rank] || '♟️';

          return (
            <div key={child.id} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:shadow-lg transition">
              {/* Rank Header */}
              <div className={`bg-gradient-to-r ${gradient} p-5 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                      {emoji}
                    </div>
                    <div>
                      <p className="font-bold text-xl">{child.full_name}</p>
                      <p className="text-white/80 text-sm">@{child.username}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white/80 text-xs">Rank</p>
                    <p className="font-bold text-lg">{rank}</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-800">{child.rating}</p>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-800">{child.level}</p>
                    <p className="text-xs text-gray-500">Level</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Zap className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-800">{child.total_xp.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total XP</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Star className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-800">{rank}</p>
                    <p className="text-xs text-gray-500">Category</p>
                  </div>
                </div>

                {/* Batch Info */}
                {child.batch_name ? (
                  <div className="bg-primary-50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-primary-600 font-semibold">BATCH</p>
                      <p className="font-bold text-primary-800">{child.batch_name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      child.payment_status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : child.payment_status === 'overdue'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {child.payment_status === 'paid' ? 'Paid' : child.payment_status === 'overdue' ? 'Overdue' : 'Pending'}
                    </span>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-400 text-sm">
                    Not assigned to a batch yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {children.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No children linked to your account yet.</p>
          <p className="text-gray-400 text-sm mt-1">Ask your coach to link your child&apos;s account.</p>
        </div>
      )}
    </div>
  );
}
