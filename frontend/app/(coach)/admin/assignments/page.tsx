// app/(coach)/admin/assignments/page.tsx — Academy-wide assignment oversight

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ListChecks,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
  User,
  BookOpen,
  Clock,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { adminAPI, type AdminAssignment } from '@/lib/api';
import { adminAssignmentDetailPath } from '@/lib/admin-assignment-path';
import {
  formatAssignmentDate,
  isAssignmentDueSoon,
  isAssignmentOverdue,
} from '@/lib/assignment-ui';
import { STUDENT_PAGE_SIZE } from '@/lib/student-table-utils';

interface CoachOption {
  id: number;
  username: string;
  full_name: string;
}

export default function AdminAssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [coachFilter, setCoachFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'inactive'>('active');
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        coach_id?: number;
        is_active?: boolean;
        search?: string;
      } = {};
      if (coachFilter) {
        const coachId = Number(coachFilter);
        if (!Number.isNaN(coachId)) params.coach_id = coachId;
      }
      if (statusFilter === 'active') params.is_active = true;
      if (statusFilter === 'inactive') params.is_active = false;
      const q = search.trim();
      if (q) params.search = q;

      const [assignmentList, coachesRes] = await Promise.all([
        adminAPI.listAssignments(params),
        api.get('/api/admin/coaches'),
      ]);
      setAssignments(Array.isArray(assignmentList) ? assignmentList : []);
      setCoaches(Array.isArray(coachesRes.data) ? coachesRes.data : []);
    } catch {
      toast.error('Failed to load assignments');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [coachFilter, search, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = assignments;
    if (q) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.description ?? '').toLowerCase().includes(q) ||
          (a.batch_name ?? '').toLowerCase().includes(q) ||
          (a.student_name ?? '').toLowerCase().includes(q) ||
          (a.coach_full_name ?? '').toLowerCase().includes(q) ||
          (a.coach_username ?? '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [assignments, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / STUDENT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * STUDENT_PAGE_SIZE, safePage * STUDENT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, coachFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading academy assignments…</p>
        </div>
      </div>
    );
  }

  const activeCount = assignments.filter((a) => a.is_active).length;

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="font-heading flex items-center gap-2 text-foreground">
          <Shield className="h-5 w-5 text-amber-600" aria-hidden />
          Academy assignments
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeCount} active assignment{activeCount === 1 ? '' : 's'} across the academy. Coaches
          create and manage assignments from coach mode.
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
          <label htmlFor="assignment-search" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="assignment-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, coach, batch, or student…"
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-4 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pb-0.5">
          {(['active', 'all', 'inactive'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${
                statusFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">Assignment</th>
                <th className="px-3 py-3 text-left font-semibold">Coach</th>
                <th className="px-3 py-3 text-left font-semibold">Target</th>
                <th className="px-3 py-3 text-left font-semibold">Puzzles</th>
                <th className="px-3 py-3 text-left font-semibold">Due</th>
                <th className="px-3 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((assignment, index) => {
                const overdue = isAssignmentOverdue(assignment.due_date);
                const dueSoon = !overdue && isAssignmentDueSoon(assignment.due_date);
                return (
                  <tr
                    key={assignment.id}
                    className={`cursor-pointer border-t border-border transition-colors hover:bg-muted/40 ${
                      index % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                    }`}
                    onClick={() => router.push(adminAssignmentDetailPath(assignment.id))}
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold text-foreground">{assignment.title}</p>
                      {assignment.description ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {assignment.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <p className="font-medium text-foreground">
                        {assignment.coach_full_name || assignment.coach_username || '—'}
                      </p>
                      {assignment.coach_username ? (
                        <p className="text-xs">@{assignment.coach_username}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      {assignment.batch_id ? (
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {assignment.batch_name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {assignment.student_name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        {assignment.puzzle_count}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {assignment.due_date ? (
                        <span
                          className={`inline-flex items-center gap-1 ${
                            overdue ? 'font-medium text-destructive' : 'text-muted-foreground'
                          }`}
                        >
                          {overdue ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" />
                          )}
                          {formatAssignmentDate(assignment.due_date)}
                          {dueSoon ? (
                            <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                              Soon
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No deadline</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          assignment.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {assignment.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pageSlice.length === 0 ? (
          <div className="border-t border-border p-12 text-center">
            <ListChecks className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No assignments match your filters.</p>
          </div>
        ) : null}
      </div>

      {filtered.length > STUDENT_PAGE_SIZE ? (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Showing {(safePage - 1) * STUDENT_PAGE_SIZE + 1}–
            {Math.min(safePage * STUDENT_PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="text-muted-foreground">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
