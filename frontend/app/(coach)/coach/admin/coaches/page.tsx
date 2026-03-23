// Admin: all coach accounts - activate / deactivate (coach console)

'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Shield,
  Users,
  UserCheck,
  UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Row {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_active?: boolean;
}

interface CoachRosterStudent {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_active: boolean;
  payment_status: string;
  is_enrollment_active: boolean;
}

interface CoachRosterBatch {
  id: number;
  name: string;
  description?: string;
  schedule?: string;
  monthly_fee: number;
  is_active: boolean;
  student_count: number;
  students: CoachRosterStudent[];
}

interface CoachRoster {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_active: boolean;
  total_batches: number;
  total_students: number;
  active_students: number;
  inactive_students: number;
  batches: CoachRosterBatch[];
}

export default function AdminCoachesPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [rosterByCoach, setRosterByCoach] = useState<Record<number, CoachRoster>>({});
  const [rosterLoadingId, setRosterLoadingId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{
    id: number;
    username: string;
    action: 'deactivate' | 'reactivate';
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/coaches');
      const data = res.data;
      setRows(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load coaches');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    void load();
  }, [isAuthenticated, user, router, load]);

  const runAction = async () => {
    if (!confirm) return;
    const { id, action } = confirm;
    setBusyId(id);
    try {
      if (action === 'deactivate') {
        await api.put(`/api/admin/coaches/${id}/deactivate`);
        toast.success('Coach deactivated');
      } else {
        await api.put(`/api/admin/coaches/${id}/reactivate`);
        toast.success('Coach reactivated');
      }
      setConfirm(null);
      await load();
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const loadCoachRoster = useCallback(async (coachId: number) => {
    if (rosterByCoach[coachId]) {
      setExpanded((prev) => ({ ...prev, [coachId]: !prev[coachId] }));
      return;
    }
    setRosterLoadingId(coachId);
    try {
      const res = await api.get('/api/admin/coaches/roster', {
        params: { coach_id: coachId, include_inactive: true },
      });
      const rows = Array.isArray(res.data) ? (res.data as CoachRoster[]) : [];
      const roster = rows[0];
      if (roster) {
        setRosterByCoach((prev) => ({ ...prev, [coachId]: roster }));
      }
      setExpanded((prev) => ({ ...prev, [coachId]: true }));
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to load coach roster');
    } finally {
      setRosterLoadingId(null);
    }
  }, [rosterByCoach]);

  if (loading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading accounts…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-6">
        <Link
          href="/coach"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="font-heading flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Shield className="h-5 w-5" />
          </span>
          Admin - coach accounts
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          View every coach account. Deactivation blocks sign-in but keeps all coach data.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Coach</th>
                <th className="px-4 py-3 text-left font-semibold">Username</th>
                <th className="px-4 py-3 text-left font-semibold">Batches</th>
                <th className="px-4 py-3 text-left font-semibold">Students</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const active = r.is_active !== false;
                const isExpanded = !!expanded[r.id];
                const roster = rosterByCoach[r.id];
                return (
                  <Fragment key={r.id}>
                    <tr key={r.id} className="border-b border-border">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{r.full_name || r.username}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </td>
                      <td className="px-4 py-3 text-foreground">@{r.username}</td>
                      <td className="px-4 py-3 text-foreground">{roster?.total_batches ?? '-'}</td>
                      <td className="px-4 py-3 text-foreground">
                        {roster ? (
                          <span>
                            {roster.total_students}{' '}
                            <span className="text-xs text-muted-foreground">
                              ({roster.active_students} active, {roster.inactive_students} inactive)
                            </span>
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {active ? (
                          <span className="rounded-full bg-[hsl(var(--green-very-light))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--green-medium))]">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={rosterLoadingId === r.id}
                            onClick={() => {
                              if (rosterByCoach[r.id]) {
                                setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }));
                                return;
                              }
                              void loadCoachRoster(r.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 disabled:opacity-50"
                          >
                            {rosterLoadingId === r.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                            {isExpanded ? 'Hide roster' : 'View roster'}
                          </button>
                          {active ? (
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() =>
                                setConfirm({ id: r.id, username: r.username, action: 'deactivate' })
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/15 disabled:opacity-50"
                            >
                              {busyId === r.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserX className="h-3.5 w-3.5" />
                              )}
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() =>
                                setConfirm({ id: r.id, username: r.username, action: 'reactivate' })
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
                            >
                              {busyId === r.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-border last:border-0">
                        <td colSpan={6} className="bg-muted/20 px-4 py-4">
                          {!roster || roster.batches.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No batches under this coach.</p>
                          ) : (
                            <div className="space-y-3">
                              {roster.batches.map((batch) => (
                                <div key={batch.id} className="rounded-lg border border-border bg-card p-3">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-foreground">{batch.name}</p>
                                      {batch.schedule && (
                                        <p className="text-xs text-muted-foreground">Schedule: {batch.schedule}</p>
                                      )}
                                      {batch.description && (
                                        <p className="mt-1 text-xs text-muted-foreground">{batch.description}</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground">Monthly fee</p>
                                      <p className="font-semibold text-foreground">
                                        {new Intl.NumberFormat('en-IN', {
                                          style: 'currency',
                                          currency: 'INR',
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }).format(batch.monthly_fee)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <Users className="h-3.5 w-3.5" />
                                    {batch.student_count} students
                                  </div>
                                  {batch.students.length > 0 && (
                                    <div className="mt-3 overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead className="border-b border-border/80">
                                          <tr className="text-left text-muted-foreground">
                                            <th className="py-1.5 pr-2 font-medium">Student</th>
                                            <th className="py-1.5 pr-2 font-medium">Username</th>
                                            <th className="py-1.5 pr-2 font-medium">Status</th>
                                            <th className="py-1.5 pr-2 font-medium">Payment</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {batch.students.map((s) => (
                                            <tr key={s.id} className="border-b border-border/60 last:border-0">
                                              <td className="py-1.5 pr-2 text-foreground">{s.full_name || s.username}</td>
                                              <td className="py-1.5 pr-2 text-muted-foreground">@{s.username}</td>
                                              <td className="py-1.5 pr-2">
                                                {s.is_active ? 'Active account' : 'Deactivated account'}
                                                {!s.is_enrollment_active && (
                                                  <span className="text-muted-foreground">, enrollment inactive</span>
                                                )}
                                              </td>
                                              <td className="py-1.5 pr-2 capitalize text-muted-foreground">{s.payment_status}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No coach accounts.</p>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm?.action === 'deactivate' ? 'Deactivate account?' : 'Reactivate account?'}
        message={
          confirm
            ? confirm.action === 'deactivate'
              ? `Deactivate ${confirm.username}? They will no longer be able to sign in until reactivated.`
              : `Restore sign-in for ${confirm.username}?`
            : ''
        }
        confirmText={confirm?.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        cancelText="Cancel"
        isDanger={confirm?.action === 'deactivate'}
        onConfirm={() => void runAction()}
        onCancel={() => !busyId && setConfirm(null)}
      />
    </div>
  );
}

