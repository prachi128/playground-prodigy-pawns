// app/(coach)/admin/coaches/page.tsx — Academy coach activity overview

'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  UserCog,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCheck,
  UserX,
  Users,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { adminAPI, type CoachActivityRow } from '@/lib/api';
import { adminCoachProfilePath } from '@/lib/admin-coach-path';
import ConfirmDialog from '@/components/ConfirmDialog';

type CoachSortCol =
  | 'name'
  | 'username'
  | 'batches'
  | 'students'
  ;

const PAGE_SIZE = 10;

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

function displayName(c: CoachActivityRow): string {
  return c.full_name?.trim() || c.username;
}

function isCoachActive(c: CoachActivityRow): boolean {
  return c.is_active !== false;
}

function SortableHeader({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
}: {
  label: string;
  col: CoachSortCol;
  sortCol: CoachSortCol | null;
  sortDir: 'asc' | 'desc';
  onSort: (col: CoachSortCol) => void;
}) {
  return (
    <th className="px-2.5 py-2.5 text-left font-semibold whitespace-nowrap">
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 rounded-md font-semibold transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-sort={
          sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
        }
      >
        {label}
        {sortCol === col && <span aria-hidden>{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<CoachActivityRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [rosterByCoach, setRosterByCoach] = useState<Record<number, CoachRoster>>({});
  const [rosterLoadingId, setRosterLoadingId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{
    id: number;
    username: string;
    action: 'deactivate' | 'reactivate';
  } | null>(null);

  const [sortCol, setSortCol] = useState<CoachSortCol | null>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await adminAPI.listCoachActivity();
      setCoaches(data);
    } catch {
      toast.error('Failed to load coaches');
      setCoaches([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCoaches = useMemo(() => {
    let list = coaches;
    if (statusFilter === 'active') {
      list = list.filter((c) => isCoachActive(c));
    } else if (statusFilter === 'inactive') {
      list = list.filter((c) => !isCoachActive(c));
    }

    const q = searchTerm.toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          displayName(c).toLowerCase().includes(q) ||
          c.username.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.batch_names ?? []).some((b) => b.toLowerCase().includes(q)),
      );
    }

    if (sortCol) {
      const mult = sortDir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        let va: string | number = 0;
        let vb: string | number = 0;
        switch (sortCol) {
          case 'name':
            va = displayName(a).toLowerCase();
            vb = displayName(b).toLowerCase();
            break;
          case 'username':
            va = a.username.toLowerCase();
            vb = b.username.toLowerCase();
            break;
          case 'batches':
            va = a.active_batches;
            vb = b.active_batches;
            break;
          case 'students':
            va = a.active_students;
            vb = b.active_students;
            break;
        }
        if (va < vb) return -1 * mult;
        if (va > vb) return 1 * mult;
        return displayName(a).localeCompare(displayName(b));
      });
    }
    return list;
  }, [coaches, searchTerm, statusFilter, sortCol, sortDir]);

  const handleSortHeaderClick = (col: CoachSortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === 'name' || col === 'username' ? 'asc' : 'desc');
    }
  };

  const totalFiltered = filteredCoaches.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);
  const pageStart = totalFiltered === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = totalFiltered === 0 ? 0 : Math.min(safePage * PAGE_SIZE, totalFiltered);
  const paginatedCoaches = filteredCoaches.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const runAction = async () => {
    if (!confirm) return;
    const { id, action } = confirm;
    setBusyId(id);
    try {
      if (action === 'deactivate') {
        await fetchCoachAction(id, 'deactivate');
        toast.success('Coach deactivated');
      } else {
        await fetchCoachAction(id, 'reactivate');
        toast.success('Coach reactivated');
      }
      setConfirm(null);
      await loadData();
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

  const fetchCoachAction = async (coachId: number, action: 'deactivate' | 'reactivate') => {
    const endpoint =
      action === 'deactivate'
        ? `/api/admin/coaches/${coachId}/deactivate`
        : `/api/admin/coaches/${coachId}/reactivate`;
    return adminAPIRequest(endpoint, 'put');
  };

  const loadCoachRoster = async (coachId: number) => {
    if (rosterByCoach[coachId]) {
      setExpanded((prev) => ({ ...prev, [coachId]: !prev[coachId] }));
      return;
    }
    setRosterLoadingId(coachId);
    try {
      const rows = await adminAPIRequest('/api/admin/coaches/roster', 'get', {
        coach_id: coachId,
        include_inactive: true,
      });
      const roster = Array.isArray(rows) ? (rows as CoachRoster[])[0] : null;
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
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading coaches…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5 text-amber-600" aria-hidden />
            Coaches
            {coaches.length > 0 && (
              <span className="coach-text-accent text-[13px] font-normal">({coaches.length})</span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track coach classes, assignments, sessions, and sign-in activity.
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="coach-status-filter" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Status
          </label>
          <div className="relative">
            <select
              id="coach-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full appearance-none rounded-lg border border-input bg-background py-2.5 pl-3 pr-12 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All coaches</option>
              <option value="active">Active only</option>
              <option value="inactive">Deactivated</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          </div>
        </div>
        <div className="min-w-0 flex-[2]">
          <label htmlFor="coach-search" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="coach-search"
              type="search"
              placeholder="Name, email, or class…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <SortableHeader
                  label="Name"
                  col="name"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortHeaderClick}
                />
                <th className="w-10 px-1.5 py-2.5 text-center font-semibold whitespace-nowrap"> </th>
                <SortableHeader
                  label="Username"
                  col="username"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortHeaderClick}
                />
                <SortableHeader
                  label="Classes"
                  col="batches"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortHeaderClick}
                />
                <SortableHeader
                  label="Students"
                  col="students"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortHeaderClick}
                />
                <th className="px-2.5 py-2.5 text-right font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCoaches.map((coach, index) => {
                const rowIndex = (safePage - 1) * PAGE_SIZE + index;
                const isExpanded = !!expanded[coach.id];
                const roster = rosterByCoach[coach.id];
                return (
                  <Fragment key={coach.id}>
                    <tr
                      className={`border-t border-border transition-colors hover:bg-muted/40 ${
                        rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                      }`}
                    >
                      <td className="min-w-0 px-2 py-2">
                        <Link
                          href={adminCoachProfilePath(coach.username)}
                          className="block rounded-md p-1 -m-1 transition-colors hover:bg-muted/60"
                        >
                          <p className="truncate coach-text-link font-medium hover:underline">
                            {displayName(coach)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{coach.email}</p>
                        </Link>
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        <button
                          type="button"
                          disabled={rosterLoadingId === coach.id}
                          onClick={() => void loadCoachRoster(coach.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50"
                          title={isExpanded ? 'Hide roster' : 'Show roster'}
                          aria-label={isExpanded ? 'Hide roster' : 'Show roster'}
                        >
                          {rosterLoadingId === coach.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">
                        @{coach.username}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className="font-medium text-foreground">{coach.active_batches}</span>
                        {coach.total_batches > coach.active_batches && (
                          <span className="text-xs text-muted-foreground">
                            {' '}
                            / {coach.total_batches}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className="font-medium text-foreground">{coach.active_students}</span>
                        {coach.primary_students > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {' '}
                            ({coach.primary_students} assigned)
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {isCoachActive(coach) ? (
                            <button
                              type="button"
                              disabled={busyId === coach.id}
                              onClick={() =>
                                setConfirm({ id: coach.id, username: coach.username, action: 'deactivate' })
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/15 disabled:opacity-50"
                            >
                              {busyId === coach.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserX className="h-3.5 w-3.5" />
                              )}
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === coach.id}
                              onClick={() =>
                                setConfirm({ id: coach.id, username: coach.username, action: 'reactivate' })
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
                            >
                              {busyId === coach.id ? (
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
                      <tr className="border-t border-border bg-muted/20">
                        <td colSpan={6} className="px-4 py-4">
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
                                          {batch.students.map((student) => (
                                            <tr key={student.id} className="border-b border-border/60 last:border-0">
                                              <td className="py-1.5 pr-2 text-foreground">
                                                {student.full_name || student.username}
                                              </td>
                                              <td className="py-1.5 pr-2 text-muted-foreground">@{student.username}</td>
                                              <td className="py-1.5 pr-2">
                                                {student.is_active ? 'Active account' : 'Deactivated account'}
                                                {!student.is_enrollment_active && (
                                                  <span className="text-muted-foreground">, enrollment inactive</span>
                                                )}
                                              </td>
                                              <td className="py-1.5 pr-2 capitalize text-muted-foreground">
                                                {student.payment_status}
                                              </td>
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

        {totalFiltered === 0 && (
          <div className="border-t border-border py-12 text-center">
            <p className="text-muted-foreground">No coaches found</p>
          </div>
        )}

        {totalFiltered > 0 && (
          <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-medium text-foreground">
                {pageStart}–{pageEnd}
              </span>{' '}
              of <span className="font-medium text-foreground">{totalFiltered}</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page <span className="font-semibold text-foreground">{safePage}</span> of{' '}
                <span className="font-semibold text-foreground">{totalPages}</span>
              </span>
              <div className="flex overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={safePage <= 1}
                  className="inline-flex h-9 w-9 items-center justify-center border-r border-border text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={safePage >= totalPages}
                  className="inline-flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
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

async function adminAPIRequest(
  url: string,
  method: 'get' | 'put',
  params?: Record<string, unknown>,
) {
  const response =
    method === 'get'
      ? await api.get(url, { params })
      : await api.put(url, null, { params });
  return response.data;
}
