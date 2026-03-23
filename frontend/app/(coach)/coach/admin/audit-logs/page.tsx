'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { adminAPI, type AdminAuditLogRow } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Shield } from 'lucide-react';

const ACTION_OPTIONS = [
  'all',
  'coach_deactivate',
  'coach_reactivate',
  'student_deactivate',
  'student_reactivate',
  'student_assign_coach',
  'coach_invite_create',
  'coach_invite_revoke',
  'payment_mark_paid',
  'payment_unmark_paid',
] as const;

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<(typeof ACTION_OPTIONS)[number]>('all');
  const [rows, setRows] = useState<AdminAuditLogRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAPI.listAuditLogs({
        action: action === 'all' ? undefined : action,
        limit: 200,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load audit logs');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    void load();
  }, [isAuthenticated, user, router, load]);

  const prettyRows = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        detailsText: r.details ? JSON.stringify(r.details) : '{}',
      })),
    [rows]
  );

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
          Admin - audit logs
        </h1>
      </div>

      <div className="mb-4 flex items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Filter action
          </span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as (typeof ACTION_OPTIONS)[number])}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/60"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">When</th>
                  <th className="px-4 py-3 text-left font-semibold">Admin</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                  <th className="px-4 py-3 text-left font-semibold">Target</th>
                  <th className="px-4 py-3 text-left font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {prettyRows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-foreground">{r.admin_name || `#${r.admin_id}`}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        {r.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.target_type}
                      {r.target_id != null ? ` #${r.target_id}` : ''}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.detailsText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {prettyRows.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">No audit logs found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
