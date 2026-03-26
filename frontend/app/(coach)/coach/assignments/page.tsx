// app/(coach)/coach/assignments/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus,
  BookOpen,
  Users,
  User,
  ChevronRight,
  Clock,
  XCircle,
  Loader2,
  X,
  Trash2,
  Pencil,
} from 'lucide-react';

const cardBase =
  'rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/25 hover:shadow-md';

// ── Types ────────────────────────────────────────────────────

interface Puzzle {
  id: number;
  title: string;
  difficulty: string;
  theme?: string;
  xp_reward: number;
  is_active: boolean;
}

interface Batch {
  id: number;
  name: string;
  student_count: number;
}

interface Student {
  id: number;
  username: string;
  email: string;
}

interface Assignment {
  id: number;
  title: string;
  description: string | null;
  batch_id: number | null;
  batch_name: string | null;
  student_id: number | null;
  student_name: string | null;
  due_date: string | null;
  is_active: boolean;
  created_at: string;
  puzzle_count: number;
  puzzles?: Array<{ puzzle_id: number; title: string; difficulty: string; xp_reward: number }>;
}

// ── Helpers ──────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:
    'border border-[hsl(var(--green-medium))]/35 bg-[hsl(var(--green-very-light))] text-[hsl(var(--green-medium))]',
  intermediate:
    'border border-[hsl(var(--gold-medium))]/40 bg-[hsl(var(--gold-light))]/80 text-[hsl(var(--gold-dark))]',
  advanced:
    'border border-[hsl(var(--orange-medium))]/40 bg-[hsl(var(--orange-very-light))] text-[hsl(var(--orange-dark))]',
  expert:
    'border border-[hsl(var(--red-medium))]/35 bg-[hsl(var(--red-light))] text-[hsl(var(--red-medium))]',
};

