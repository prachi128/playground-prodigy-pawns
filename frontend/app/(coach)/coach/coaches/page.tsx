// app/(coach)/coach/coaches/page.tsx - Admin coach activity overview

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import {
  UserCog,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, type CoachActivityRow } from '@/lib/api';
import { coachCoachProfilePath } from '@/lib/coach-coach-path';

type CoachSortCol =
  | 'name'
  | 'username'
  | 'batches'
  | 'students'
  | 'assignments'
  | 'sessions'
  | 'last_login'
  | 'status';

const PAGE_SIZE = 10;

function displayName(c: CoachActivityRow): string {
  return c.full_name?.trim() || c.username;
}

function isCoachActive(c: CoachActivityRow): boolean {
  return c.is_active !== false;
}

function statusSortKey(c: CoachActivityRow): number {
  return isCoachActive(c) ? 1 : 0;
}

function formatLastLogin(days: number | null | undefined): string {
  if (days == null) return '—';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function lastLoginClass(days: number | null | undefined): string {
  if (days == null) return 'text-muted-foreground';
  if (days <= 1) return 'coach-text-success';
  if (days <= 7) return 'text-foreground';
  if (days <= 14) return 'coach-text-warning';
  return 'coach-text-danger';
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
    <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">
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

export default function CoachesPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();

  const [coaches, setCoaches] = useState<CoachActivityRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [sortCol, setSortCol] = useState<CoachSortCol | null>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'admin') {
      router.replace('/coach');
      return;
    }
    void loadData();
  }, [isAuthenticated, user, authLoading, router]);

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
          case 'assignments':
            va = a.active_assignments;
            vb = b.active_assignments;
            break;
          case 'sessions':
            va = a.sessions_this_week;
            vb = b.sessions_this_week;
            break;
          case 'last_login':
            va = a.days_since_login ?? 9999;
            vb = b.days_since_login ?? 9999;
            break;
          case 'status':
            va = statusSortKey(a);
            vb = statusSortKey(b);
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
            <UserCog className="coach-text-link h-4 w-4 shrink-0" aria-hidden />
            Coaches
            {coaches.length > 0 && (
              <span className="coach-text-accent text-[13px] font-normal">({coaches.length})</span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track coach classes, assignments, sessions, and sign-in activity.
          </p>
        </div>
        <Link
          href="/coach/admin/coaches"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary"
        >
          <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Manage accounts
        </Link>
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
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <SortableHeader
                  label="Name"
                  col="name"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortHeaderClick}
                />
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
                <SortableHeader
                  label="Assignments"
                  col="assignments"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortHeaderClick}
                />
                <SortableHeader
                  label="Sessions (wk)"
                  col="sessions"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortHeaderClick}
                />
                <SortableHeader
                  label="Last sign-in"
                  col="last_login"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortHeaderClick}
                />
                <SortableHeader
                  label="Status"
                  col="status"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortHeaderClick}
                />
              </tr>
            </thead>
            <tbody>
              {paginatedCoaches.map((coach, index) => {
                const rowIndex = (safePage - 1) * PAGE_SIZE + index;
                return (
                  <tr
                    key={coach.id}
                    className={`border-t border-border transition-colors hover:bg-muted/40 ${
                      rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                    }`}
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={coachCoachProfilePath(coach.username)}
                        className="block rounded-md p-1 -m-1 transition-colors hover:bg-muted/60"
                      >
                        <p className="coach-text-link font-medium hover:underline">
                          {displayName(coach)}
                        </p>
                        <p className="text-xs text-muted-foreground">{coach.email}</p>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      @{coach.username}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-medium text-foreground">{coach.active_batches}</span>
                      {coach.total_batches > coach.active_batches && (
                        <span className="text-xs text-muted-foreground">
                          {' '}
                          / {coach.total_batches}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-medium text-foreground">{coach.active_students}</span>
                      {coach.primary_students > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {' '}
                          ({coach.primary_students} assigned)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-medium text-foreground">{coach.active_assignments}</span>
                      {coach.assignments_this_week > 0 && (
                        <span className="text-xs coach-text-success">
                          {' '}
                          +{coach.assignments_this_week} this wk
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-medium text-foreground">{coach.sessions_this_week}</span>
                      {coach.sessions_total > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {' '}
                          / {coach.sessions_total} total
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-3 font-medium whitespace-nowrap ${lastLoginClass(coach.days_since_login)}`}
                    >
                      {formatLastLogin(coach.days_since_login)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {isCoachActive(coach) ? (
                        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          Deactivated
                        </span>
                      )}
                    </td>
                  </tr>
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
    </div>
  );
}
