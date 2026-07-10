// app/(coach)/admin/assignments/[id]/page.tsx — Admin assignment progress oversight

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, type AdminAssignment, type AssignmentProgress } from '@/lib/api';
import { adminStudentProfilePath } from '@/lib/admin-student-path';
import { formatAssignmentDateTime, isAssignmentOverdue } from '@/lib/assignment-ui';

const DIFF_COLORS: Record<string, string> = {
  beginner:
    'border border-[hsl(var(--green-medium))]/35 bg-[hsl(var(--green-very-light))] text-[hsl(var(--green-medium))]',
  intermediate:
    'border border-[hsl(var(--gold-medium))]/40 bg-[hsl(var(--gold-light))]/80 text-[hsl(var(--gold-dark))]',
  advanced:
    'border border-[hsl(var(--orange-medium))]/40 bg-[hsl(var(--orange-very-light))] text-[hsl(var(--orange-dark))]',
  expert:
    'border border-[hsl(var(--red-medium))]/35 bg-[hsl(var(--red-light))] text-[hsl(var(--red-medium))]',
};

function ProgressBar({ pct, isComplete }: { pct: number; isComplete: boolean }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={`h-2 rounded-full transition-all ${
          isComplete ? 'bg-[hsl(var(--green-medium))]' : 'bg-primary'
        }`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function AdminAssignmentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const assignmentId = Number(params.id);

  const [detail, setDetail] = useState<AdminAssignment | null>(null);
  const [progress, setProgress] = useState<AssignmentProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!Number.isFinite(assignmentId)) {
      router.push('/admin/assignments');
      return;
    }
    setLoading(true);
    try {
      const [detailRes, progressRes] = await Promise.all([
        adminAPI.getAssignment(assignmentId),
        adminAPI.getAssignmentProgress(assignmentId),
      ]);
      setDetail(detailRes);
      setProgress(progressRes);
    } catch {
      toast.error('Failed to load assignment');
      router.push('/admin/assignments');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading || !detail || !progress) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading assignment…</p>
        </div>
      </div>
    );
  }

  const overdue = isAssignmentOverdue(detail.due_date);
  const completed = progress.students.filter((s) => s.is_complete).length;
  const inProgress = progress.students.filter(
    (s) => !s.is_complete && s.puzzles_completed > 0,
  ).length;
  const notStarted = progress.students.filter((s) => s.puzzles_completed === 0).length;

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push('/admin/assignments')}
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/90"
      >
        <ArrowLeft className="h-4 w-4" />
        All academy assignments
      </button>

      <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-card-foreground sm:text-3xl">
                {detail.title}
              </h1>
              {!detail.is_active && (
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                  Inactive
                </span>
              )}
            </div>
            {detail.description ? (
              <p className="mb-3 text-sm text-muted-foreground">{detail.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>
                Coach:{' '}
                <span className="font-medium text-foreground">
                  {detail.coach_full_name || detail.coach_username}
                </span>
                {detail.coach_username ? ` (@${detail.coach_username})` : ''}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {detail.batch_name ?? detail.student_name}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {detail.puzzle_count} puzzles
              </span>
              <span
                className={`flex items-center gap-1 font-medium ${
                  overdue ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {overdue ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {detail.due_date ? `Due ${formatAssignmentDateTime(detail.due_date)}` : 'No deadline'}
              </span>
            </div>
          </div>

          <div className="shrink-0 text-center">
            <div className="relative mx-auto h-24 w-24">
              <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90 text-muted">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  className={
                    progress.overall_completion_pct >= 100
                      ? 'text-[hsl(var(--green-medium))]'
                      : 'text-primary'
                  }
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${progress.overall_completion_pct} ${100 - progress.overall_completion_pct}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-card-foreground">
                  {Math.round(progress.overall_completion_pct)}%
                </span>
                <span className="text-xs text-muted-foreground">done</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[hsl(var(--green-medium))]/30 bg-card p-5 text-center shadow-sm">
          <CheckCircle className="mx-auto mb-1 h-7 w-7 text-[hsl(var(--green-medium))]" />
          <p className="text-3xl font-bold text-[hsl(var(--green-medium))]">{completed}</p>
          <p className="mt-1 text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--gold-medium))]/40 bg-card p-5 text-center shadow-sm">
          <TrendingUp className="mx-auto mb-1 h-7 w-7 text-[hsl(var(--gold-dark))]" />
          <p className="text-3xl font-bold text-[hsl(var(--gold-dark))]">{inProgress}</p>
          <p className="mt-1 text-xs text-muted-foreground">In progress</p>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-card p-5 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-1 h-7 w-7 text-destructive" />
          <p className="text-3xl font-bold text-destructive">{notStarted}</p>
          <p className="mt-1 text-xs text-muted-foreground">Not started</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-primary px-5 py-3">
              <h2 className="font-heading text-lg font-bold text-primary-foreground">Student progress</h2>
            </div>
            <div className="divide-y divide-border">
              {progress.students.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No students in this assignment yet.
                </p>
              ) : (
                progress.students.map((s) => (
                  <div key={s.student_id} className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <Link
                          href={adminStudentProfilePath(s.username)}
                          className="text-sm font-bold text-card-foreground transition-colors hover:text-primary"
                        >
                          {s.full_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">@{s.username}</p>
                      </div>
                      <div className="text-right">
                        {s.is_complete ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--green-medium))]/35 bg-[hsl(var(--green-very-light))] px-2 py-0.5 text-xs font-bold text-[hsl(var(--green-medium))]">
                            <CheckCircle className="h-3 w-3" /> Done
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">
                            {s.puzzles_completed}/{s.total_puzzles}
                          </span>
                        )}
                      </div>
                    </div>
                    <ProgressBar pct={s.completion_pct} isComplete={s.is_complete} />
                    {s.last_completed_at ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last activity: {formatAssignmentDateTime(s.last_completed_at)}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/50 px-5 py-3">
              <h2 className="font-heading text-base font-bold text-card-foreground">
                Puzzles in this assignment
              </h2>
            </div>
            <div className="divide-y divide-border">
              {(detail.puzzles ?? []).map((p, idx) => (
                <div key={p.puzzle_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-card-foreground">{p.title}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-xs font-bold capitalize ${
                          DIFF_COLORS[p.difficulty.toLowerCase()] ??
                          'border border-border bg-muted text-muted-foreground'
                        }`}
                      >
                        {p.difficulty}
                      </span>
                      <span className="text-xs font-bold text-[hsl(var(--gold-dark))]">
                        {p.xp_reward} XP
                      </span>
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
