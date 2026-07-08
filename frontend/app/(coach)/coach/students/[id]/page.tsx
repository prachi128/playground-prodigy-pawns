// app/(coach)/coach/students/[id]/page.tsx - Student detail (coach layout)

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
  ArrowLeft,
  Award,
  Calendar,
  CalendarCheck,
  Loader2,
  FileText,
  UserX,
  UserCheck,
  Send,
  BarChart3,
  Target,
  Gamepad2,
  Zap,
  AlertCircle,
  Phone,
  Mail,
  Pencil,
  MessageCircle,
  ExternalLink,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api, { coachAPI } from '@/lib/api';
import { coachStudentApiRef, coachStudentReportPath } from '@/lib/coach-student-path';
import ConfirmDialog from '@/components/ConfirmDialog';
import StudentActivityCharts from '@/components/coach/StudentActivityCharts';

interface ThemePerformanceRow {
  theme_key: string;
  attempts: number;
  solved: number;
  accuracy_pct: number;
}

interface StudentDetails {
  id: number;
  username: string;
  full_name: string;
  email: string;
  guardian_email?: string | null;
  student_email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  age?: number | null;
  rating?: number;
  skill_level?: string;
  batch_names?: string[];
  attendance_pct?: number | null;
  last_class_attended?: string | null;
  xp: number;
  created_at: string;
  last_active: string;
  total_puzzles_attempted: number;
  total_puzzles_solved: number;
  success_rate: number;
  puzzles_this_week: number;
  xp_this_week: number;
  games_played: number;
  games_won: number;
  game_win_rate: number;
  games_this_week: number;
  days_since_active: number;
  is_active?: boolean;
  theme_performance?: ThemePerformanceRow[];
  weekly_trend?: string;
}

const panel = 'rounded-lg border border-border bg-card p-5';

function displayName(s: StudentDetails): string {
  return s.full_name?.trim() || s.username;
}

function formatLastClassDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatLastActive(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function lastActiveClass(days: number): string {
  if (days <= 1) return 'coach-text-success';
  if (days <= 7) return 'text-foreground';
  if (days <= 14) return 'coach-text-warning';
  return 'coach-text-danger';
}

function attendanceClass(pct: number | null | undefined): string {
  if (pct == null) return 'text-muted-foreground';
  if (pct >= 80) return 'coach-text-success';
  if (pct >= 50) return 'coach-text-warning';
  return 'coach-text-danger';
}

function skillLevelClass(level: string | undefined): string {
  switch (level) {
    case 'Expert':
      return 'coach-text-accent';
    case 'Advanced':
      return 'coach-text-link';
    case 'Intermediate':
      return 'coach-text-success';
    case 'Beginner':
      return 'coach-text-warning';
    default:
      return 'text-muted-foreground';
  }
}

function formatThemeLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
}

function whatsappDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  external,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null | undefined;
  href?: string;
  external?: boolean;
}) {
  const display = value?.trim() || 'Not provided';
  const hasValue = Boolean(value?.trim());

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {hasValue && href ? (
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="mt-0.5 inline-flex items-center gap-1 break-all text-sm font-medium coach-text-link hover:underline"
          >
            {display}
            {external ? <ExternalLink className="h-3 w-3 shrink-0" /> : null}
          </a>
        ) : (
          <p className={`mt-0.5 text-sm ${hasValue ? 'text-foreground' : 'text-muted-foreground'}`}>
            {display}
          </p>
        )}
      </div>
    </div>
  );
}

function InfoTooltip({ text, ariaLabel }: { text: string; ariaLabel: string }) {
  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={ariaLabel}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 top-full z-10 mt-1.5 w-56 rounded-lg border border-border bg-card px-3 py-2 text-[12px] leading-snug text-foreground shadow-md group-hover:visible group-focus-within:visible"
      >
        {text}
      </div>
    </div>
  );
}

