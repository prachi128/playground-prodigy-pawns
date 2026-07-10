// app/(coach)/admin/page.tsx — Admin dashboard

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Loader2,
  Shield,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, type AdminOperationalMetrics } from '@/lib/api';
import { useCoachStats } from '@/contexts/coach-stats-context';

function MetricCard({
  label,
  value,
  href,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  href?: string;
  icon: LucideIcon;
  tone?: 'default' | 'warning';
}) {
  const inner = (
    <div
      className={`rounded-xl border bg-card p-4 shadow-sm transition-colors ${
        tone === 'warning' ? 'border-amber-200' : 'border-border hover:border-primary/25'
      } ${href ? 'hover:shadow-md' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{value}</p>
        </div>
        <Icon
          className={`h-5 w-5 shrink-0 ${tone === 'warning' ? 'text-amber-600' : 'text-primary'}`}
          aria-hidden
        />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function AdminDashboardPage() {
  const { stats } = useCoachStats();
  const [metrics, setMetrics] = useState<AdminOperationalMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await adminAPI.getOperationalMetrics();
        if (!cancelled) setMetrics(data);
      } catch {
        if (!cancelled) {
          toast.error('Failed to load admin dashboard');
          setMetrics(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unassignedStudents = stats?.students_without_coach ?? metrics?.unassigned_students ?? 0;
  const needsBatch = stats?.students_with_coach_without_batch ?? 0;

  if (loading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading academy overview…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-heading flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5 text-amber-600" aria-hidden />
            Admin dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Academy-wide operations, enrollment, and billing.
          </p>
        </div>
        <Link
          href="/coach"
          className="inline-flex items-center rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/60"
        >
          Switch to coach mode
        </Link>
      </div>

      {(unassignedStudents > 0 || needsBatch > 0) && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-amber-900">Enrollment attention needed</h2>
              <div className="mt-2 space-y-1 text-sm text-amber-800">
                {unassignedStudents > 0 && (
                  <p>
                    <span className="font-semibold">{unassignedStudents}</span> student
                    {unassignedStudents === 1 ? '' : 's'} without an assigned coach.
                  </p>
                )}
                {needsBatch > 0 && (
                  <p>
                    <span className="font-semibold">{needsBatch}</span> student
                    {needsBatch === 1 ? ' is' : 's are'} assigned to a coach but still need a class.
                  </p>
                )}
              </div>
              <Link
                href="/admin/students"
                className="mt-3 inline-flex rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Review students
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Active coaches"
          value={metrics?.active_coaches ?? '—'}
          href="/admin/coaches"
          icon={UserCog}
        />
        <MetricCard
          label="Unassigned students"
          value={unassignedStudents}
          href="/admin/students"
          icon={Users}
          tone={unassignedStudents > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          label="Active invites"
          value={metrics?.invite_counts.active ?? '—'}
          href="/admin/coach-invites"
          icon={UserPlus}
        />
        <MetricCard
          label="Critical actions (24h)"
          value={metrics?.recent_critical_actions_24h ?? '—'}
          href="/admin/audit-logs"
          icon={ClipboardList}
        />
        <MetricCard label="Payments" value="Open" href="/admin/payments" icon={Wallet} />
      </div>

      {metrics && metrics.recent_critical_actions.length > 0 && (
        <section className="mt-8">
          <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">Recent critical actions</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {metrics.recent_critical_actions.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium text-foreground">{row.action.replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground">
                  {new Date(row.created_at).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
