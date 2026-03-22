// app/(coach)/coach/assignments/[id]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Users, BookOpen, CheckCircle, Clock,
  XCircle, TrendingUp, Loader2, AlertTriangle,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

interface StudentProgress {
  student_id: number;
  username: string;
  full_name: string;
  puzzles_completed: number;
  total_puzzles: number;
  completion_pct: number;
  is_complete: boolean;
  last_completed_at: string | null;
}

interface ProgressData {
  assignment_id: number;
  title: string;
  total_puzzles: number;
  total_students: number;
  overall_completion_pct: number;
  students: StudentProgress[];
}

interface AssignmentDetail {
  id: number;
  title: string;
  description: string | null;
  batch_name: string | null;
  student_name: string | null;
  due_date: string | null;
  is_active: boolean;
  puzzle_count: number;
  puzzles: { puzzle_id: number; title: string; difficulty: string; xp_reward: number; position: number }[];
}

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(due: string | null) {
  if (!due) return false;
  return new Date(due) < new Date();
}

function ProgressBar({ pct, isComplete }: { pct: number; isComplete: boolean }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary-500'}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

const DIFF_COLORS: Record<string, string> = {
  beginner:     'bg-green-100 text-green-800 border-green-300',
  intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  advanced:     'bg-orange-100 text-orange-800 border-orange-300',
  expert:       'bg-red-100 text-red-800 border-red-300',
};

// ── Component ────────────────────────────────────────────────

export default function AssignmentDetailPage() {
  const router   = useRouter();
  const { id }   = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuthStore();

  const [detail,   setDetail]   = useState<AssignmentDetail | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coach' && user?.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [isAuthenticated, user, id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [detailRes, progressRes] = await Promise.all([
        api.get(`/api/assignments/${id}`),
        api.get(`/api/assignments/${id}/progress`),
      ]);
      setDetail(detailRes.data);
      setProgress(progressRes.data);
    } catch {
      toast.error('Failed to load assignment');
      router.push('/coach/assignments');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !detail || !progress) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
      </div>
    );
  }

  const overdue = isOverdue(detail.due_date);
  const completed  = progress.students.filter(s => s.is_complete).length;
  const inProgress = progress.students.filter(s => !s.is_complete && s.puzzles_completed > 0).length;
  const notStarted = progress.students.filter(s => s.puzzles_completed === 0).length;

  return (
    <div>
      {/* Back */}
      <Link
        href="/coach/assignments"
        className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Assignments
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-lg border-4 border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-800">{detail.title}</h1>
              {!detail.is_active && (
                <span className="text-xs font-bold bg-gray-100 text-gray-600 border border-gray-300 px-2 py-0.5 rounded-full">
                  Inactive
                </span>
              )}
            </div>
            {detail.description && (
              <p className="text-gray-600 text-sm mb-3">{detail.description}</p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {detail.batch_name ?? detail.student_name}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {detail.puzzle_count} puzzles
              </span>
              <span className={`flex items-center gap-1 font-medium ${overdue ? 'text-red-600' : 'text-gray-600'}`}>
                {overdue ? <XCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                {detail.due_date ? `Due ${formatDate(detail.due_date)}` : 'No deadline'}
              </span>
            </div>
          </div>

          {/* Overall completion ring */}
          <div className="text-center shrink-0">
            <div className="relative w-24 h-24 mx-auto">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={progress.overall_completion_pct >= 100 ? '#22c55e' : '#9333ea'}
                  strokeWidth="3"
                  strokeDasharray={`${progress.overall_completion_pct} ${100 - progress.overall_completion_pct}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-800">
                  {Math.round(progress.overall_completion_pct)}%
                </span>
                <span className="text-xs text-gray-500">done</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-green-200 text-center">
          <CheckCircle className="w-7 h-7 text-green-600 mx-auto mb-1" />
          <p className="text-3xl font-bold text-green-600">{completed}</p>
          <p className="text-xs text-gray-600 mt-1">Completed</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-yellow-200 text-center">
          <TrendingUp className="w-7 h-7 text-yellow-600 mx-auto mb-1" />
          <p className="text-3xl font-bold text-yellow-600">{inProgress}</p>
          <p className="text-xs text-gray-600 mt-1">In progress</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-red-200 text-center">
          <AlertTriangle className="w-7 h-7 text-red-500 mx-auto mb-1" />
          <p className="text-3xl font-bold text-red-500">{notStarted}</p>
          <p className="text-xs text-gray-600 mt-1">Not started</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Student progress table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg border-4 border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 px-5 py-3">
              <h2 className="text-lg font-bold text-white">Student Progress</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {progress.students.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No students in this assignment yet.</p>
              ) : (
                progress.students.map(s => (
                  <div key={s.student_id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <Link
                          href={`/coach/students/${s.student_id}`}
                          className="font-bold text-gray-800 hover:text-primary-600 transition-colors text-sm"
                        >
                          {s.full_name}
                        </Link>
                        <p className="text-xs text-gray-500">@{s.username}</p>
                      </div>
                      <div className="text-right">
                        {s.is_complete ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Done
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-gray-600">
                            {s.puzzles_completed}/{s.total_puzzles}
                          </span>
                        )}
                      </div>
                    </div>
                    <ProgressBar pct={s.completion_pct} isComplete={s.is_complete} />
                    {s.last_completed_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Last activity: {formatDate(s.last_completed_at)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Puzzle list */}
        <div>
          <div className="bg-white rounded-2xl shadow-lg border-4 border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-5 py-3 border-b-2 border-gray-200">
              <h2 className="text-base font-bold text-gray-800">Puzzles in this assignment</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {detail.puzzles.map((p, idx) => (
                <div key={p.puzzle_id} className="px-4 py-3 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border capitalize ${
                        DIFF_COLORS[p.difficulty.toLowerCase()] ?? 'bg-gray-100 text-gray-700 border-gray-300'
                      }`}>
                        {p.difficulty}
                      </span>
                      <span className="text-xs text-yellow-600 font-bold">{p.xp_reward} XP</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
