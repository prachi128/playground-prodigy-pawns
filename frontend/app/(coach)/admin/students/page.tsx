// app/(coach)/admin/students/page.tsx — Academy-wide student management

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import {
  Users,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { adminStudentProfilePath } from '@/lib/admin-student-path';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  STUDENT_PAGE_SIZE,
  STUDENT_SKILL_ORDER,
  type StudentListRow,
  type StudentSortCol,
  studentDisplayName,
  studentAppRating,
  studentRatingSortKey,
  isStudentListRowActive,
} from '@/lib/student-table-utils';
interface CoachRow {
  id: number;
  username: string;
  full_name: string;
  is_active?: boolean;
}

function SortableHeader({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
}: {
  label: string;
  col: StudentSortCol;
  sortCol: StudentSortCol | null;
  sortDir: 'asc' | 'desc';
  onSort: (col: StudentSortCol) => void;
}) {
  return (
    <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 rounded-md font-semibold transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-sort={sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {label}
        {sortCol === col && <span aria-hidden>{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

export default function AdminStudentsPage() {
  const { user } = useAuthStore();

  const [students, setStudents] = useState<StudentListRow[]>([]);
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<StudentSortCol | null>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [assignBusyId, setAssignBusyId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{
    id: number;
    username: string;
    action: 'deactivate' | 'reactivate';
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = assignmentFilter === 'unassigned' ? { unassigned_only: true } : undefined;
      const [studentsRes, coachesRes] = await Promise.all([
        api.get('/api/admin/students', { params }),
        api.get('/api/admin/coaches'),
      ]);
      const loaded = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      setStudents(
        assignmentFilter === 'assigned'
          ? loaded.filter((s: StudentListRow) => (s.coach_id ?? null) !== null)
          : loaded,
      );
      const loadedCoaches = Array.isArray(coachesRes.data) ? coachesRes.data : [];
      if (user) {
        const adminOption = {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          is_active: user.is_active,
        };
        setCoaches(
          loadedCoaches.some((c: CoachRow) => c.id === adminOption.id)
            ? loadedCoaches
            : [adminOption, ...loadedCoaches],
        );
      } else {
        setCoaches(loadedCoaches);
      }
    } catch {
      toast.error('Failed to load students');
      setStudents([]);
      setCoaches([]);
    } finally {
      setIsLoading(false);
    }
  }, [assignmentFilter, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredStudents = useMemo(() => {
    let list = students;
    const q = searchTerm.toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          studentDisplayName(s).toLowerCase().includes(q) ||
          s.username.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q),
      );
    }
    if (sortCol) {
      const mult = sortDir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        let va: string | number = 0;
        let vb: string | number = 0;
        switch (sortCol) {
          case 'name':
            va = studentDisplayName(a).toLowerCase();
            vb = studentDisplayName(b).toLowerCase();
            break;
          case 'username':
            va = a.username.toLowerCase();
            vb = b.username.toLowerCase();
            break;
          case 'age':
            va = a.age ?? -1;
            vb = b.age ?? -1;
            break;
          case 'rating':
            va = studentRatingSortKey(a);
            vb = studentRatingSortKey(b);
            break;
          case 'batch':
            va = (a.batch_names ?? []).join(', ').toLowerCase();
            vb = (b.batch_names ?? []).join(', ').toLowerCase();
            break;
          case 'skill_level':
            va = STUDENT_SKILL_ORDER[a.skill_level ?? ''] ?? -1;
            vb = STUDENT_SKILL_ORDER[b.skill_level ?? ''] ?? -1;
            break;
          case 'attendance_pct':
            va = a.attendance_pct ?? -1;
            vb = b.attendance_pct ?? -1;
            break;
        }
        if (va < vb) return -1 * mult;
        if (va > vb) return 1 * mult;
        return studentDisplayName(a).localeCompare(studentDisplayName(b));
      });
    }
    return list;
  }, [students, searchTerm, sortCol, sortDir]);

  const handleSortHeaderClick = (col: StudentSortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === 'name' || col === 'username' || col === 'batch' ? 'asc' : 'desc');
    }
  };

  const totalFiltered = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / STUDENT_PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [searchTerm, assignmentFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const coachSelectValue = (student: StudentListRow) =>
    student.coach_id ? String(student.coach_id) : '__none__';

  const assignCoach = async (
    studentId: number,
    rawValue: string,
    previousCoachId: number | null | undefined,
    previousCoachUsername: string | null | undefined,
    previousCoachFullName: string | null | undefined,
  ) => {
    const coachId = rawValue === '__none__' || rawValue === '' ? null : Number(rawValue);
    if (coachId !== null && Number.isNaN(coachId)) {
      toast.error('Pick a valid coach');
      return;
    }
    if ((previousCoachId ?? null) === coachId) return;

    const nextCoach = coachId !== null ? coaches.find((c) => c.id === coachId) : null;
    setAssignBusyId(studentId);
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              coach_id: coachId,
              coach_username: nextCoach?.username ?? null,
              coach_full_name: nextCoach?.full_name ?? null,
              is_unassigned: coachId === null,
            }
          : s,
      ),
    );

    try {
      await api.put(`/api/admin/students/${studentId}/assign-coach`, { coach_id: coachId });
      toast.success('Coach assignment updated');
      if (assignmentFilter !== 'all') await loadData();
    } catch (err: unknown) {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? {
                ...s,
                coach_id: previousCoachId ?? null,
                coach_username: previousCoachUsername ?? null,
                coach_full_name: previousCoachFullName ?? null,
                is_unassigned: (previousCoachId ?? null) === null,
              }
            : s,
        ),
      );
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(detail || 'Failed to update coach assignment');
    } finally {
      setAssignBusyId(null);
    }
  };

  const runAction = async () => {
    if (!confirm) return;
    const { id, action } = confirm;
    setBusyId(id);
    try {
      if (action === 'deactivate') {
        await api.put(`/api/admin/students/${id}/deactivate`);
        toast.success('Student deactivated');
      } else {
        await api.put(`/api/admin/students/${id}/reactivate`);
        toast.success('Student reactivated');
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

  const safePage = Math.min(page, totalPages);
  const pageStart = totalFiltered === 0 ? 0 : (safePage - 1) * STUDENT_PAGE_SIZE + 1;
  const pageEnd = totalFiltered === 0 ? 0 : Math.min(safePage * STUDENT_PAGE_SIZE, totalFiltered);
  const paginatedStudents = filteredStudents.slice(
    (safePage - 1) * STUDENT_PAGE_SIZE,
    safePage * STUDENT_PAGE_SIZE,
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading academy students…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="font-heading flex items-center gap-2 text-foreground">
          <Shield className="h-5 w-5 text-amber-600" aria-hidden />
          Academy students
          {students.length > 0 && (
            <span className="text-[13px] font-normal text-muted-foreground">({students.length})</span>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All student accounts — assign coaches, manage enrollment, and open full profiles.
        </p>
        <div className="mt-4 inline-flex rounded-lg border border-border bg-card p-1">
          {(['all', 'assigned', 'unassigned'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setAssignmentFilter(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                assignmentFilter === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {key === 'all' ? 'All' : key === 'assigned' ? 'Assigned' : 'Unassigned'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label htmlFor="admin-student-search" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
          Search
        </label>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="admin-student-search"
            type="search"
            placeholder="Name, username, or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <SortableHeader label="Name" col="name" sortCol={sortCol} sortDir={sortDir} onSort={handleSortHeaderClick} />
                <SortableHeader label="Username" col="username" sortCol={sortCol} sortDir={sortDir} onSort={handleSortHeaderClick} />
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Status</th>
                <SortableHeader label="Rating" col="rating" sortCol={sortCol} sortDir={sortDir} onSort={handleSortHeaderClick} />
                <SortableHeader label="Batch" col="batch" sortCol={sortCol} sortDir={sortDir} onSort={handleSortHeaderClick} />
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Coach</th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student, index) => {
                const rowIndex = (safePage - 1) * STUDENT_PAGE_SIZE + index;
                const batchLabel =
                  student.batch_names && student.batch_names.length > 0
                    ? student.batch_names.join(', ')
                    : '—';
                const active = isStudentListRowActive(student);
                return (
                  <tr
                    key={student.id}
                    className={`border-t border-border transition-colors hover:bg-muted/40 ${
                      rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                    }`}
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={adminStudentProfilePath(student.username)}
                        className="block rounded-md p-1 -m-1 transition-colors hover:bg-muted/60"
                      >
                        <p className="font-medium text-primary hover:underline">
                          {studentDisplayName(student)}
                        </p>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">@{student.username}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {active ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-semibold text-foreground whitespace-nowrap">
                      {studentAppRating(student) ?? '—'}
                    </td>
                    <td className="max-w-[10rem] px-3 py-3 text-foreground">
                      <span className="line-clamp-2" title={batchLabel}>
                        {batchLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <select
                          value={coachSelectValue(student)}
                          onChange={(e) =>
                            void assignCoach(
                              student.id,
                              e.target.value,
                              student.coach_id,
                              student.coach_username,
                              student.coach_full_name,
                            )
                          }
                          disabled={assignBusyId === student.id}
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
                        {assignBusyId === student.id ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {active ? (
                          <button
                            type="button"
                            disabled={busyId === student.id}
                            onClick={() =>
                              setConfirm({
                                id: student.id,
                                username: student.username,
                                action: 'deactivate',
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/15 disabled:opacity-50"
                          >
                            {busyId === student.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserX className="h-3.5 w-3.5" />
                            )}
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === student.id}
                            onClick={() =>
                              setConfirm({
                                id: student.id,
                                username: student.username,
                                action: 'reactivate',
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
                          >
                            {busyId === student.id ? (
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

        {totalFiltered === 0 && (
          <div className="border-t border-border py-12 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-muted-foreground">No students match this view.</p>
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex h-9 w-9 items-center justify-center border-r border-border text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
