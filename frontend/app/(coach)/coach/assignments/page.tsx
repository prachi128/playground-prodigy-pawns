// app/(coach)/coach/assignments/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, BookOpen, Users, User, Calendar, ChevronRight,
  CheckCircle, Clock, XCircle, Loader2, X, Trash2,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

interface Puzzle {
  id: number;
  title: string;
  difficulty: string;
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
}

// ── Helpers ──────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     'bg-green-100 text-green-800 border-green-300',
  intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  advanced:     'bg-orange-100 text-orange-800 border-orange-300',
  expert:       'bg-red-100 text-red-800 border-red-300',
};

function diffBadge(d: string) {
  return DIFFICULTY_COLORS[d.toLowerCase()] ?? 'bg-gray-100 text-gray-700 border-gray-300';
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
  const [allPuzzles, setAllPuzzles]   = useState<Puzzle[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [creating, setCreating]       = useState(false);
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
  const [puzzleSearch, setPuzzleSearch]       = useState('');

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
      const [asgnRes, batchRes, stuRes, puzRes] = await Promise.all([
        api.get('/api/assignments'),
        api.get('/api/batches'),
        api.get('/api/coach/students/'),
        api.get('/api/coach/puzzles?include_inactive=false'),
      ]);
      setAssignments(asgnRes.data);
      setBatches(batchRes.data);
      setStudents(stuRes.data);
      setAllPuzzles(puzRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

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

  const resetForm = () => {
    setForm({ title: '', description: '', target: 'batch', batch_id: '', student_id: '', due_date: '' });
    setSelectedPuzzles([]);
    setPuzzleSearch('');
  };

  const togglePuzzle = (id: number) => {
    setSelectedPuzzles(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const filtered = assignments.filter(a => {
    if (filterActive === 'active')   return a.is_active;
    if (filterActive === 'inactive') return !a.is_active;
    return true;
  });

  const filteredPuzzles = allPuzzles.filter(p =>
    p.title.toLowerCase().includes(puzzleSearch.toLowerCase()) ||
    p.difficulty.toLowerCase().includes(puzzleSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-600">Create and track puzzle assignments for batches or individual students</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-bold hover:from-primary-600 hover:to-purple-700 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" /> New Assignment
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(['active', 'all', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterActive(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize ${
              filterActive === f
                ? 'bg-primary-500 text-white shadow'
                : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-primary-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Assignment cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-14 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-lg font-medium">No assignments yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first assignment to get students practising.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div
              key={a.id}
              className={`bg-white rounded-2xl border-2 p-5 transition-all ${
                a.is_active
                  ? 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                  : 'border-gray-100 opacity-60'
              }`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 text-base truncate">{a.title}</h3>
                  {a.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {a.is_active && (
                    <button
                      onClick={() => handleDeactivate(a.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Deactivate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <Link
                    href={`/coach/assignments/${a.id}`}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    title="View progress"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Target badge */}
              <div className="flex items-center gap-1.5 mb-3">
                {a.batch_id ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded-full">
                    <Users className="w-3 h-3" /> {a.batch_name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-full">
                    <User className="w-3 h-3" /> {a.student_name}
                  </span>
                )}
              </div>

              {/* Meta row */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {a.puzzle_count} puzzle{a.puzzle_count !== 1 ? 's' : ''}
                </span>
                {a.due_date ? (
                  <span className={`flex items-center gap-1 font-medium ${
                    isOverdue(a.due_date) ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {isOverdue(a.due_date) ? <XCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    Due {formatDate(a.due_date)}
                  </span>
                ) : (
                  <span className="text-gray-400">No deadline</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE MODAL ─────────────────────────────────────── */}
      {showCreate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
                   display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                   overflowY: 'auto', padding: '2rem 1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCreate(false); resetForm(); }}}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b-2 border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">New Assignment</h2>
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Week 3 Tactics — Forks & Pins"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Optional instructions for students..."
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:outline-none resize-none"
                />
              </div>

              {/* Target: batch or student */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Assign to *</label>
                <div className="flex gap-3 mb-3">
                  {(['batch', 'student'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, target: t, batch_id: '', student_id: '' })}
                      className={`flex-1 py-2 rounded-xl border-2 font-semibold text-sm transition-all capitalize ${
                        form.target === t
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {t === 'batch' ? <><Users className="w-4 h-4 inline mr-1" />Whole Batch</> : <><User className="w-4 h-4 inline mr-1" />Individual Student</>}
                    </button>
                  ))}
                </div>

                {form.target === 'batch' ? (
                  <select
                    value={form.batch_id}
                    onChange={e => setForm({ ...form, batch_id: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">Select batch...</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.student_count} students)
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={form.student_id}
                    onChange={e => setForm({ ...form, student_id: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">Select student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.username} — {s.email}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Due date */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Due Date <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.due_date}
                  onChange={e => setForm({ ...form, due_date: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:outline-none"
                />
              </div>

              {/* Puzzle picker */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Puzzles * <span className="font-normal text-gray-500">({selectedPuzzles.length} selected — order matters)</span>
                </label>
                <input
                  type="text"
                  value={puzzleSearch}
                  onChange={e => setPuzzleSearch(e.target.value)}
                  placeholder="Search by title or difficulty..."
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none mb-2 text-sm"
                />
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                  {filteredPuzzles.length === 0 ? (
                    <p className="text-center text-gray-400 py-6 text-sm">No puzzles found</p>
                  ) : (
                    filteredPuzzles.map(p => {
                      const isSelected = selectedPuzzles.includes(p.id);
                      const order = selectedPuzzles.indexOf(p.id) + 1;
                      return (
                        <div
                          key={p.id}
                          onClick={() => togglePuzzle(p.id)}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all border-b border-gray-100 last:border-b-0 ${
                            isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500 text-white'
                              : 'border-gray-300 text-gray-400'
                          }`}>
                            {isSelected ? order : ''}
                          </div>
                          <span className="flex-1 text-sm text-gray-800 font-medium">{p.title}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border capitalize ${diffBadge(p.difficulty)}`}>
                            {p.difficulty}
                          </span>
                          <span className="text-xs text-yellow-600 font-bold">{p.xp_reward} XP</span>
                        </div>
                      );
                    })
                  )}
                </div>
                {/* Selected order preview */}
                {selectedPuzzles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedPuzzles.map((id, idx) => {
                      const p = allPuzzles.find(x => x.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 border border-primary-300 text-xs font-bold px-2 py-1 rounded-full"
                        >
                          {idx + 1}. {p?.title ?? `#${id}`}
                          <button onClick={() => togglePuzzle(id)} className="ml-0.5 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white font-bold rounded-xl hover:from-primary-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
