// app/(coach)/admin/payments/page.tsx — all-students dues + class billing

'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  IndianRupee,
  Shield,
} from 'lucide-react';

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface PaymentHistoryItem {
  id: number;
  billing_month: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  recorded_by: 'parent_stripe' | 'admin_manual' | string;
}

interface PaymentRow {
  student_id: number;
  student_name: string;
  student_username: string;
  batch_id: number | null;
  batch_name: string;
  coach_id: number | null;
  coach_name: string | null;
  is_enrollment_active: boolean;
  joined_at: string | null;
  monthly_fee: number;
  fee_per_class: number;
  expected_classes: number;
  attended_classes: number;
  billable_class_count: number;
  billable_class_count_source: 'auto' | 'admin_override' | string;
  calculated_amount: number;
  amount_override: number | null;
  final_amount: number;
  billing_month: string;
  status: 'paid' | 'pending' | 'overdue';
  paid_at: string | null;
  payment_id: number | null;
  payment_amount: number | null;
  current_due_amount: number;
  pending_amount_total: number;
  pending_months_count: number;
  overdue_months_count: number;
  oldest_pending_month: string | null;
  pending_months: string[];
  payment_history: PaymentHistoryItem[];
  notes: string | null;
}

interface PaymentSummary {
  total_students: number;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
  total_collected: number;
  total_pending_amount: number;
  students_with_pending_balance: number;
  billing_month: string;
}

interface PaymentsPayload {
  summary: PaymentSummary;
  payments: PaymentRow[];
}

interface BatchOption {
  id: number;
  name: string;
}

function defaultBillingMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function escapeCsvCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function rowKey(p: PaymentRow): string {
  return `${p.student_id}-${p.batch_id ?? 'none'}-${p.billing_month}`;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingMonth, setBillingMonth] = useState(defaultBillingMonth);
  const [batchId, setBatchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draftClasses, setDraftClasses] = useState<Record<string, string>>({});
  const [draftFees, setDraftFees] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (billingMonth) params.billing_month = billingMonth;
      if (batchId.trim()) params.batch_id = parseInt(batchId, 10);
      if (statusFilter) params.status = statusFilter;
      const res = await api.get<PaymentsPayload>('/api/admin/payments', { params });
      setSummary(res.data.summary);
      const rows = res.data.payments ?? [];
      setPayments(rows);
      const nextClasses: Record<string, string> = {};
      const nextFees: Record<string, string> = {};
      for (const row of rows) {
        const key = rowKey(row);
        nextClasses[key] = String(row.billable_class_count);
        nextFees[key] = String(row.amount_override ?? row.final_amount);
      }
      setDraftClasses(nextClasses);
      setDraftFees(nextFees);
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

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    api
      .get<BatchOption[]>('/api/batches')
      .then((res) => {
        const list = (res.data ?? []).map((b) => ({ id: b.id, name: b.name }));
        setBatches(list.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setBatches([]));
  }, [isAuthenticated, user?.role]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (p) =>
        p.student_name.toLowerCase().includes(q) ||
        p.student_username.toLowerCase().includes(q) ||
        p.batch_name.toLowerCase().includes(q) ||
        (p.coach_name ?? '').toLowerCase().includes(q),
    );
  }, [payments, search]);

  const exportCsv = () => {
    const headers = [
      'student_id',
      'student_name',
      'batch_name',
      'coach_name',
      'expected_classes',
      'attended_classes',
      'billable_class_count',
      'monthly_fee',
      'fee_per_class',
      'calculated_amount',
      'amount_override',
      'final_amount',
      'status',
      'pending_months_count',
      'pending_amount_total',
      'billing_month',
    ];
    const lines = [
      headers.join(','),
      ...filteredPayments.map((p) =>
        [
          p.student_id,
          escapeCsvCell(p.student_name),
          escapeCsvCell(p.batch_name),
          escapeCsvCell(p.coach_name ?? ''),
          p.expected_classes,
          p.attended_classes,
          p.billable_class_count,
          p.monthly_fee,
          p.fee_per_class,
          p.calculated_amount,
          p.amount_override ?? '',
          p.final_amount,
          p.status,
          p.pending_months_count,
          p.pending_amount_total,
          p.billing_month,
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

  const saveAdjustment = async (
    p: PaymentRow,
    payload: {
      billable_class_count?: number;
      amount_override?: number | null;
      clear_amount_override?: boolean;
    },
  ) => {
    if (p.batch_id == null) {
      toast.error('Assign the student to a batch before editing billing');
      return;
    }
    const key = rowKey(p);
    setBusyKey(key);
    try {
      await api.patch('/api/admin/payments/billing-adjustment', {
        student_id: p.student_id,
        batch_id: p.batch_id,
        billing_month: p.billing_month,
        ...payload,
      });
      toast.success('Billing updated');
      await load();
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Could not save billing');
    } finally {
      setBusyKey(null);
    }
  };

  const markPaid = async (p: PaymentRow) => {
    if (p.batch_id == null) {
      toast.error('Assign the student to a batch before marking paid');
      return;
    }
    const key = `pay-${rowKey(p)}`;
    setBusyKey(key);
    try {
      await api.post('/api/admin/payments/mark-paid', {
        student_id: p.student_id,
        batch_id: p.batch_id,
        billing_month: p.billing_month,
        amount: p.final_amount,
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
          Payments
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
          All students with expected vs attended classes, editable billable class count, and auto-calculated fees.
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
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
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
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Student, batch, coach…"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
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
          disabled={!filteredPayments.length}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {summary && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Collected</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{formatInr(summary.total_collected)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending total</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-destructive">
              {formatInr(summary.total_pending_amount)}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="w-8 px-2 py-3" />
                <th className="px-3 py-3 text-left font-semibold">Student</th>
                <th className="px-3 py-3 text-left font-semibold">Batch</th>
                <th className="px-3 py-3 text-center font-semibold">Expected</th>
                <th className="px-3 py-3 text-center font-semibold">Attended</th>
                <th className="px-3 py-3 text-center font-semibold">Billable</th>
                <th className="px-3 py-3 text-right font-semibold">Monthly fee</th>
                <th className="px-3 py-3 text-right font-semibold">Due amount</th>
                <th className="px-3 py-3 text-left font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => {
                const key = rowKey(p);
                const isOpen = expanded === key;
                const rowBusy = busyKey === key || busyKey === `pay-${key}` || busyKey === `un-${p.payment_id}`;
                return (
                  <Fragment key={key}>
                    <tr className="border-b border-border align-top">
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : key)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={isOpen ? 'Hide history' : 'Show history'}
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-foreground">{p.student_name}</p>
                        <p className="text-xs text-muted-foreground">@{p.student_username}</p>
                        {p.coach_name && (
                          <p className="mt-1 text-[11px] text-muted-foreground">Coach: {p.coach_name}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-foreground">{p.batch_name}</p>
                        {!p.is_enrollment_active && p.batch_id != null && (
                          <p className="text-[11px] text-muted-foreground">Enrollment inactive</p>
                        )}
                        {p.batch_id == null && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">No batch assigned</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums">{p.expected_classes}</td>
                      <td className="px-3 py-3 text-center tabular-nums">{p.attended_classes}</td>
                      <td className="px-3 py-3">
                        <div className="mx-auto flex max-w-[110px] flex-col items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={draftClasses[key] ?? String(p.billable_class_count)}
                            disabled={p.batch_id == null || rowBusy}
                            onChange={(e) =>
                              setDraftClasses((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="w-20 rounded-md border border-border bg-background px-2 py-1 text-center text-sm tabular-nums"
                          />
                          {p.billable_class_count_source === 'admin_override' && (
                            <span className="text-[10px] text-muted-foreground">override</span>
                          )}
                          <button
                            type="button"
                            disabled={p.batch_id == null || rowBusy}
                            onClick={() => {
                              const value = parseInt(draftClasses[key] ?? '', 10);
                              if (Number.isNaN(value) || value < 0) {
                                toast.error('Enter a valid class count');
                                return;
                              }
                              void saveAdjustment(p, { billable_class_count: value });
                            }}
                            className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-40"
                          >
                            Save
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <p className="tabular-nums text-foreground">{formatInr(p.monthly_fee)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatInr(p.fee_per_class)} / class
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="ml-auto flex max-w-[140px] flex-col items-end gap-1">
                          <div className="relative">
                            <IndianRupee className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={draftFees[key] ?? String(p.final_amount)}
                              disabled={p.batch_id == null || rowBusy}
                              onChange={(e) =>
                                setDraftFees((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              className="w-28 rounded-md border border-border bg-background py-1 pl-7 pr-2 text-right text-sm tabular-nums"
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Auto: {formatInr(p.calculated_amount)}
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={p.batch_id == null || rowBusy}
                              onClick={() => {
                                const value = parseFloat(draftFees[key] ?? '');
                                if (Number.isNaN(value) || value < 0) {
                                  toast.error('Enter a valid fee');
                                  return;
                                }
                                void saveAdjustment(p, { amount_override: value });
                              }}
                              className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-40"
                            >
                              Save fee
                            </button>
                            {p.amount_override != null && (
                              <button
                                type="button"
                                disabled={rowBusy}
                                onClick={() =>
                                  void saveAdjustment(p, { clear_amount_override: true })
                                }
                                className="text-[11px] font-semibold text-muted-foreground hover:underline disabled:opacity-40"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
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
                        {p.pending_months_count > 0 && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {p.pending_months_count} mo · {formatInr(p.pending_amount_total)}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {p.status !== 'paid' && (
                            <button
                              type="button"
                              disabled={p.batch_id == null || rowBusy}
                              onClick={() => void markPaid(p)}
                              className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
                            >
                              {busyKey === `pay-${key}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                'Mark paid'
                              )}
                            </button>
                          )}
                          {p.status === 'paid' && p.payment_id != null && (
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={() => void unmark(p)}
                              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60 disabled:opacity-50"
                            >
                              {busyKey === `un-${p.payment_id}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                'Unmark'
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-border bg-muted/20">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Payment history
                              </p>
                              {p.payment_history?.length ? (
                                <div className="overflow-hidden rounded-lg border border-border">
                                  <table className="w-full text-xs">
                                    <thead className="bg-muted/40">
                                      <tr>
                                        <th className="px-2 py-1.5 text-left">Month</th>
                                        <th className="px-2 py-1.5 text-right">Amount</th>
                                        <th className="px-2 py-1.5 text-left">Status</th>
                                        <th className="px-2 py-1.5 text-left">Via</th>
                                        <th className="px-2 py-1.5 text-left">Paid at</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {p.payment_history.map((h) => (
                                        <tr key={h.id} className="border-t border-border">
                                          <td className="px-2 py-1.5">{h.billing_month}</td>
                                          <td className="px-2 py-1.5 text-right tabular-nums">
                                            {formatInr(h.amount)}
                                          </td>
                                          <td className="px-2 py-1.5 capitalize">{h.status}</td>
                                          <td className="px-2 py-1.5">
                                            {h.recorded_by === 'parent_stripe' ? 'Stripe' : 'Admin'}
                                          </td>
                                          <td className="px-2 py-1.5 text-muted-foreground">
                                            {h.paid_at ? new Date(h.paid_at).toLocaleString() : '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No payment history yet.</p>
                              )}
                            </div>
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Dues detail
                              </p>
                              <ul className="space-y-1 text-xs text-muted-foreground">
                                <li>
                                  Fee formula: billable classes × (monthly fee ÷ expected classes)
                                </li>
                                <li>
                                  Current month due:{' '}
                                  <span className="font-semibold text-foreground">
                                    {formatInr(p.current_due_amount)}
                                  </span>
                                </li>
                                {p.oldest_pending_month && (
                                  <li>Oldest unpaid month: {p.oldest_pending_month}</li>
                                )}
                                {p.pending_months?.length > 0 && (
                                  <li>Pending months: {p.pending_months.join(', ')}</li>
                                )}
                                {p.notes && <li>Notes: {p.notes}</li>}
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredPayments.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No students match these filters.
          </p>
        )}
      </div>
    </div>
  );
}
