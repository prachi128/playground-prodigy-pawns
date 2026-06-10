// app/(coach)/coach/coaches/[id]/page.tsx - Coach activity detail (admin)

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ClipboardCheck,
  Layers,
  Loader2,
  Megaphone,
  UserCog,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, type CoachDetailedActivity } from '@/lib/api';
import { coachCoachApiRef } from '@/lib/coach-coach-path';

const panel = 'rounded-lg border border-border bg-card p-5';

function displayName(c: CoachDetailedActivity): string {
  return c.full_name?.trim() || c.username;
}

function formatLastLogin(days: number | null | undefined): string {
  if (days == null) return 'Never recorded';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function lastLoginClass(days: number | null | undefined): string {
  if (days == null) return 'text-muted-foreground';
  if (days <= 1) return 'coach-text-success';
  if (days <= 7) return 'text-foreground';
  if (days <= 14) return 'coach-text-warning';
  return 'coach-text-danger';
}

function formatActivityType(type: string): string {
  switch (type) {
    case 'session':
      return 'Class session';
    case 'assignment':
      return 'Assignment';
    case 'attendance':
      return 'Attendance';
    case 'announcement':
      return 'Announcement';
    default:
      return type;
  }
}

function activityIcon(type: string) {
  switch (type) {
    case 'session':
      return Calendar;
    case 'assignment':
      return BookOpen;
    case 'attendance':
      return ClipboardCheck;
    case 'announcement':
      return Megaphone;
    default:
      return UserCog;
  }
}

function SnapshotItem({
  label,
  value,
  sub,
  valueClass = 'text-foreground',
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export default function CoachDetailPage() {
  const router = useRouter();
  const params = useParams();
  const coachUsername = decodeURIComponent(String(params.id ?? ''));
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();

  const [coach, setCoach] = useState<CoachDetailedActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'admin') {
      router.replace('/coach');
      return;
    }
    void loadCoach();
  }, [isAuthenticated, user, authLoading, router, coachUsername]);

  const loadCoach = async () => {
    setIsLoading(true);
    try {
      const data = await adminAPI.getCoachActivity(coachCoachApiRef(coachUsername));
      setCoach(data);
    } catch {
      toast.error('Failed to load coach activity');
      setCoach(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading coach…</p>
        </div>
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Coach not found.</p>
        <Link href="/coach/coaches" className="mt-4 inline-block text-sm font-semibold text-primary">
          Back to coaches
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-[min(70vh,520px)] space-y-6">
      <div>
        <Link
          href="/coach/coaches"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to coaches
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <UserCog className="coach-text-link h-5 w-5 shrink-0" />
              {displayName(coach)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              @{coach.username} · {coach.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {coach.is_active ? (
              <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Active account
              </span>
            ) : (
              <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                Deactivated
              </span>
            )}
            <Link
              href="/coach/admin/coaches"
              className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60"
            >
              Manage account
            </Link>
          </div>
        </div>
      </div>

      <div className={`${panel} grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
        <SnapshotItem
          label="Last sign-in"
          value={formatLastLogin(coach.days_since_login)}
          valueClass={lastLoginClass(coach.days_since_login)}
        />
        <SnapshotItem
          label="Active classes"
          value={String(coach.active_batches)}
          sub={coach.total_batches > coach.active_batches ? `${coach.total_batches} total` : undefined}
        />
        <SnapshotItem
          label="Active students"
          value={String(coach.active_students)}
          sub={
            coach.primary_students > 0
              ? `${coach.primary_students} primary assignments`
              : `${coach.total_students} enrolled total`
          }
        />
        <SnapshotItem
          label="This week"
          value={`${coach.sessions_this_week} sessions`}
          sub={`${coach.assignments_this_week} new assignments · ${coach.attendance_marked_this_week} attendance marks`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Classes
          </h2>
          {coach.batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes under this coach.</p>
          ) : (
            <div className="space-y-3">
              {coach.batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{batch.name}</p>
                    {batch.schedule && (
                      <p className="text-xs text-muted-foreground">{batch.schedule}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {batch.student_count}
                    </p>
                    {!batch.is_active && (
                      <p className="text-[11px] text-muted-foreground">Archived</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={panel}>
          <h2 className="mb-4 text-sm font-semibold text-foreground">Teaching activity</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <SnapshotItem label="Active assignments" value={String(coach.active_assignments)} />
            <SnapshotItem label="Total assignments" value={String(coach.total_assignments)} />
            <SnapshotItem label="Sessions created" value={String(coach.sessions_total)} />
            <SnapshotItem label="Attendance marked" value={String(coach.attendance_marked_total)} />
            <SnapshotItem label="Announcements" value={String(coach.announcements_total)} />
            <SnapshotItem
              label="Member since"
              value={new Date(coach.created_at).toLocaleDateString('en-IN', {
                month: 'short',
                year: 'numeric',
              })}
            />
          </div>
        </section>
      </div>

      <section className={panel}>
        <h2 className="mb-4 text-sm font-semibold text-foreground">Recent activity</h2>
        {coach.recent_activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recorded activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {coach.recent_activity.map((item, idx) => {
              const Icon = activityIcon(item.activity_type);
              return (
                <li
                  key={`${item.activity_type}-${item.occurred_at}-${idx}`}
                  className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatActivityType(item.activity_type)} ·{' '}
                      {new Date(item.occurred_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
