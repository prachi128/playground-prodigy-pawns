// app/(coach)/coach/page.tsx - Coach Dashboard

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Loader2, CalendarClock, Presentation, Video, AlertTriangle, Users, ListChecks, Clock } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { batchAPI, coachAPI, type Batch, type CoachPriorities, type CoachUpcomingClass } from '@/lib/api';
import { formatAssignmentDate } from '@/lib/assignment-ui';
import { formatDateTimeIST } from '@/lib/class-time';
import { getNextDashboardClass } from '@/lib/coach-schedule';
import { useCoachStats } from '@/contexts/coach-stats-context';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function CoachDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();
  const { stats } = useCoachStats();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<CoachUpcomingClass[]>([]);
  const [priorities, setPriorities] = useState<CoachPriorities | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'coach' && user.role !== 'admin') {
      toast.error('Access denied. Coach privileges required.');
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, authLoading, user, router]);

  useEffect(() => {
    if (!user || (user.role !== 'coach' && user.role !== 'admin')) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [batchList, classes, priorityData] = await Promise.all([
          batchAPI.list(),
          coachAPI.getUpcomingClasses(10),
          coachAPI.getPriorities(),
        ]);
        if (cancelled) return;
        setBatches(batchList.filter((b) => b.is_active));
        setUpcomingClasses(classes);
        setPriorities(priorityData);
      } catch {
        if (!cancelled) {
          setBatches([]);
          setUpcomingClasses([]);
          setPriorities(null);
          setLoadError(true);
          toast.error('Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const activeBatches = useMemo(() => batches.filter((b) => b.is_active), [batches]);

  const nextClass = useMemo(
    () => getNextDashboardClass(activeBatches, upcomingClasses),
    [activeBatches, upcomingClasses],
  );
  const nextClassWhen = nextClass ? formatDateTimeIST(nextClass.startsAt) : null;

  const displayName = user?.full_name?.trim() || user?.username || 'Coach';
  const coachNeedsBatchAssignments = stats?.roster_students_without_batch ?? 0;
  const overdueCount = priorities?.counts.assignments_overdue ?? 0;
  const dueSoonCount = priorities?.counts.assignments_due_soon ?? 0;
  const hasAssignmentPriorities = overdueCount > 0 || dueSoonCount > 0;

  if (loading) {
    return (
      <div className="flex min-h-[min(60vh,480px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <h1 className="font-heading text-foreground">
          {greetingForHour(new Date().getHours())},{' '}
          <span className="coach-text-link">{displayName}</span>
        </h1>
        <Link
          href="/coach/teaching"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Presentation className="h-3.5 w-3.5" aria-hidden />
          Start lesson
        </Link>
      </div>

      {loadError ? (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Some dashboard data could not be loaded. Refresh the page or try again in a moment.
        </div>
      ) : null}

      {coachNeedsBatchAssignments > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <Users className="h-4 w-4" />
                Assignment attention needed
              </h2>
              <div className="mt-2 space-y-2 text-sm text-amber-800">
                <p>
                  <span className="font-semibold">{coachNeedsBatchAssignments}</span> student
                  {coachNeedsBatchAssignments === 1 ? '' : 's'} under your roster still need batch
                  assignment.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/coach/students"
                  className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
                >
                  Review students
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasAssignmentPriorities && priorities ? (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ListChecks className="h-4 w-4 text-primary" />
              Assignment priorities
            </h2>
            <Link
              href="/coach/assignments"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all assignments
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {overdueCount > 0 ? (
              <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                  Overdue ({overdueCount})
                </p>
                <ul className="mt-2 space-y-2">
                  {priorities.assignments_overdue.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/coach/assignments/${item.id}`}
                        className="block text-sm font-medium text-foreground hover:text-primary"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {item.target_label} · Due {formatAssignmentDate(item.due_date)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {dueSoonCount > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Due soon ({dueSoonCount})
                </p>
                <ul className="mt-2 space-y-2">
                  {priorities.assignments_due_soon.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/coach/assignments/${item.id}`}
                        className="block text-sm font-medium text-foreground hover:text-primary"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-amber-900/80">
                        {item.target_label} ·{' '}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due {formatAssignmentDate(item.due_date)}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading flex items-center gap-2 text-foreground">
            <CalendarClock className="coach-text-link h-4 w-4 shrink-0" aria-hidden />
            Next class
          </h2>
          <Link
            href="/coach/batches"
            className="coach-text-link text-[13px] font-medium transition-opacity hover:opacity-80"
          >
            My classes
          </Link>
        </div>

        {nextClass && nextClassWhen ? (
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-heading text-foreground">
                  <span className="coach-text-link">{nextClass.batchName}</span>
                  {nextClass.topic ? (
                    <span className="font-normal text-muted-foreground"> · {nextClass.topic}</span>
                  ) : null}
                </h3>
                <div className="mt-2.5 space-y-0.5 text-[13px] text-muted-foreground">
                  <p className="coach-text-success font-medium">{nextClassWhen.day}</p>
                  <p>{nextClassWhen.date}</p>
                  <p>{nextClassWhen.time}</p>
                  {nextClass.durationMinutes ? (
                    <p className="pt-0.5 text-xs text-muted-foreground">{nextClass.durationMinutes} min</p>
                  ) : null}
                </div>
              </div>
              {nextClass.meetingLink ? (
                <a
                  href={nextClass.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Video className="h-3.5 w-3.5" aria-hidden />
                  Join now
                </a>
              ) : (
                <Link
                  href={`/coach/batches/${nextClass.batchId}?tab=classes`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/60"
                >
                  Add Zoom link
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 text-[13px] text-muted-foreground">
            No upcoming classes found.{' '}
            <Link href="/coach/batches" className="font-semibold text-primary hover:underline">
              Set up a class schedule
            </Link>{' '}
            with a recurring time and Zoom link.
          </div>
        )}
      </div>
    </div>
  );
}
