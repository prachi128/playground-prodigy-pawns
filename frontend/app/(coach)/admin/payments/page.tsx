// app/(coach)/admin/payments/page.tsx — batch payment overview (admin + batch coach)

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Loader2, Shield, IndianRupee } from 'lucide-react';

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface PaymentRow {
  student_id: number;
  student_name: string;
  student_username: string;
  batch_id: number;
  batch_name: string;
  monthly_fee: number;
  billing_month: string;
  status: 'paid' | 'pending' | 'overdue';
  paid_at: string | null;
  payment_id: number | null;
}

interface PaymentSummary {
  total_students: number;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
  total_collected: number;
  billing_month: string;
}

interface PaymentsPayload {
  summary: PaymentSummary;
  payments: PaymentRow[];
}

function defaultBillingMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function escapeCsvCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingMonth, setBillingMonth] = useState(defaultBillingMonth);
  const [batchId, setBatchId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (billingMonth) params.billing_month = billingMonth;
      if (batchId.trim()) params.batch_id = parseInt(batchId, 10);
      if (statusFilter) params.status = statusFilter;
      const res = await api.get<PaymentsPayload>('/api/admin/payments', { params });
      setSummary(res.data.summary);
      setPayments(res.data.payments ?? []);
    } catch {
      toast.error('Failed to load payments');
      setSummary(null);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [billingMonth, batchId, statusFilter]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    void load();
  }, [isAuthenticated, user, router, load]);

  const batchOptions = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of payments) {
      if (!m.has(p.batch_id)) m.set(p.batch_id, p.batch_name);
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [payments]);

  const exportCsv = () => {
    const headers = [
      'student_id',
      'student_name',
      'student_username',
      'batch_id',
      'batch_name',
      'monthly_fee',
      'fee_inr',
      'billing_month',
      'status',
      'paid_at',
      'payment_id',
    ];
    const lines = [
      headers.join(','),
      ...payments.map((p) =>
        [
          p.student_id,
          escapeCsvCell(p.student_name),
          escapeCsvCell(p.student_username),
          p.batch_id,
          escapeCsvCell(p.batch_name),
          p.monthly_fee,
          escapeCsvCell(formatInr(p.monthly_fee)),
          p.billing_month,
          p.status,
          p.paid_at ? escapeCsvCell(p.paid_at) : '',
          p.payment_id ?? '',
        ].join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${summary?.billing_month ?? billingMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markPaid = async (p: PaymentRow) => {
    const key = `${p.student_id}-${p.batch_id}`;
    setBusyKey(key);
    try {
      await api.post('/api/admin/payments/mark-paid', {
        student_id: p.student_id,
        batch_id: p.batch_id,
        billing_month: p.billing_month,
      });
      toast.success('Marked as paid');
      await load();
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Could not mark paid');
    } finally {
      setBusyKey(null);
    }
  };

  const unmark = async (p: PaymentRow) => {
    if (p.payment_id == null) return;
    const key = `un-${p.payment_id}`;
    setBusyKey(key);
    try {
      await api.delete(`/api/admin/payments/${p.payment_id}/unmark`);
      toast.success('Payment unmarked');
      await load();
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Could not unmark');
    } finally {
      setBusyKey(null);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading payments…</p>
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
          Admin — payments
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Track monthly batch fees for batches you coach.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Billing month
          <input
            type="month"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Batch
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="min-w-[180px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">All batches</option>
            {batchOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-w-[140px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm font-semibold hover:bg-muted/60 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!payments.length}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {summary && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Students</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{summary.total_students}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[hsl(var(--green-medium))]">
              {summary.paid_count}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{summary.pending_count}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overdue</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-destructive">{summary.overdue_count}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Collected</p>
            <p className="mt-1 flex items-center gap-1.5 text-xl font-bold tabular-nums text-foreground">
              <IndianRupee className="h-5 w-5 shrink-0 opacity-70" />
              {formatInr(summary.total_collected)}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Student</th>
                <th className="px-4 py-3 text-left font-semibold">Batch</th>
                <th className="px-4 py-3 text-right font-semibold">Fee</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Paid at</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const rowBusy = busyKey === `${p.student_id}-${p.batch_id}`;
                const unBusy = busyKey === `un-${p.payment_id}`;
                return (
                  <tr key={`${p.student_id}-${p.batch_id}-${p.billing_month}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{p.student_name}</p>
                      <p className="text-xs text-muted-foreground">@{p.student_username}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{p.batch_name}</p>
                      <p className="text-xs text-muted-foreground">#{p.batch_id}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {formatInr(p.monthly_fee)}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'paid' && (
                        <span className="rounded-full bg-[hsl(var(--green-very-light))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--green-medium))]">
                          Paid
                        </span>
                      )}
                      {p.status === 'pending' && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Pending
                        </span>
                      )}
                      {p.status === 'overdue' && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.paid_at ? new Date(p.paid_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {p.status !== 'paid' && (
                          <button
                            type="button"
                            disabled={rowBusy || unBusy}
                            onClick={() => void markPaid(p)}
                            className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
                          >
                            {rowBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Mark paid'}
                          </button>
                        )}
                        {p.status === 'paid' && p.payment_id != null && (
                          <button
                            type="button"
                            disabled={rowBusy || unBusy}
                            onClick={() => void unmark(p)}
                            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60 disabled:opacity-50"
                          >
                            {unBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Unmark'}
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
        {payments.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No payment rows for these filters.</p>
        )}
      </div>
    </div>
  );
}
