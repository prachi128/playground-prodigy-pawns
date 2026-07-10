// app/(coach)/coach/students/page.tsx — Coach roster (personal students only)

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import {
  Users,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { batchAPI, type Batch } from '@/lib/api';
import { coachStudentProfilePath } from '@/lib/coach-student-path';
import {
  STUDENT_PAGE_SIZE,
  STUDENT_SKILL_ORDER,
  type StudentListRow,
  type StudentSortCol,
  studentDisplayName,
  studentAppRating,
  studentRatingSortKey,
  attendanceTextClass,
  skillLevelClass,
} from '@/lib/student-table-utils';

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

export default function CoachStudentsPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();

  const [students, setStudents] = useState<StudentListRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [batchStudentIds, setBatchStudentIds] = useState<Set<number>>(() => new Set());
  const [batchStudentsLoading, setBatchStudentsLoading] = useState(false);

  const [sortCol, setSortCol] = useState<StudentSortCol | null>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/dashboard');
      return;
    }
    if (user?.role !== 'coach' && user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    void loadData();
  }, [authLoading, isAuthenticated, user?.role, router]);

  const loadData = async () => {
    setIsLoading(true);
    const results = await Promise.allSettled([
      api.get('/api/coach/students'),
      batchAPI.list(),
    ]);

    if (results[0].status === 'fulfilled') {
      const loaded = Array.isArray(results[0].value.data) ? results[0].value.data : [];
      setStudents(loaded);
    } else {
      toast.error('Failed to load students');
      setStudents([]);
    }

    if (results[1].status === 'fulfilled') {
      setBatches(results[1].value);
    } else {
      toast.error('Failed to load classes');
      setBatches([]);
    }
    setIsLoading(false);
  };

  const filteredStudents = useMemo(() => {
    let list = students;
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
  }, [
    students,
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
      toast.error('Failed to load class roster');
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
      setSortDir(col === 'name' || col === 'username' || col === 'batch' ? 'asc' : 'desc');
    }
  };

  const totalFiltered = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / STUDENT_PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedBatchId]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
          <p className="text-sm font-medium text-muted-foreground">Loading your students…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[min(70vh,520px)]">
      <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading flex items-center gap-2 text-foreground">
            <Users className="coach-text-link h-4 w-4 shrink-0" aria-hidden />
            My students
            {students.length > 0 && (
              <span className="coach-text-accent text-[13px] font-normal">({students.length})</span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Students on your roster and in your classes.
          </p>
        </div>
        <Link
          href="/coach/leaderboard"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary"
        >
          <Trophy className="coach-text-warning h-3.5 w-3.5 shrink-0" aria-hidden />
          Rankings
        </Link>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="batch-filter" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Class
          </label>
          <div className="relative">
            <select
              id="batch-filter"
              value={selectedBatchId ?? ''}
              onChange={(e) => void handleBatchSelect(e.target.value)}
              disabled={batchStudentsLoading}
              className={`w-full appearance-none rounded-lg border border-input bg-background py-2.5 pl-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70 sm:max-w-xs ${batchStudentsLoading ? 'pr-14' : 'pr-12'}`}
            >
              <option value="">All classes</option>
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
        <div className="min-w-0 flex-[2]">
          <label htmlFor="student-search" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="student-search"
              type="search"
              placeholder="Name or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <SortableHeader label="Name" col="name" sortCol={sortCol} sortDir={sortDir} onSort={handleSortHeaderClick} />
                <SortableHeader label="Username" col="username" sortCol={sortCol} sortDir={sortDir} onSort={handleSortHeaderClick} />
                <SortableHeader label="Age" col="age" sortCol={sortCol} sortDir={sortDir} onSort={handleSortHeaderClick} />
                <SortableHeader label="Rating" col="rating" sortCol={sortCol} sortDir={sortDir} onSort={handleSortHeaderClick} />
                <SortableHeader label="Batch" col="batch" sortCol={sortCol} sortDir={sortDir} onSort={handleSortHeaderClick} />
                <SortableHeader label="Skill level" col="skill_level" sortCol={sortCol} sortDir={sortDir} onSort={handleSortHeaderClick} />
                <SortableHeader label="Attendance %" col="attendance_pct" sortCol={sortCol} sortDir={sortDir} onSort={handleSortHeaderClick} />
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student, index) => {
                const rowIndex = (safePage - 1) * STUDENT_PAGE_SIZE + index;
                const batchLabel =
                  student.batch_names && student.batch_names.length > 0
                    ? student.batch_names.join(', ')
                    : '—';
                return (
                  <tr
                    key={student.id}
                    className={`border-t border-border transition-colors hover:bg-muted/40 ${
                      rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                    }`}
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={coachStudentProfilePath(student.username)}
                        className="block rounded-md p-1 -m-1 transition-colors hover:bg-muted/60"
                      >
                        <p className="coach-text-link font-medium hover:underline">
                          {studentDisplayName(student)}
                        </p>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">@{student.username}</td>
                    <td className="px-3 py-3 text-foreground whitespace-nowrap">
                      {student.age != null ? student.age : '—'}
                    </td>
                    <td className="coach-text-link px-3 py-3 font-semibold whitespace-nowrap">
                      {studentAppRating(student) ?? '—'}
                    </td>
                    <td className="max-w-[10rem] px-3 py-3 text-foreground">
                      <span className="line-clamp-2" title={batchLabel}>
                        {batchLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-[13px] font-medium ${skillLevelClass(student.skill_level)}`}>
                        {student.skill_level ?? '—'}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-3 font-medium whitespace-nowrap ${attendanceTextClass(student.attendance_pct)}`}
                    >
                      {student.attendance_pct != null ? `${student.attendance_pct}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalFiltered === 0 && (
          <div className="border-t border-border py-12 text-center">
            <p className="text-muted-foreground">No students on your roster yet.</p>
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
    </div>
  );
}