function SnapshotItem({
  label,
  value,
  sub,
  infoTip,
  valueClass = 'text-foreground',
}: {
  label: string;
  value: string;
  sub?: string;
  infoTip?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {infoTip ? <InfoTooltip text={infoTip} ariaLabel={`About ${label}`} /> : null}
      </div>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentUsername = decodeURIComponent(String(params.id ?? ''));
  const { isAuthenticated, user } = useAuthStore();

  const [student, setStudent] = useState<StudentDetails | null>(null);
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
  const [showNudgeDialog, setShowNudgeDialog] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [nudgeSending, setNudgeSending] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    age: '',
    guardian_email: '',
    student_email: '',
    phone: '',
    whatsapp: '',
  });

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coach' && user?.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }
    if (!studentUsername) {
      router.push('/coach/students');
      return;
    }
    loadStudent();
  }, [isAuthenticated, user, router, studentUsername]);

  const loadStudent = async () => {
    if (!studentUsername) return;
    setIsLoading(true);
    try {
      const response = await api.get(
        `/api/coach/students/${coachStudentApiRef(studentUsername)}`,
      );
      setStudent(response.data as StudentDetails);
    } catch {
      toast.error('Failed to load student details');
      router.push('/coach/students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAwardXP = async () => {
    if (!student || !xpAmount || xpAmount < 1 || xpAmount > 100) {
      toast.error('XP must be between 1 and 100');
      return;
    }
    setIsAwarding(true);
    try {
      await api.post(
        `/api/coach/students/${coachStudentApiRef(student.username)}/award-xp?xp_amount=${xpAmount}`,
      );
      toast.success(`Awarded ${xpAmount} XP to ${student.username}`);
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
    if (!student || deactivateLock.current) return;
    deactivateLock.current = true;
    setIsDeactivating(true);
    try {
      await api.put(`/api/coach/students/${coachStudentApiRef(student.username)}/deactivate`);
      toast.success('Student account deactivated');
      setShowDeactivateDialog(false);
      loadStudent();
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

  const handleSendNudge = async () => {
    if (!student) return;
    setNudgeSending(true);
    try {
      await coachAPI.nudgeStudent(student.username, nudgeMessage.trim() || null);
      toast.success('Reminder sent to student');
      setShowNudgeDialog(false);
      setNudgeMessage('');
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to send reminder');
    } finally {
      setNudgeSending(false);
    }
  };

  const openEditDialog = () => {
    if (!student) return;
    setEditForm({
      full_name: student.full_name?.trim() || student.username,
      age: student.age != null ? String(student.age) : '',
      guardian_email: student.guardian_email?.trim() || '',
      student_email: student.student_email?.trim() || '',
      phone: student.phone?.trim() || '',
      whatsapp: student.whatsapp?.trim() || '',
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!student) return;
    const fullName = editForm.full_name.trim();
    if (!fullName) {
      toast.error('Full name is required');
      return;
    }
    const ageRaw = editForm.age.trim();
    let age: number | null = null;
    if (ageRaw) {
      age = parseInt(ageRaw, 10);
      if (Number.isNaN(age) || age < 4 || age > 99) {
        toast.error('Age must be between 4 and 99');
        return;
      }
    }

    setEditSaving(true);
    try {
      const updated = await coachAPI.updateStudent(student.username, {
        full_name: fullName,
        age,
        guardian_email: editForm.guardian_email.trim() || null,
        student_email: editForm.student_email.trim() || null,
        phone: editForm.phone.trim() || null,
        whatsapp: editForm.whatsapp.trim() || null,
      });
      setStudent(updated as StudentDetails);
      toast.success('Student details updated');
      setShowEditDialog(false);
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to update student');
    } finally {
      setEditSaving(false);
    }
  };

  const handleReactivate = async () => {
    if (!student || reactivateLock.current) return;
    reactivateLock.current = true;
    setIsReactivating(true);
    try {
      await api.put(`/api/coach/students/${coachStudentApiRef(student.username)}/reactivate`);
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

  const isStudentActive = student.is_active !== false;
  const isAdmin = user?.role === 'admin';
  const batches = student.batch_names ?? [];
  const topTopics = (student.theme_performance ?? []).slice(0, 6);
  const practiceThisWeek = student.puzzles_this_week + student.games_this_week;

  return (
    <div className="space-y-6">
      <Link
        href="/coach/students"
        className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to students
      </Link>

      {/* Identity + actions */}
      <div className={`${panel} space-y-4`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-semibold text-foreground sm:text-2xl">
              {displayName(student)}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              <span className="coach-text-link">@{student.username}</span>
              {student.age != null && (
                <>
                  <span className="mx-1.5 text-border">·</span>
                  Age {student.age}
                </>
              )}
              {student.rating != null && (
                <>
                  <span className="mx-1.5 text-border">·</span>
                  Rating <span className="font-semibold text-foreground">{student.rating}</span>
                </>
              )}
              {student.skill_level && student.skill_level !== '—' && (
                <>
                  <span className="mx-1.5 text-border">·</span>
                  <span className={`font-medium ${skillLevelClass(student.skill_level)}`}>
                    {student.skill_level}
                  </span>
                </>
              )}
            </p>
            {batches.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {batches.map((name) => (
                  <span
                    key={name}
                    className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowContactDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted/60"
            >
              <Phone className="h-3.5 w-3.5" />
              Contact
            </button>
            <button
              type="button"
              onClick={openEditDialog}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted/60"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={() =>
                window.open(coachStudentReportPath(student.username), '_blank', 'noopener,noreferrer')
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted/60"
            >
              <FileText className="h-3.5 w-3.5" />
              Report
            </button>
            {isStudentActive && (
              <>
                <button
                  type="button"
                  onClick={() => setShowNudgeDialog(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted/60"
                >
                  <Send className="h-3.5 w-3.5" />
                  Remind
                </button>
                <button
                  type="button"
                  onClick={() => setShowAwardDialog(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Award className="h-3.5 w-3.5" />
                  Award XP
                </button>
              </>
            )}
            {isAdmin && isStudentActive && (
              <button
                type="button"
                onClick={() => setShowDeactivateDialog(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-2 text-[13px] font-medium text-destructive hover:bg-destructive/10"
              >
                <UserX className="h-3.5 w-3.5" />
                Deactivate
              </button>
            )}
            {isAdmin && !isStudentActive && (
              <button
                type="button"
                onClick={() => setShowReactivateDialog(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-[13px] font-medium text-primary hover:bg-primary/15"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Reactivate
              </button>
            )}
          </div>
        </div>

        {!isStudentActive && (
          <div
            className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-foreground"
            role="status"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>
              Account deactivated — student cannot sign in
              {isAdmin ? ' until reactivated.' : '.'}
            </p>
          </div>
        )}

        {student.days_since_active > 7 && isStudentActive && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 coach-text-warning" />
            <p className="text-muted-foreground">
              No app activity for{' '}
              <span className={`font-medium ${lastActiveClass(student.days_since_active)}`}>
                {student.days_since_active} days
              </span>
              . Consider sending a reminder.
            </p>
          </div>
        )}
      </div>

      {/* Coach snapshot */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SnapshotItem
          label="Class attendance"
          value={student.attendance_pct != null ? `${student.attendance_pct}%` : '—'}
          infoTip="Present ÷ scheduled classes"
          valueClass={attendanceClass(student.attendance_pct)}
        />
        <SnapshotItem
          label="Last class attended"
          value={formatLastClassDate(student.last_class_attended)}
          infoTip="Most recent present mark"
        />
        <SnapshotItem
          label="Last app activity"
          value={formatLastActive(student.days_since_active)}
          valueClass={lastActiveClass(student.days_since_active)}
        />
        <SnapshotItem
          label="Practice this week"
          value={String(practiceThisWeek)}
          sub={`${student.puzzles_this_week} puzzles · ${student.games_this_week} games`}
          valueClass={practiceThisWeek > 0 ? 'coach-text-success' : 'coach-text-warning'}
        />
      </div>

      {/* Activity charts */}
      <section className={panel}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-heading flex items-center gap-2 text-base font-semibold text-foreground">
            <BarChart3 className="coach-text-link h-4 w-4" />
            Activity
          </h2>
          <InfoTooltip
            ariaLabel="About activity charts"
            text="Daily games and puzzle attempts — use this to see if they are practicing between classes."
          />
        </div>
        <StudentActivityCharts studentId={student.id} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Practice summary */}
        <section className={panel}>
          <h2 className="font-heading mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <Target className="coach-text-link h-4 w-4" />
            Practice summary
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <dt className="text-muted-foreground">Puzzles solved</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {student.total_puzzles_solved}
                <span className="font-normal text-muted-foreground">
                  {' '}
                  / {student.total_puzzles_attempted}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <dt className="text-muted-foreground">Puzzle success rate</dt>
              <dd
                className={`font-semibold tabular-nums ${
                  student.success_rate >= 70
                    ? 'coach-text-success'
                    : student.success_rate >= 50
                      ? 'coach-text-warning'
                      : 'coach-text-danger'
                }`}
              >
                {student.success_rate}%
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Gamepad2 className="h-3.5 w-3.5" />
                Games played
              </dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {student.games_played}
                <span className="font-normal text-muted-foreground">
                  {' '}
                  · {student.games_won} wins ({student.game_win_rate}%)
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="h-3.5 w-3.5" />
                Total XP
              </dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {student.xp.toLocaleString()}
                <span className="font-normal text-muted-foreground">
                  {' '}
                  (+{student.xp_this_week} this week)
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Member since
              </dt>
              <dd className="text-foreground">
                {new Date(student.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </section>

        {/* Top topics */}
        <section className={panel}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-heading flex items-center gap-2 text-base font-semibold text-foreground">
              <CalendarCheck className="coach-text-link h-4 w-4" />
              Puzzle topics
            </h2>
            <InfoTooltip
              ariaLabel="About puzzle topics"
              text="Where they spend practice time — assign homework in weaker areas."
            />
          </div>
          {topTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No themed puzzle data yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Topic</th>
                    <th className="px-3 py-2 text-right font-medium">Solved</th>
                    <th className="px-3 py-2 text-right font-medium">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {topTopics.map((row) => (
                    <tr key={row.theme_key} className="border-t border-border">
                      <td className="px-3 py-2 capitalize text-foreground">
                        {formatThemeLabel(row.theme_key)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {row.solved}/{row.attempts}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium tabular-nums ${
                          row.accuracy_pct >= 70
                            ? 'coach-text-success'
                            : row.accuracy_pct >= 50
                              ? 'coach-text-warning'
                              : 'coach-text-danger'
                        }`}
                      >
                        {row.accuracy_pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showContactDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-title"
          >
            <h3
              id="contact-title"
              className="font-heading mb-1 flex items-center gap-2 text-lg font-semibold text-foreground"
            >
              <Phone className="h-5 w-5 text-primary" />
              Contact information
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Parent/guardian and student contact details on file.
            </p>
            <div className="space-y-2">
              <ContactRow
                icon={Mail}
                label="Parent / guardian email"
                value={student.guardian_email}
                href={student.guardian_email ? `mailto:${student.guardian_email}` : undefined}
              />
              <ContactRow
                icon={Mail}
                label="Student email"
                value={student.student_email}
                href={student.student_email ? `mailto:${student.student_email}` : undefined}
              />
              <ContactRow
                icon={Phone}
                label="Phone"
                value={student.phone}
                href={student.phone ? `tel:${student.phone.replace(/\s/g, '')}` : undefined}
              />
              <ContactRow
                icon={MessageCircle}
                label="WhatsApp"
                value={student.whatsapp}
                href={
                  student.whatsapp && whatsappDigits(student.whatsapp)
                    ? `https://wa.me/${whatsappDigits(student.whatsapp)}`
                    : undefined
                }
                external
              />
            </div>
            <button
              type="button"
              onClick={() => setShowContactDialog(false)}
              className="mt-5 w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
          >
            <h3
              id="edit-title"
              className="font-heading mb-1 flex items-center gap-2 text-lg font-semibold text-foreground"
            >
              <Pencil className="h-5 w-5 text-primary" />
              Edit student details
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Update profile and contact info for <span className="font-medium">@{student.username}</span>.
            </p>
            <div className="max-h-[min(60vh,420px)] space-y-3 overflow-y-auto pr-1">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground">Full name</span>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground">Age</span>
                <input
                  type="number"
                  min={4}
                  max={99}
                  value={editForm.age}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground">Parent / guardian email</span>
                <input
                  type="email"
                  value={editForm.guardian_email}
                  onChange={(e) => setEditForm({ ...editForm, guardian_email: e.target.value })}
                  placeholder="parent@example.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground">Student email</span>
                <input
                  type="email"
                  value={editForm.student_email}
                  onChange={(e) => setEditForm({ ...editForm, student_email: e.target.value })}
                  placeholder="Optional — leave blank if none"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground">Phone</span>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground">WhatsApp</span>
                <input
                  type="tel"
                  value={editForm.whatsapp}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                  placeholder="Optional — include country code"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowEditDialog(false)}
                disabled={editSaving}
                className="flex-1 rounded-lg border border-border bg-muted px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveEdit()}
                disabled={editSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNudgeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nudge-title"
          >
            <h3
              id="nudge-title"
              className="font-heading mb-2 flex items-center gap-2 text-lg font-semibold text-foreground"
            >
              <Send className="h-5 w-5 text-primary" />
              Send reminder
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Sends an in-app notification. Leave blank for the default message.
            </p>
            <textarea
              value={nudgeMessage}
              onChange={(e) => setNudgeMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Optional note…"
              className="mb-4 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowNudgeDialog(false);
                  setNudgeMessage('');
                }}
                disabled={nudgeSending}
                className="flex-1 rounded-lg border border-border bg-muted px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSendNudge()}
                disabled={nudgeSending}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {nudgeSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}

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
              className="font-heading mb-4 flex items-center gap-2 text-lg font-semibold text-foreground"
            >
              <Award className="h-5 w-5 text-primary" />
              Award bonus XP
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Award XP to <span className="font-medium text-foreground">{student.username}</span>.
            </p>
            <input
              id="xp-amount"
              type="number"
              min={1}
              max={100}
              value={xpAmount}
              onChange={(e) => setXpAmount(parseInt(e.target.value, 10) || 0)}
              className="mb-6 w-full rounded-lg border border-input bg-background px-4 py-3 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAwardDialog(false)}
                disabled={isAwarding}
                className="flex-1 rounded-lg border border-border bg-muted px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleAwardXP()}
                disabled={isAwarding}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {isAwarding ? <Loader2 className="h-4 w-4 animate-spin" /> : `Award ${xpAmount} XP`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeactivateDialog}
        title="Deactivate student account?"
        message={`Deactivate ${student.username}? They cannot sign in until reactivated.`}
        confirmText={isDeactivating ? 'Deactivating…' : 'Deactivate'}
        cancelText="Cancel"
        isDanger
        onConfirm={() => void handleDeactivate()}
        onCancel={() => !isDeactivating && setShowDeactivateDialog(false)}
      />

      <ConfirmDialog
        isOpen={showReactivateDialog}
        title="Reactivate student account?"
        message={`Restore sign-in for ${student.username}?`}
        confirmText={isReactivating ? 'Reactivating…' : 'Reactivate'}
        cancelText="Cancel"
        isDanger={false}
        onConfirm={() => void handleReactivate()}
        onCancel={() => !isReactivating && setShowReactivateDialog(false)}
      />
    </div>
  );
}
