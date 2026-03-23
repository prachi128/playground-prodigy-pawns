// app/(coach)/coach/students/[id]/page.tsx - Student detail (coach layout)

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
  ArrowLeft,
  Award,
  TrendingUp,
  Target,
  Calendar,
  Zap,
  Trophy,
  AlertCircle,
  BarChart3,
  Activity,
  Loader2,
  FileText,
  UserX,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api, { batchAPI, type Batch } from '@/lib/api';
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
  is_active?: boolean;
}

const statCard =
  'rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md';

const panelCard = 'rounded-xl border border-border bg-card p-6 shadow-sm';

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = parseInt(params.id as string, 10);
  const { isAuthenticated, user } = useAuthStore();

  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [studentBatchName, setStudentBatchName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAwardDialog, setShowAwardDialog] = useState(false);
  const [xpAmount, setXpAmount] = useState(10);
  const [isAwarding, setIsAwarding] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const deactivateLock = useRef(false);
  const reactivateLock = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coach' && user?.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }
    loadStudent();
  }, [isAuthenticated, user, router, studentId]);

  const loadStudent = async () => {
    setIsLoading(true);
    setStudentBatchName(null);
    try {
      const studentPromise = api.get(`/api/coach/students/${studentId}`);
      const batchesPromise = batchAPI.list().catch(() => [] as Batch[]);

      const [response, batches] = await Promise.all([studentPromise, batchesPromise]);
      setStudent(response.data);

      let foundName: string | null = null;
      if (batches.length > 0) {
        const settled = await Promise.allSettled(
          batches.map(async (b) => {
            const list = await batchAPI.listStudents(b.id);
            return { batch: b, list };
          }),
        );
        for (const r of settled) {
          if (
            r.status === 'fulfilled' &&
            r.value.list.some((row) => row.student_id === studentId)
          ) {
            foundName = r.value.batch.name;
            break;
          }
        }
      }
      setStudentBatchName(foundName);
    } catch {
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
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to award XP');
    } finally {
      setIsAwarding(false);
    }
  };

  const handleDeactivate = async () => {
    if (deactivateLock.current) return;
    deactivateLock.current = true;
    setIsDeactivating(true);
    try {
      await api.put(`/api/coach/students/${studentId}/deactivate`);
      toast.success('Student account deactivated');
      setShowDeactivateDialog(false);
      router.push('/coach/admin/students');
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to deactivate');
    } finally {
      setIsDeactivating(false);
      deactivateLock.current = false;
    }
  };

  const handleReactivate = async () => {
    if (reactivateLock.current) return;
    reactivateLock.current = true;
    setIsReactivating(true);
    try {
      await api.put(`/api/coach/students/${studentId}/reactivate`);
      toast.success('Student account reactivated');
      setShowReactivateDialog(false);
      loadStudent();
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to reactivate');
    } finally {
      setIsReactivating(false);
      reactivateLock.current = false;
    }
  };

  if (isLoading || !student) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading student…</p>
        </div>
      </div>
    );
  }

  const difficultyData = [
    { name: 'Beginner', solved: student.beginner_solved, color: 'bg-[hsl(var(--green-medium))]' },
    { name: 'Intermediate', solved: student.intermediate_solved, color: 'bg-[hsl(var(--gold-medium))]' },
    { name: 'Advanced', solved: student.advanced_solved, color: 'bg-[hsl(var(--orange-medium))]' },
    { name: 'Expert', solved: student.expert_solved, color: 'bg-[hsl(var(--red-medium))]' },
  ];

  const maxSolved = Math.max(...difficultyData.map((d) => d.solved), 1);
  const isStudentActive = student.is_active !== false;
  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/coach/students"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to students
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {student.username} — Profile
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
              <span>{student.email}</span>
              {studentBatchName ? (
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-100">
                  {studentBatchName}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                window.open(`/coach/students/${studentId}/report`, '_blank', 'noopener,noreferrer')
              }
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/60"
            >
              <FileText className="h-5 w-5" />
              Generate Report
            </button>
            {isStudentActive && (
              <button
                type="button"
                onClick={() => setShowAwardDialog(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Award className="h-5 w-5" />
                Award XP
              </button>
            )}
            {isAdmin && isStudentActive && (
              <button
                type="button"
                onClick={() => setShowDeactivateDialog(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-destructive/40 bg-background px-5 py-2.5 text-sm font-semibold text-destructive shadow-sm transition-colors hover:bg-destructive/10"
              >
                <UserX className="h-5 w-5" />
                Deactivate
              </button>
            )}
            {isAdmin && !isStudentActive && (
              <button
                type="button"
                onClick={() => setShowReactivateDialog(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/15"
              >
                <UserCheck className="h-5 w-5" />
                Reactivate
              </button>
            )}
          </div>
        </div>
      </div>

      {!isStudentActive && isAdmin && (
        <div
          className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
          <p>
            This account is <span className="font-semibold">deactivated</span> (left the academy or suspended). The
            profile remains in the database. Students cannot sign in until you reactivate.
          </p>
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className={statCard}>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--gold-light))]">
              <Zap className="h-5 w-5 text-[hsl(var(--gold-dark))]" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground">Total XP</h3>
          </div>
          <p className="font-heading text-3xl font-bold text-[hsl(var(--gold-dark))]">{student.xp}</p>
          <p className="mt-1 text-xs text-muted-foreground">+{student.xp_this_week} this week</p>
        </div>

        <div className={statCard}>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--blue-light))]">
              <Target className="h-5 w-5 text-[hsl(var(--blue-dark))]" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground">Puzzles solved</h3>
          </div>
          <p className="font-heading text-3xl font-bold text-[hsl(var(--blue-dark))]">
            {student.total_puzzles_solved}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">of {student.total_puzzles_attempted} attempted</p>
        </div>

        <div className={statCard}>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--green-very-light))]">
              <TrendingUp className="h-5 w-5 text-[hsl(var(--green-medium))]" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground">Success rate</h3>
          </div>
          <p
            className={`font-heading text-3xl font-bold ${
              student.success_rate >= 70
                ? 'text-[hsl(var(--green-medium))]'
                : student.success_rate >= 50
                  ? 'text-[hsl(var(--gold-dark))]'
                  : 'text-[hsl(var(--red-medium))]'
            }`}
          >
            {student.success_rate}%
          </p>
        </div>

        <div className={statCard}>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--purple-light))]/90">
              <Calendar className="h-5 w-5 text-[hsl(var(--purple-dark))]" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground">Last active</h3>
          </div>
          <p className="font-heading text-2xl font-bold text-[hsl(var(--purple-dark))]">
            {student.days_since_active === 0
              ? 'Today'
              : student.days_since_active === 1
                ? 'Yesterday'
                : `${student.days_since_active} days ago`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={panelCard}>
          <h2 className="font-heading mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
            <Trophy className="h-5 w-5 text-primary" />
            Performance by difficulty
          </h2>

          <div className="space-y-4">
            {difficultyData.map((item) => (
              <div key={item.name}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{item.name}</span>
                  <span className="text-sm font-medium text-muted-foreground">{item.solved} solved</span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`${item.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${(item.solved / maxSolved) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={panelCard}>
          <h2 className="font-heading mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />
            Activity summary
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <span className="text-sm font-medium text-foreground">Member since</span>
              <span className="text-sm text-muted-foreground">
                {new Date(student.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <span className="text-sm font-medium text-foreground">Puzzles this week</span>
              <span className="text-sm font-semibold text-[hsl(var(--green-medium))]">
                {student.puzzles_this_week}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <span className="text-sm font-medium text-foreground">XP this week</span>
              <span className="text-sm font-semibold text-[hsl(var(--gold-dark))]">
                {student.xp_this_week} XP
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <span className="text-sm font-medium text-foreground">Average per puzzle</span>
              <span className="text-sm text-muted-foreground">
                {student.total_puzzles_attempted > 0
                  ? Math.round(student.xp / student.total_puzzles_attempted)
                  : 0}{' '}
                XP
              </span>
            </div>
          </div>
        </div>

        <div className={panelCard}>
          <h2 className="font-heading mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
            <Activity className="h-5 w-5 text-primary" />
            Strengths and focus areas
          </h2>

          <div className="space-y-4">
            {(() => {
              const strongest = [...difficultyData].sort((a, b) => b.solved - a.solved)[0];
              return (
                strongest.solved > 0 && (
                  <div className="rounded-xl border border-[hsl(var(--green-medium))]/25 bg-[hsl(var(--green-very-light))]/50 p-4">
                    <p className="mb-1 text-sm font-semibold text-[hsl(var(--green-medium))]">Strongest area</p>
                    <p className="text-lg font-bold text-foreground">{strongest.name} puzzles</p>
                    <p className="text-sm text-muted-foreground">{strongest.solved} solved</p>
                  </div>
                )
              );
            })()}

            {(() => {
              const weakest = [...difficultyData].sort((a, b) => a.solved - b.solved)[0];
              return (
                weakest.solved === 0 && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                    <p className="mb-1 text-sm font-semibold text-destructive">Needs practice</p>
                    <p className="text-lg font-bold text-foreground">{weakest.name} puzzles</p>
                    <p className="text-sm text-muted-foreground">No puzzles solved yet</p>
                  </div>
                )
              );
            })()}

            {student.days_since_active > 7 && (
              <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--gold-medium))]/30 bg-[hsl(var(--gold-light))]/40 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--gold-dark))]" />
                <div>
                  <p className="mb-1 text-sm font-semibold text-[hsl(var(--gold-dark))]">Inactive student</p>
                  <p className="text-sm text-muted-foreground">
                    Last active {student.days_since_active} days ago. Consider reaching out.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-sidebar-border bg-[hsl(var(--sidebar-background))] p-6 text-sidebar-foreground shadow-sm">
          <h2 className="font-heading mb-4 flex items-center gap-2 text-lg font-bold">
            <Target className="h-5 w-5 text-amber-300" />
            Quick stats
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-sidebar-foreground/85">Total attempts</span>
              <span className="font-heading text-2xl font-bold">{student.total_puzzles_attempted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-sidebar-foreground/85">Successful</span>
              <span className="font-heading text-2xl font-bold">{student.total_puzzles_solved}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-sidebar-foreground/85">Failed</span>
              <span className="font-heading text-2xl font-bold">
                {student.total_puzzles_attempted - student.total_puzzles_solved}
              </span>
            </div>

            <div className="mt-3 border-t border-white/15 pt-3">
              <p className="mb-2 text-sm text-sidebar-foreground/85">Overall performance</p>
              <div className="h-3 w-full rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-sidebar-foreground transition-all"
                  style={{ width: `${student.success_rate}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-sidebar-foreground/70">
                {student.success_rate}% success
              </p>
            </div>
          </div>
        </div>
      </div>

      {showAwardDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="award-xp-title"
          >
            <h3
              id="award-xp-title"
              className="font-heading mb-4 flex items-center gap-2 text-xl font-bold text-card-foreground"
            >
              <Award className="h-6 w-6 text-primary" />
              Award bonus XP
            </h3>

            <p className="mb-4 text-muted-foreground">
              Award bonus XP to <span className="font-semibold text-foreground">{student.username}</span> for good
              performance.
            </p>

            <div className="mb-6">
              <label htmlFor="xp-amount" className="mb-2 block text-sm font-semibold text-foreground">
                XP amount (1–100)
              </label>
              <input
                id="xp-amount"
                type="number"
                min={1}
                max={100}
                value={xpAmount}
                onChange={(e) => setXpAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-lg font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAwardDialog(false)}
                disabled={isAwarding}
                className="flex-1 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAwardXP}
                disabled={isAwarding}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isAwarding ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Awarding…
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Award {xpAmount} XP
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeactivateDialog}
        title="Deactivate student account?"
        message={`This will deactivate ${student.username} and prevent them from signing in. Their data is kept in the database. Coaches will no longer see this student in their active roster but will be notified that the account is deactivated.`}
        confirmText={isDeactivating ? 'Deactivating…' : 'Deactivate'}
        cancelText="Cancel"
        isDanger
        onConfirm={() => void handleDeactivate()}
        onCancel={() => !isDeactivating && setShowDeactivateDialog(false)}
      />

      <ConfirmDialog
        isOpen={showReactivateDialog}
        title="Reactivate student account?"
        message={`Restore sign-in for ${student.username}? They will appear again in coach rosters as an active student.`}
        confirmText={isReactivating ? 'Reactivating…' : 'Reactivate'}
        cancelText="Cancel"
        isDanger={false}
        onConfirm={() => void handleReactivate()}
        onCancel={() => !isReactivating && setShowReactivateDialog(false)}
      />
    </div>
  );
}