function diffBadge(d: string) {
  return (
    DIFFICULTY_COLORS[d.toLowerCase()] ??
    'border border-border bg-muted text-muted-foreground'
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(due: string | null) {
  if (!due) return false;
  return new Date(due) < new Date();
}

// ── Component ────────────────────────────────────────────────

export default function AssignmentsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [batches, setBatches]         = useState<Batch[]>([]);
  const [students, setStudents]       = useState<Student[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [showEdit, setShowEdit]       = useState(false);
  const [creating, setCreating]       = useState(false);
  const [editing, setEditing]         = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');

  // Create form state
  const [form, setForm] = useState({
    title:        '',
    description:  '',
    target:       'batch' as 'batch' | 'student',
    batch_id:     '',
    student_id:   '',
    due_date:     '',
  });
  const [selectedPuzzles, setSelectedPuzzles] = useState<number[]>([]);
  const [selectedPuzzleDetails, setSelectedPuzzleDetails] = useState<Map<number, Puzzle>>(new Map());
  const [puzzleQuery, setPuzzleQuery] = useState('');
  const [puzzleResults, setPuzzleResults] = useState<Puzzle[]>([]);
  const [puzzleSearching, setPuzzleSearching] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coach' && user?.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  // ── Load data ───────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [asgnRes, batchRes, stuRes] = await Promise.all([
        api.get('/api/assignments'),
        api.get('/api/batches'),
        api.get('/api/coach/students/'),
      ]);
      setAssignments(asgnRes.data);
      setBatches(batchRes.data);
      setStudents(stuRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = puzzleQuery.trim();
    if (q.length < 3) {
      setPuzzleResults([]);
      setPuzzleSearching(false);
      return;
    }

    let cancelled = false;
    setPuzzleSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get(
          `/api/coach/puzzles?include_inactive=false&limit=20&search=${encodeURIComponent(q)}`,
        );
        if (cancelled) return;
        setPuzzleResults(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) {
          toast.error('Search failed');
          setPuzzleResults([]);
        }
      } finally {
        if (!cancelled) setPuzzleSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [puzzleQuery]);

  // ── Create assignment ───────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (selectedPuzzles.length === 0) { toast.error('Select at least one puzzle'); return; }
    if (form.target === 'batch'   && !form.batch_id)   { toast.error('Select a batch');   return; }
    if (form.target === 'student' && !form.student_id) { toast.error('Select a student'); return; }

    setCreating(true);
    try {
      await api.post('/api/assignments', {
        title:       form.title,
        description: form.description || undefined,
        puzzle_ids:  selectedPuzzles,
        batch_id:    form.target === 'batch'   ? parseInt(form.batch_id)   : undefined,
        student_id:  form.target === 'student' ? parseInt(form.student_id) : undefined,
        due_date:    form.due_date ? new Date(form.due_date).toISOString() : undefined,
      });
      toast.success('Assignment created!');
      setShowCreate(false);
      resetForm();
      loadAll();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await api.delete(`/api/assignments/${id}`);
      toast.success('Assignment deactivated');
      loadAll();
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  const openEdit = async (id: number) => {
    setEditingAssignmentId(id);
    try {
      const res = await api.get(`/api/assignments/${id}`);
      const a: Assignment = res.data;
      setForm({
        title: a.title ?? '',
        description: a.description ?? '',
        target: a.batch_id ? 'batch' : 'student',
        batch_id: a.batch_id ? String(a.batch_id) : '',
        student_id: a.student_id ? String(a.student_id) : '',
        due_date: a.due_date ? new Date(a.due_date).toISOString().slice(0, 16) : '',
      });

      const puzzleIds = (a.puzzles ?? []).map((p) => p.puzzle_id);
      setSelectedPuzzles(puzzleIds);
      setSelectedPuzzleDetails(
        new Map((a.puzzles ?? []).map((p) => [p.puzzle_id, {
          id: p.puzzle_id,
          title: p.title,
          difficulty: p.difficulty,
          xp_reward: p.xp_reward,
          is_active: true,
        }]))
      );
      setPuzzleQuery('');
      setPuzzleResults([]);
      setPuzzleSearching(false);
      setShowEdit(true);
    } catch {
      toast.error('Failed to load assignment for editing');
      setEditingAssignmentId(null);
    }
  };

  const handleUpdate = async () => {
    if (!editingAssignmentId) return;
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (selectedPuzzles.length === 0) { toast.error('Select at least one puzzle'); return; }

    setEditing(true);
    try {
      await api.put(`/api/assignments/${editingAssignmentId}`, {
        title: form.title,
        description: form.description || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        puzzle_ids: selectedPuzzles,
      });
      toast.success('Assignment updated!');
      setShowEdit(false);
      setEditingAssignmentId(null);
      resetForm();
      loadAll();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to update assignment');
    } finally {
      setEditing(false);
    }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', target: 'batch', batch_id: '', student_id: '', due_date: '' });
    setSelectedPuzzles([]);
    setSelectedPuzzleDetails(new Map());
    setPuzzleQuery('');
    setPuzzleResults([]);
    setPuzzleSearching(false);
  };

  const togglePuzzle = (puzzle: Puzzle) => {
    const id = puzzle.id;
    setSelectedPuzzles(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
    setSelectedPuzzleDetails((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, puzzle);
      }
      return next;
    });
  };

  const filtered = assignments.filter(a => {
    if (filterActive === 'active')   return a.is_active;
    if (filterActive === 'inactive') return !a.is_active;
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading assignments…</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Assignments
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Create and track puzzle assignments for batches or individual students.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          New assignment
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(['active', 'all', 'inactive'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilterActive(f)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
              filterActive === f
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={`${cardBase} p-14 text-center`}>
          <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-heading text-lg font-bold text-card-foreground">No assignments yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first assignment to get students practising.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className={`rounded-xl border p-5 shadow-sm transition-all ${
                a.is_active
                  ? 'border-border bg-card hover:border-primary/25 hover:shadow-md'
                  : 'border-border/60 bg-card/80 opacity-60'
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-card-foreground">{a.title}</h3>
                  {a.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{a.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {a.is_active && (
                    <button
                      type="button"
                      onClick={() => openEdit(a.id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      title="Edit assignment"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {a.is_active && (
                    <button
                      type="button"
                      onClick={() => handleDeactivate(a.id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Deactivate"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <Link
                    href={`/coach/assignments/${a.id}`}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    title="View progress"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="mb-3 flex items-center gap-1.5">
                {a.batch_id ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--blue-medium))]/35 bg-[hsl(var(--blue-light))] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--blue-dark))]">
                    <Users className="h-3 w-3" /> {a.batch_name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--purple-medium))]/35 bg-[hsl(var(--purple-light))]/90 px-2 py-0.5 text-xs font-semibold text-[hsl(var(--purple-dark))]">
                    <User className="h-3 w-3" /> {a.student_name}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {a.puzzle_count} puzzle{a.puzzle_count !== 1 ? 's' : ''}
                </span>
                {a.due_date ? (
                  <span
                    className={`flex items-center gap-1 font-medium ${
                      isOverdue(a.due_date) ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {isOverdue(a.due_date) ? (
                      <XCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    Due {formatDate(a.due_date)}
                  </span>
                ) : (
                  <span className="text-muted-foreground/70">No deadline</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreate || showEdit) && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreate(false);
              setShowEdit(false);
              setEditingAssignmentId(null);
              resetForm();
            }
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-assignment-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-6">
              <h2
                id="new-assignment-title"
                className="font-heading text-xl font-bold text-card-foreground"
              >
                {showEdit ? 'Edit assignment' : 'New assignment'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setShowEdit(false);
                  setEditingAssignmentId(null);
                  resetForm();
                }}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Week 3 Tactics — Forks & Pins"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Optional instructions for students…"
                  className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {!showEdit && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Assign to *</label>
                <div className="mb-3 flex gap-3">
                  {(['batch', 'student'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, target: t, batch_id: '', student_id: '' })}
                      className={`flex-1 rounded-xl border py-2 text-sm font-semibold capitalize transition-colors ${
                        form.target === t
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-input hover:text-foreground'
                      }`}
                    >
                      {t === 'batch' ? (
                        <>
                          <Users className="mr-1 inline h-4 w-4" />
                          Whole batch
                        </>
                      ) : (
                        <>
                          <User className="mr-1 inline h-4 w-4" />
                          Individual student
                        </>
                      )}
                    </button>
                  ))}
                </div>

                {form.target === 'batch' ? (
                  <select
                    value={form.batch_id}
                    onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select batch…</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.student_count} students)
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={form.student_id}
                    onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select student…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.username} — {s.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  Due date <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  Puzzles *{' '}
                  <span className="font-normal text-muted-foreground">
                    ({selectedPuzzles.length} selected — order matters)
                  </span>
                </label>
                <input
                  type="text"
                  value={puzzleQuery}
                  onChange={(e) => setPuzzleQuery(e.target.value)}
                  placeholder="Search by title or difficulty…"
                  className="mb-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="max-h-52 overflow-y-auto overflow-hidden rounded-xl border border-border">
                  {puzzleQuery.trim().length < 3 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Type at least 3 characters to search puzzles
                    </p>
                  ) : puzzleSearching ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : puzzleResults.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No puzzles found</p>
                  ) : (
                    puzzleResults.map((p) => {
                      const isSelected = selectedPuzzles.includes(p.id);
                      const order = selectedPuzzles.indexOf(p.id) + 1;
                      return (
                        <div
                          key={p.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => togglePuzzle(p)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              togglePuzzle(p);
                            }
                          }}
                          className={`flex cursor-pointer items-center gap-3 border-b border-border px-4 py-2.5 transition-colors last:border-b-0 ${
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                          }`}
                        >
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/30 text-muted-foreground'
                            }`}
                          >
                            {isSelected ? order : ''}
                          </div>
                          <span className="flex-1 text-sm font-medium text-foreground">{p.title}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${diffBadge(p.difficulty)}`}
                          >
                            {p.difficulty}
                          </span>
                          <span className="text-xs font-bold text-[hsl(var(--gold-dark))]">{p.xp_reward} XP</span>
                        </div>
                      );
                    })
                  )}
                </div>
                {selectedPuzzles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedPuzzles.map((id, idx) => {
                      const p = selectedPuzzleDetails.get(id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-bold text-primary"
                        >
                          {idx + 1}. {p?.title ?? `#${id}`}
                          <button
                            type="button"
                            onClick={() =>
                              togglePuzzle(
                                p ?? {
                                  id,
                                  title: `#${id}`,
                                  difficulty: 'beginner',
                                  xp_reward: 0,
                                  is_active: true,
                                },
                              )
                            }
                            className="ml-0.5 text-primary hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setShowEdit(false);
                  setEditingAssignmentId(null);
                  resetForm();
                }}
                className="flex-1 rounded-xl border border-border bg-muted py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={showEdit ? handleUpdate : handleCreate}
                disabled={showEdit ? editing : creating}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {(showEdit ? editing : creating) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {showEdit ? 'Saving…' : 'Creating…'}
                  </>
                ) : (
                  showEdit ? 'Save changes' : 'Create assignment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
