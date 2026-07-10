// app/(coach)/admin/fees/page.tsx — monthly fee schedule per student

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, IndianRupee, Loader2, Receipt } from 'lucide-react';

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface FeeRow {
  student_id: number;
  student_name: string;
  student_username: string;
  batch_id: number | null;
  batch_name: string;
  expected_classes: number;
  expected_classes_source: 'default' | 'admin_override' | string;
  attended_classes: number;
  calculated_fee: number;
  fee_override: number | null;
  final_fee: number;
  billing_month: string;
}

interface FeesPayload {
  billing_month: string;
  fees: FeeRow[];
}

function defaultBillingMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function rowKey(f: FeeRow): string {
  return `${f.student_id}-${f.batch_id ?? 'none'}`;
}

export default function AdminFeesPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [billingMonth, setBillingMonth] = useState(defaultBillingMonth);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [draftExpected, setDraftExpected] = useState<Record<string, string>>({});
  const [draftFee, setDraftFee] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<FeesPayload>('/api/admin/fees', {
        params: { billing_month: billingMonth },
      });
      const rows = res.data.fees ?? [];
      setFees(rows);
      const nextExpected: Record<string, string> = {};
      const nextFee: Record<string, string> = {};
      for (const row of rows) {
        const key = rowKey(row);
        nextExpected[key] = String(row.expected_classes);
        nextFee[key] = String(row.fee_override ?? row.final_fee);
      }
      setDraftExpected(nextExpected);
      setDraftFee(nextFee);
    } catch {
      toast.error('Failed to load fees');
      setFees([]);
    } finally {
      setLoading(false);
    }
  }, [billingMonth]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    void load();
  }, [isAuthenticated, user, router, load]);

  const filteredFees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fees;
    return fees.filter(
      (f) =>
        f.student_name.toLowerCase().includes(q) ||
        f.student_username.toLowerCase().includes(q) ||
        f.batch_name.toLowerCase().includes(q),
    );
  }, [fees, search]);

  const saveAdjustment = async (
    f: FeeRow,
    payload: {
      expected_class_count?: number;
      fee_override?: number | null;
      clear_fee_override?: boolean;
    },
  ) => {
    if (f.batch_id == null) {
      toast.error('Assign the student to a batch before editing fees');
      return;
    }
    const key = rowKey(f);
    setBusyKey(key);
    try {
      await api.patch('/api/admin/fees/adjustment', {
        student_id: f.student_id,
        batch_id: f.batch_id,
        billing_month: f.billing_month,
        ...payload,
      });
      toast.success('Fees updated');
      await load();
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Could not save fees');
    } finally {
      setBusyKey(null);
    }
  };

  if (loading && fees.length === 0) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading fees…</p>
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
            <Receipt className="h-5 w-5" />
          </span>
          Fees
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
          Monthly fee per student. Expected classes default to 8 (₹2,500); 4–5 classes is ₹1,500.
          You can override expected classes and fee for any student.
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
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-semibold text-muted-foreground">
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Student or batch…"
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
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Student</th>
                <th className="px-4 py-3 text-left font-semibold">Batch</th>
                <th className="px-4 py-3 text-center font-semibold">Classes expected</th>
                <th className="px-4 py-3 text-center font-semibold">Classes attended</th>
                <th className="px-4 py-3 text-right font-semibold">Fee</th>
              </tr>
            </thead>
            <tbody>
              {filteredFees.map((f) => {
                const key = rowKey(f);
                const rowBusy = busyKey === key;
                return (
                  <tr key={key} className="border-b border-border align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{f.student_name}</p>
                      <p className="text-xs text-muted-foreground">@{f.student_username}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{f.batch_name}</p>
                      {f.batch_id == null && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">No batch assigned</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="mx-auto flex max-w-[120px] flex-col items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={draftExpected[key] ?? String(f.expected_classes)}
                          disabled={f.batch_id == null || rowBusy}
                          onChange={(e) =>
                            setDraftExpected((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="w-20 rounded-md border border-border bg-background px-2 py-1 text-center text-sm tabular-nums"
                        />
                        {f.expected_classes_source === 'admin_override' && (
                          <span className="text-[10px] text-muted-foreground">override</span>
                        )}
                        <button
                          type="button"
                          disabled={f.batch_id == null || rowBusy}
                          onClick={() => {
                            const value = parseInt(draftExpected[key] ?? '', 10);
                            if (Number.isNaN(value) || value < 0) {
                              toast.error('Enter a valid class count');
                              return;
                            }
                            void saveAdjustment(f, { expected_class_count: value });
                          }}
                          className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-foreground">
                      {f.attended_classes}
                    </td>
                    <td className="px-4 py-3">
                      <div className="ml-auto flex max-w-[150px] flex-col items-end gap-1">
                        <div className="relative">
                          <IndianRupee className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={draftFee[key] ?? String(f.final_fee)}
                            disabled={f.batch_id == null || rowBusy}
                            onChange={(e) =>
                              setDraftFee((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="w-32 rounded-md border border-border bg-background py-1 pl-7 pr-2 text-right text-sm tabular-nums"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Auto: {formatInr(f.calculated_fee)}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={f.batch_id == null || rowBusy}
                            onClick={() => {
                              const value = parseFloat(draftFee[key] ?? '');
                              if (Number.isNaN(value) || value < 0) {
                                toast.error('Enter a valid fee');
                                return;
                              }
                              void saveAdjustment(f, { fee_override: value });
                            }}
                            className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-40"
                          >
                            Save fee
                          </button>
                          {f.fee_override != null && (
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={() => void saveAdjustment(f, { clear_fee_override: true })}
                              className="text-[11px] font-semibold text-muted-foreground hover:underline disabled:opacity-40"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredFees.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No students match your search.
          </p>
        )}
      </div>
    </div>
  );
}
