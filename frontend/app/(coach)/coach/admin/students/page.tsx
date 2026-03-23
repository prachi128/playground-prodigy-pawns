// Admin: all student accounts — activate / deactivate (coach console)

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import {
  ArrowLeft,
  Loader2,
  Shield,
  UserCheck,
  UserX,
  ExternalLink,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Row {
  id: number;
  username: string;
  full_name?: string;
  email: string;
  xp?: number;
  total_xp?: number;
  is_active?: boolean;
  coach_id?: number | null;
  coach_username?: string | null;
  coach_full_name?: string | null;
  is_unassigned?: boolean;
}

interface CoachRow {
  id: number;
  username: string;
  full_name: string;
  is_active?: boolean;
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignmentDraft, setAssignmentDraft] = useState<Record<number, string>>({});
  const [initialAssignment, setInitialAssignment] = useState<Record<number, string>>({});
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [confirm, setConfirm] = useState<{
    id: number;
    username: string;
    action: 'deactivate' | 'reactivate';
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params =
        assignmentFilter === 'unassigned'
          ? { unassigned_only: true }
          : assignmentFilter === 'assigned'
          ? { unassigned_only: false }
          : undefined;
      const [studentsRes, coachesRes] = await Promise.all([
        api.get('/api/coach/students', { params }),
        api.get('/api/coach/students/coaches'),
      ]);
      const res = studentsRes;
      const data = res.data;
      const nextRows = Array.isArray(data) ? data : [];
      setRows(nextRows);
      setCoaches(Array.isArray(coachesRes.data) ? coachesRes.data : []);
      const nextInitial: Record<number, string> = {};
      for (const student of nextRows) {
        nextInitial[student.id] = student.coach_id ? String(student.coach_id) : '__none__';
      }
      setInitialAssignment(nextInitial);
      setAssignmentDraft({});
    } catch {
      toast.error('Failed to load students');
      setRows([]);
      setCoaches([]);
      setInitialAssignment({});
      setAssignmentDraft({});
    } finally {
      setLoading(false);
    }
  }, [assignmentFilter]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    load();
  }, [isAuthenticated, user, router, load]);

  const changedStudentIds = rows
    .filter((r) => {
      const current = assignmentDraft[r.id] ?? (r.coach_id ? String(r.coach_id) : '__none__');
      const initial = initialAssignment[r.id] ?? (r.coach_id ? String(r.coach_id) : '__none__');
      return current !== initial;
    })
    .map((r) => r.id);

  const saveCoachAssignments = async () => {
    if (changedStudentIds.length === 0) return;
    setAssignBusy(true);
    try {
      for (const studentId of changedStudentIds) {
        const row = rows.find((r) => r.id === studentId);
        const rawValue = assignmentDraft[studentId] ?? (row?.coach_id ? String(row.coach_id) : '__none__');
        const coachId = rawValue === '__none__' || rawValue === '' ? null : Number(rawValue);
        if (coachId !== null && Number.isNaN(coachId)) {
          throw new Error('Pick a valid coach');
        }
        await api.put(`/api/coach/students/${studentId}/assign-coach`, { coach_id: coachId });
      }
      toast.success(`Saved coach assignment${changedStudentIds.length > 1 ? 's' : ''}`);
      await load();
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to update coach assignment');
    } finally {
      setAssignBusy(false);
    }
  };

  const runAction = async () => {
    if (!confirm) return;
    const { id, action } = confirm;
    setBusyId(id);
    try {
      if (action === 'deactivate') {
        await api.put(`/api/coach/students/${id}/deactivate`);
        toast.success('Student deactivated');
      } else {
        await api.put(`/api/coach/students/${id}/reactivate`);
        toast.success('Student reactivated');
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
          Admin — student accounts
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          View every student in the database. Deactivation blocks sign-in but keeps all data. Coaches only see active
          students and receive a notice listing deactivated accounts on their roster.
        </p>
        <div className="mt-4 inline-flex rounded-lg border border-border bg-card p-1">
          {(['all', 'assigned', 'unassigned'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setAssignmentFilter(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                assignmentFilter === key ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
              }`}
            >
              {key === 'all' ? 'All' : key === 'assigned' ? 'Assigned' : 'Unassigned'}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void saveCoachAssignments()}
            disabled={assignBusy || changedStudentIds.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assignBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save coach changes
            {changedStudentIds.length > 0 ? ` (${changedStudentIds.length})` : ''}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Student</th>
                <th className="px-4 py-3 text-left font-semibold">XP</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Coach Assigned</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const xp = r.total_xp ?? r.xp ?? 0;
                const active = r.is_active !== false;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{r.username}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {xp}
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
                      <select
                        value={assignmentDraft[r.id] ?? (r.coach_id ? String(r.coach_id) : '__none__')}
                        onChange={(e) =>
                          setAssignmentDraft((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        disabled={assignBusy}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
                      >
                        <option value="__none__">Unassigned</option>
                        {coaches
                          .filter((c) => c.is_active !== false)
                          .map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.full_name || c.username}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/coach/students/${r.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60"
                        >
                          Profile
                          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                        </Link>
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
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No student accounts.</p>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm?.action === 'deactivate' ? 'Deactivate account?' : 'Reactivate account?'}
        message={
          confirm
            ? confirm.action === 'deactivate'
              ? `Deactivate ${confirm.username}? They will disappear from coach rosters until reactivated. Data is retained.`
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
