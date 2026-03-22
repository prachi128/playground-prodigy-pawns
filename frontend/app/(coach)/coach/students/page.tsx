// app/(coach)/coach/students/page.tsx - Student Management Page

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import {
  Users,
  Search,
  Award,
  Eye,
  TrendingUp,
  AlertCircle,
  Zap,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { batchAPI, type Batch } from '@/lib/api';

interface Student {
  id: number;
  username: string;
  email: string;
  xp: number;
  created_at: string;
  last_active: string;
  total_puzzles_attempted: number;
  total_puzzles_solved: number;
  success_rate: number;
  days_since_active?: number;
}

/** Sortable numeric columns (table headers map to these Student keys). */
type StudentSortCol = 'xp' | 'total_puzzles_solved' | 'success_rate';

interface ClassOverview {
  total_students: number;
  average_xp: number;
  most_active: { id: number; username: string; xp: number }[];
  needs_attention: { id: number; username: string; xp: number }[];
}

const statCard =
  'rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md';

const PAGE_SIZE = 10;

function daysSinceActive(s: Student): number {
  if (typeof s.days_since_active === 'number') return s.days_since_active;
  if (s.last_active) {
    const t = new Date(s.last_active).getTime();
    if (!Number.isNaN(t)) return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  }
  return 0;
}

function formatLastActiveLabel(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function lastActiveClass(days: number): string {
  if (days > 7) return 'font-semibold text-destructive';
  if (days > 3) return 'font-semibold text-[hsl(var(--gold-dark))]';
  return 'font-semibold text-[hsl(var(--green-medium))]';
}

export default function StudentsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [students, setStudents] = useState<Student[]>([]);
  const [overview, setOverview] = useState<ClassOverview | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [awardingXP, setAwardingXP] = useState<number | null>(null);
  const [xpAmounts, setXpAmounts] = useState<Record<number, number>>({});
  const [page, setPage] = useState(1);
  const [atRiskFilter, setAtRiskFilter] = useState(false);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [batchStudentIds, setBatchStudentIds] = useState<Set<number>>(() => new Set());
  const [batchStudentsLoading, setBatchStudentsLoading] = useState(false);

  const [sortCol, setSortCol] = useState<StudentSortCol | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coach' && user?.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [isAuthenticated, user, router]);

  const loadData = async () => {
    setIsLoading(true);
    const results = await Promise.allSettled([
      api.get('/api/coach/students'),
      api.get('/api/coach/students/stats/overview'),
      batchAPI.list(),
    ]);

    if (results[0].status === 'fulfilled') {
      setStudents(results[0].value.data);
    } else {
      toast.error('Failed to load students');
    }
    if (results[1].status === 'fulfilled') {
      setOverview(results[1].value.data);
    }
    if (results[2].status === 'fulfilled') {
      setBatches(results[2].value);
    } else {
      toast.error('Failed to load batches');
      setBatches([]);
    }
    setIsLoading(false);
  };

  const awardXP = async (studentId: number, amount: number) => {
    setAwardingXP(studentId);
    try {
      await api.post(`/api/coach/students/${studentId}/award-xp?xp_amount=${amount}`);
      toast.success(`Awarded ${amount} XP!`);
      loadData();
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to award XP');
    } finally {
      setAwardingXP(null);
    }
  };

  const viewStudent = (studentId: number) => {
    router.push(`/coach/students/${studentId}`);
  };

  const atRiskIds = useMemo(() => {
    const ids = new Set<number>();
    overview?.needs_attention.forEach((n) => ids.add(n.id));
    return ids;
  }, [overview]);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (atRiskFilter && atRiskIds.size > 0) {
      list = list.filter((s) => atRiskIds.has(s.id));
    }
    if (selectedBatchId !== null) {
      if (batchStudentsLoading) {
        list = [];
      } else {
        list = list.filter((s) => batchStudentIds.has(s.id));
      }
    }
    const q = searchTerm.toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.username.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q),
      );
    }
    if (sortCol) {
      const mult = sortDir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        const va = a[sortCol];
        const vb = b[sortCol];
        if (va < vb) return -1 * mult;
        if (va > vb) return 1 * mult;
        return 0;
      });
    }
    return list;
  }, [
    students,
    atRiskFilter,
    atRiskIds,
    selectedBatchId,
    batchStudentIds,
    batchStudentsLoading,
    searchTerm,
    sortCol,
    sortDir,
  ]);

  const handleBatchSelect = async (value: string) => {
    if (value === '') {
      setSelectedBatchId(null);
      setBatchStudentIds(new Set());
      return;
    }
    const id = Number(value);
    if (Number.isNaN(id)) return;

    setSelectedBatchId(id);
    setBatchStudentIds(new Set());
    setBatchStudentsLoading(true);
    try {
      const roster = await batchAPI.listStudents(id);
      setBatchStudentIds(new Set(roster.map((r) => r.student_id)));
    } catch {
      toast.error('Failed to load batch roster');
      setSelectedBatchId(null);
      setBatchStudentIds(new Set());
    } finally {
      setBatchStudentsLoading(false);
    }
  };

  const handleSortHeaderClick = (col: StudentSortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const totalFiltered = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [searchTerm, atRiskFilter, selectedBatchId]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);
  const pageStart = totalFiltered === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = totalFiltered === 0 ? 0 : Math.min(safePage * PAGE_SIZE, totalFiltered);
  const paginatedStudents = filteredStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  if (isLoading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading students…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-4 border-b border-border/80 pb-4">
        <h1 className="font-heading flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          <Users className="h-7 w-7 shrink-0 text-primary sm:h-8 sm:w-8" aria-hidden />
          Student management
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          View rosters, progress, and award bonus XP—same coach styling as the rest of your console.
        </p>
      </div>

      {overview && (
        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className={statCard}>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--blue-light))]">
                <Users className="h-5 w-5 text-[hsl(var(--blue-dark))]" />
              </div>
              <h3 className="text-sm font-semibold text-muted-foreground">Total students</h3>
            </div>
            <p className="font-heading text-3xl font-bold text-[hsl(var(--blue-dark))]">
              {overview.total_students}
            </p>
          </div>

          <div className={statCard}>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--green-very-light))]">
                <TrendingUp className="h-5 w-5 text-[hsl(var(--green-medium))]" />
              </div>
              <h3 className="text-sm font-semibold text-muted-foreground">Avg XP</h3>
            </div>
            <p className="font-heading text-3xl font-bold text-[hsl(var(--green-medium))]">
              {overview.average_xp}
            </p>
          </div>

          <div className={statCard}>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--gold-light))]">
                <Zap className="h-5 w-5 text-[hsl(var(--gold-dark))]" />
              </div>
              <h3 className="text-sm font-semibold text-muted-foreground">Most active</h3>
            </div>
            <p className="font-heading text-xl font-bold text-[hsl(var(--gold-dark))]">
              {overview.most_active[0]?.username || 'None'}
            </p>
          </div>

          <button
            type="button"
            disabled={overview.needs_attention.length === 0}
            onClick={() => setAtRiskFilter(true)}
            className={`${statCard} w-full text-left transition-colors ${
              overview.needs_attention.length > 0
                ? 'cursor-pointer hover:border-destructive/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                : 'cursor-not-allowed opacity-60'
            }`}
          >
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--red-light))]">
                <AlertCircle className="h-5 w-5 text-[hsl(var(--red-medium))]" />
              </div>
              <h3 className="text-sm font-semibold text-muted-foreground">Need attention</h3>
            </div>
            <p className="font-heading text-3xl font-bold text-[hsl(var(--red-medium))]">
              {overview.needs_attention.length}
            </p>
            {overview.needs_attention.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">Click to filter the table</p>
            )}
          </button>
        </div>
      )}

      {atRiskFilter && (
        <div
          className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3"
          role="status"
        >
          <p className="text-sm font-medium text-foreground">
            Showing at-risk students
            {overview && overview.needs_attention.length > 0 && (
              <span className="text-muted-foreground">
                {' '}
                ({overview.needs_attention.length} in overview)
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setAtRiskFilter(false)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            aria-label="Clear at-risk filter"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <label htmlFor="batch-filter" className="mb-2 block text-sm font-semibold text-foreground">
            Batch
          </label>
          <div className="relative max-w-md">
            <select
              id="batch-filter"
              value={selectedBatchId ?? ''}
              onChange={(e) => void handleBatchSelect(e.target.value)}
              disabled={batchStudentsLoading}
              className={`w-full appearance-none rounded-lg border border-input bg-background py-2.5 pl-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70 ${batchStudentsLoading ? 'pr-14' : 'pr-12'}`}
            >
              <option value="">All batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {!b.is_active ? ' (archived)' : ''}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5"
              aria-hidden
            >
              {batchStudentsLoading && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              )}
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by name or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(var(--sidebar-background))] text-sidebar-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Student</th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSortHeaderClick('xp')}
                    className="inline-flex items-center gap-1 rounded-md font-semibold transition-colors hover:text-sidebar-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    aria-sort={
                      sortCol === 'xp' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                  >
                    XP
                    {sortCol === 'xp' && <span aria-hidden>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSortHeaderClick('total_puzzles_solved')}
                    className="inline-flex items-center gap-1 rounded-md font-semibold transition-colors hover:text-sidebar-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    aria-sort={
                      sortCol === 'total_puzzles_solved'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    Puzzles
                    {sortCol === 'total_puzzles_solved' && (
                      <span aria-hidden>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSortHeaderClick('success_rate')}
                    className="inline-flex items-center gap-1 rounded-md font-semibold transition-colors hover:text-sidebar-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    aria-sort={
                      sortCol === 'success_rate'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    Success
                    {sortCol === 'success_rate' && (
                      <span aria-hidden>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold">Last active</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student, index) => {
                const rowIndex = (safePage - 1) * PAGE_SIZE + index;
                return (
                <tr
                  key={student.id}
                  className={`border-t border-border transition-colors hover:bg-muted/40 ${
                    rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/coach/students/${student.id}`}
                      className="block rounded-md p-1 -m-1 transition-colors hover:bg-muted/60"
                    >
                      <p className="font-semibold text-primary hover:text-primary/90">{student.username}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[hsl(var(--gold-medium))]" />
                      <span className="font-semibold text-[hsl(var(--gold-dark))]">{student.xp}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {student.total_puzzles_solved}/{student.total_puzzles_attempted}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        student.success_rate >= 70
                          ? 'text-[hsl(var(--green-medium))]'
                          : student.success_rate >= 50
                            ? 'text-[hsl(var(--gold-dark))]'
                            : 'text-[hsl(var(--red-medium))]'
                      }`}
                    >
                      {student.success_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={lastActiveClass(daysSinceActive(student))}>
                      {formatLastActiveLabel(daysSinceActive(student))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => viewStudent(student.id)}
                        className="rounded-lg border border-border bg-muted/50 p-2 transition-colors hover:bg-muted"
                        title="View details"
                      >
                        <Eye className="h-4 w-4 text-[hsl(var(--blue-dark))]" />
                      </button>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={xpAmounts[student.id] ?? 10}
                          onChange={(e) => {
                            const raw = e.target.valueAsNumber;
                            if (Number.isNaN(raw)) {
                              setXpAmounts((prev) => {
                                const next = { ...prev };
                                delete next[student.id];
                                return next;
                              });
                              return;
                            }
                            setXpAmounts((prev) => ({
                              ...prev,
                              [student.id]: Math.min(100, Math.max(1, Math.round(raw))),
                            }));
                          }}
                          className="h-8 w-14 shrink-0 rounded-md border border-border bg-background py-0 text-center text-xs text-foreground [appearance:textfield] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          aria-label={`XP amount for ${student.username}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            awardXP(student.id, xpAmounts[student.id] ?? 10)
                          }
                          disabled={awardingXP === student.id}
                          className="rounded-lg border border-border bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50"
                          title={`Award ${xpAmounts[student.id] ?? 10} XP`}
                        >
                          {awardingXP === student.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Award className="h-4 w-4 text-[hsl(var(--gold-dark))]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalFiltered === 0 && (
          <div className="border-t border-border py-12 text-center">
            <p className="text-muted-foreground">No students found</p>
          </div>
        )}

        {totalFiltered > 0 && (
          <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-medium text-foreground">
                {pageStart}–{pageEnd}
              </span>{' '}
              of <span className="font-medium text-foreground">{totalFiltered}</span> students
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
