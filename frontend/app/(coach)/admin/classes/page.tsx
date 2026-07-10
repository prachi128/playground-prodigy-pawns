// app/(coach)/admin/classes/page.tsx — Academy-wide class management

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { adminAPI, type AdminBatch } from '@/lib/api';
import { adminClassDetailPath } from '@/lib/admin-class-path';
import { STUDENT_PAGE_SIZE } from '@/lib/student-table-utils';

interface CoachOption {
  id: number;
  username: string;
  full_name: string;
}

function formatInr(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminClassesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<AdminBatch[]>([]);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [coachFilter, setCoachFilter] = useState('');
  const [showArchived, setShowArchived] = useState(true);
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchList, coachesRes] = await Promise.all([
        adminAPI.listBatches({ include_inactive: showArchived }),
        api.get('/api/admin/coaches'),
      ]);
      setBatches(batchList);
      setCoaches(Array.isArray(coachesRes.data) ? coachesRes.data : []);
    } catch {
      toast.error('Failed to load classes');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let list = batches;
    if (coachFilter) {
      const coachId = Number(coachFilter);
      if (!Number.isNaN(coachId)) {
        list = list.filter((b) => b.coach_id === coachId);
      }
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.description ?? '').toLowerCase().includes(q) ||
          (b.schedule ?? '').toLowerCase().includes(q) ||
          (b.coach_full_name ?? '').toLowerCase().includes(q) ||
          (b.coach_username ?? '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [batches, search, coachFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / STUDENT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * STUDENT_PAGE_SIZE, safePage * STUDENT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, coachFilter, showArchived]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading academy classes…</p>
        </div>
      </div>
    );
  }

  const activeCount = batches.filter((b) => b.is_active).length;

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="font-heading flex items-center gap-2 text-foreground">
          <Shield className="h-5 w-5 text-amber-600" aria-hidden />
          All classes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeCount} active class{activeCount === 1 ? '' : 'es'} across the academy. Open a class
          to manage students, fees, and payments.
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="coach-filter" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Coach
          </label>
          <select
            id="coach-filter"
            value={coachFilter}
            onChange={(e) => setCoachFilter(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm sm:max-w-xs"
          >
            <option value="">All coaches</option>
            {coaches.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.full_name || c.username}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-[2]">
          <label htmlFor="class-search" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="class-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Class name, coach, or schedule…"
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-4 text-sm"
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-input"
          />
          Show archived
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">Class</th>
                <th className="px-3 py-3 text-left font-semibold">Coach</th>
                <th className="px-3 py-3 text-left font-semibold">Schedule</th>
                <th className="px-3 py-3 text-left font-semibold">Students</th>
                <th className="px-3 py-3 text-left font-semibold">Monthly fee</th>
                <th className="px-3 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((batch, index) => (
                <tr
                  key={batch.id}
                  className={`cursor-pointer border-t border-border transition-colors hover:bg-muted/40 ${
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  }`}
                  onClick={() => router.push(adminClassDetailPath(batch.id))}
                >
                  <td className="px-3 py-3">
                    <p className="font-medium text-primary">{batch.name}</p>
                    {batch.description ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {batch.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-foreground">
                    {batch.coach_full_name || batch.coach_username || '—'}
                  </td>
                  <td className="max-w-[12rem] px-3 py-3 text-muted-foreground">
                    <span className="line-clamp-2">{batch.schedule || '—'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 text-foreground">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {batch.student_count ?? 0}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-foreground">
                    {formatInr(batch.monthly_fee)}
                  </td>
                  <td className="px-3 py-3">
                    {batch.is_active ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Archived
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="border-t border-border py-12 text-center">
            <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-muted-foreground">No classes match this view.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-medium text-foreground">
                {(safePage - 1) * STUDENT_PAGE_SIZE + 1}–
                {Math.min(safePage * STUDENT_PAGE_SIZE, filtered.length)}
              </span>{' '}
              of <span className="font-medium text-foreground">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Coaches create and teach classes from{' '}
        <Link href="/coach/batches" className="font-medium text-primary hover:underline">
          coach mode → My classes
        </Link>
        .
      </p>
    </div>
  );
}
