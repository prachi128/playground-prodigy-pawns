// app/(parent)/parent/children/page.tsx - Children Progress View

'use client';

import { useCallback, useEffect, useState } from 'react';
import api, { parentAPI, ChildInfo } from '@/lib/api';
import { Loader2, Users, Trophy, Star, TrendingUp, Zap, BookOpen, CheckCircle, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface ChildAssignment {
  id: number
  title: string
  description: string | null
  due_date: string | null
  puzzle_count: number
  puzzles_completed: number
  completion_pct: number
  is_complete: boolean
  is_overdue: boolean
}

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
  const [childAssignments, setChildAssignments] = useState<Record<number, ChildAssignment[]>>({});
  const [showAddChild, setShowAddChild] = useState(false);
  const [creating, setCreating] = useState(false);
  const [childForm, setChildForm] = useState({
    full_name: '',
    username: '',
    password: '',
  });

  const loadChildren = useCallback(async () => {
    try {
      const kids = await parentAPI.getChildren();
      setChildren(kids);

      const results = await Promise.allSettled(
        kids.map((child) =>
          api
            .get(`/api/parent/children/${child.id}/assignments`)
            .then((res) => ({ childId: child.id, data: res.data }))
        )
      );
      const map: Record<number, ChildAssignment[]> = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          map[r.value.childId] = r.value.data;
        }
      });
      setChildAssignments(map);
    } catch {
      toast.error('Failed to load children data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childForm.full_name.trim() || !childForm.username.trim() || !childForm.password) {
      toast.error('Please fill in name, username, and password.');
      return;
    }
    setCreating(true);
    try {
      await parentAPI.createChild({
        full_name: childForm.full_name.trim(),
        username: childForm.username.trim(),
        password: childForm.password,
      });
      toast.success(`${childForm.full_name} can log in with their username!`);
      setChildForm({ full_name: '', username: '', password: '' });
      setShowAddChild(false);
      setLoading(true);
      await loadChildren();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(msg || 'Failed to create child account');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Your Children</h1>
          <p className="text-gray-500">Track your child&apos;s chess progress and batch information.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddChild(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Add child
        </button>
      </div>

      {showAddChild && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Create child account</h2>
            <button
              type="button"
              onClick={() => setShowAddChild(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Your child will log in with their <strong>username</strong> and password — not your email.
          </p>
          <form onSubmit={handleCreateChild} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
              <input
                type="text"
                value={childForm.full_name}
                onChange={(e) => setChildForm({ ...childForm, full_name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input
                type="text"
                value={childForm.username}
                onChange={(e) => setChildForm({ ...childForm, username: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
                placeholder="emma_sharma"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="text"
                value={childForm.password}
                onChange={(e) => setChildForm({ ...childForm, password: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
                minLength={4}
                required
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create account'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddChild(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {children.map((child) => {
          const rank = child.level_category || 'Pawn';
          const gradient = rankColors[rank] || rankColors.Pawn;
          const emoji = rankEmojis[rank] || '♟️';
          const assignmentsForChild = childAssignments[child.id] ?? [];

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

                {assignmentsForChild.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Assignments
                    </p>
                    <div className="space-y-2">
                      {assignmentsForChild.slice(0, 3).map(a => (
                        <div key={a.id} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-medium truncate flex-1 ${
                              a.is_complete ? 'text-gray-400 line-through' : 'text-gray-800'
                            }`}>
                              {a.title}
                            </p>
                            {a.is_complete ? (
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                            ) : a.is_overdue ? (
                              <span className="text-xs font-semibold text-red-500 shrink-0">Overdue</span>
                            ) : a.due_date ? (
                              <span className="text-xs text-gray-400 shrink-0">
                                Due {new Date(a.due_date).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'short'
                                })}
                              </span>
                            ) : null}
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                a.is_complete ? 'bg-green-500' : 'bg-primary-500'
                              }`}
                              style={{ width: `${Math.min(a.completion_pct, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400">
                            {a.puzzles_completed}/{a.puzzle_count} puzzles
                            {' '}· {a.completion_pct}%
                          </p>
                        </div>
                      ))}
                      {assignmentsForChild.length > 3 && (
                        <p className="text-xs text-primary-600 font-medium mt-1">
                          +{assignmentsForChild.length - 3} more assignments
                        </p>
                      )}
                    </div>
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
          <p className="text-gray-400 text-sm mt-1">
            Add a child above, or ask your coach to create their account with your email as guardian.
          </p>
        </div>
      )}
    </div>
  );
}
