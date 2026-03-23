// app/(coach)/coach/puzzles/page.tsx - Manage Puzzles Page

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { coachAPI, Puzzle } from '@/lib/api';
import { Plus, Trash2, CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { parseThemeList } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';
import api from '@/lib/api';

const cardBase =
  'rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/25 hover:shadow-md';
const PAGE_SIZE = 50;

function coachDifficultyBadge(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'beginner':
      return 'border border-[hsl(var(--green-medium))]/35 bg-[hsl(var(--green-very-light))] text-[hsl(var(--green-medium))]';
    case 'intermediate':
      return 'border border-[hsl(var(--gold-medium))]/40 bg-[hsl(var(--gold-light))]/80 text-[hsl(var(--gold-dark))]';
    case 'advanced':
      return 'border border-[hsl(var(--orange-medium))]/40 bg-[hsl(var(--orange-very-light))] text-[hsl(var(--orange-dark))]';
    case 'expert':
      return 'border border-[hsl(var(--red-medium))]/35 bg-[hsl(var(--red-light))] text-[hsl(var(--red-medium))]';
    default:
      return 'border border-border bg-muted text-muted-foreground';
  }
}

export default function ManagePuzzlesPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();
  
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const initialFetchDoneRef = useRef(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; puzzleId: number | null; puzzleTitle: string }>({
    isOpen: false,
    puzzleId: null,
    puzzleTitle: '',
  });

  useEffect(() => {
    useAuthStore.getState().loadSession();
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'coach' && user.role !== 'admin') {
      toast.error('Access denied. Coach privileges required.');
      router.push('/dashboard');
      return;
    }

  }, [isAuthenticated, authLoading, user, router]);

  const loadPuzzles = async (
    page = currentPage,
    search = searchQuery,
    difficulty = filterDifficulty,
    active = filterActive,
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('skip', String((page - 1) * PAGE_SIZE));
      params.set('limit', String(PAGE_SIZE));
      params.set('include_inactive', 'true');
      if (active === 'active') {
        params.set('is_active_filter', 'true');
      } else if (active === 'inactive') {
        params.set('is_active_filter', 'false');
      }
      if (search.trim().length >= 2) params.set('search', search.trim());
      if (difficulty !== 'all') params.set('difficulty', difficulty);
      const res = await api.get(`/api/coach/puzzles?${params.toString()}`);
      setPuzzles(Array.isArray(res.data) ? res.data : []);
      setTotalCount(res.headers['x-total-count'] ? parseInt(res.headers['x-total-count']) : res.data.length);
    } catch {
      toast.error('Failed to load puzzles');
    } finally {
      setIsLoading(false);
      initialFetchDoneRef.current = true;
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadPuzzles();
  }, [currentPage, filterActive, filterDifficulty, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const t = setTimeout(() => {
      setCurrentPage(1);
      loadPuzzles(1, searchQuery);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, isAuthenticated]);

  const handleDelete = async (id: number, title: string) => {
    setDeleteDialog({ isOpen: true, puzzleId: id, puzzleTitle: title });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.puzzleId) return;

    try {
      await coachAPI.deletePuzzle(deleteDialog.puzzleId);
      toast.success('Puzzle deactivated successfully');
      setDeleteDialog({ isOpen: false, puzzleId: null, puzzleTitle: '' });
      loadPuzzles();
    } catch (error) {
      console.error('Failed to delete puzzle:', error);
      toast.error('Failed to delete puzzle');
    }
  };

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, puzzleId: null, puzzleTitle: '' });
  };

  const handleRevalidate = async (id: number) => {
    try {
      const result = await coachAPI.revalidatePuzzle(id);
      
      console.log('Revalidate result:', result);
      
      if (result.error) {
        toast.error(`Error: ${result.error}`, { duration: 5000 });
        return;
      }
      
      if (result.is_valid) {
        toast.success(`✓ Puzzle #${id} solution is correct!`);
      } else {
        const bestMove = result.best_move || 'unknown';
        toast.error(`Puzzle #${id} needs update: ${bestMove}`, { duration: 5000 });
      }
    } catch (error: any) {
      console.error('Failed to revalidate:', error);
      toast.error(`Failed to revalidate puzzle #${id}`);
    }
  };

  if (authLoading || (isLoading && !initialFetchDoneRef.current)) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Loading puzzles…</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {isLoading && initialFetchDoneRef.current && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/35 backdrop-blur-[1px]"
          aria-busy="true"
          aria-live="polite"
        >
          <Loader2 className="h-11 w-11 animate-spin text-primary drop-shadow-sm" />
          <span className="sr-only">Loading puzzles</span>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Puzzles
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Edit, deactivate, or revalidate puzzles with Stockfish.
          </p>
        </div>
        <Link
          href="/coach/puzzles/create"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          Create new
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, theme…"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <select
          value={filterDifficulty}
          onChange={(e) => {
            setCurrentPage(1);
            setFilterDifficulty(e.target.value);
          }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>

        <select
          value={filterActive}
          onChange={(e) => {
            setCurrentPage(1);
            setFilterActive(e.target.value as 'all' | 'active' | 'inactive');
          }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold">ID</th>
                <th className="px-4 py-3 text-left text-sm font-bold">Title</th>
                <th className="px-4 py-3 text-left text-sm font-bold">Difficulty</th>
                <th className="px-4 py-3 text-left text-sm font-bold">Theme</th>
                <th className="px-4 py-3 text-left text-sm font-bold">XP</th>
                <th className="px-4 py-3 text-left text-sm font-bold">Success</th>
                <th className="px-4 py-3 text-left text-sm font-bold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {puzzles.map((puzzle, index) => (
                <tr
                  key={puzzle.id}
                  className={`border-b border-border transition-colors hover:bg-muted/40 ${
                    index % 2 === 1 ? 'bg-muted/20' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-bold text-foreground">#{puzzle.id}</td>
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/coach/puzzles/${puzzle.id}`}>
                      <div className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-primary/10">
                        <p className="font-bold text-primary hover:text-primary/90">{puzzle.title}</p>
                        <p className="max-w-xs truncate text-xs text-muted-foreground">{puzzle.description}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-bold capitalize ${coachDifficultyBadge(
                        puzzle.difficulty,
                      )}`}
                    >
                      {puzzle.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {parseThemeList(puzzle.theme).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {parseThemeList(puzzle.theme).map((t) => (
                          <span
                            key={t}
                            className="inline-block rounded-full border border-[hsl(var(--blue-medium))]/35 bg-[hsl(var(--blue-light))] px-2 py-0.5 text-xs font-bold capitalize text-[hsl(var(--blue-dark))]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-[hsl(var(--gold-dark))]">
                    {puzzle.xp_reward} XP
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="text-muted-foreground">
                      {puzzle.success_count}/{puzzle.attempts_count}
                    </span>
                    {puzzle.attempts_count > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({Math.round((puzzle.success_count / puzzle.attempts_count) * 100)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {puzzle.is_active ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[hsl(var(--green-medium))]">
                        <CheckCircle className="h-4 w-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-destructive">
                        <XCircle className="h-4 w-4" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRevalidate(puzzle.id)}
                        className="rounded-lg p-2 text-[hsl(var(--blue-dark))] transition-colors hover:bg-[hsl(var(--blue-light))]"
                        title="Revalidate with Stockfish"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(puzzle.id, puzzle.title)}
                        className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
                        title="Deactivate puzzle"
                        disabled={!puzzle.is_active}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {puzzles.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No puzzles found</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {(() => {
            const start = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
            const end = totalCount === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, totalCount);
            return `Showing ${start}–${end} of ${totalCount} puzzles`;
          })()}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || isLoading}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={isLoading || currentPage * PAGE_SIZE >= totalCount}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className={`${cardBase} p-4`}>
          <p className="mb-1 text-sm text-muted-foreground">Total puzzles</p>
          <p className="text-2xl font-bold text-primary">{puzzles.length}</p>
        </div>
        <div className={`${cardBase} p-4`}>
          <p className="mb-1 text-sm text-muted-foreground">Active puzzles</p>
          <p className="text-2xl font-bold text-[hsl(var(--green-medium))]">
            {puzzles.filter((p) => p.is_active).length}
          </p>
        </div>
        <div className={`${cardBase} p-4`}>
          <p className="mb-1 text-sm text-muted-foreground">Inactive puzzles</p>
          <p className="text-2xl font-bold text-destructive">
            {puzzles.filter((p) => !p.is_active).length}
          </p>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Deactivate Puzzle"
        message={`Are you sure you want to deactivate "${deleteDialog.puzzleTitle}"? Students will no longer be able to access this puzzle.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDanger={true}
      />
    </div>
  );
}
