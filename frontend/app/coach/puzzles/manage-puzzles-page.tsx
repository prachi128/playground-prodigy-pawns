// app/coach/puzzles/page.tsx - Manage Puzzles Page

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { coachAPI, Puzzle } from '@/lib/api';
import { Plus, Edit, Trash2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getDifficultyColor } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function ManagePuzzlesPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();
  
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');
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

    if (isAuthenticated) {
      loadPuzzles();
    }
  }, [isAuthenticated, authLoading, user, router]);

  const loadPuzzles = async () => {
    setIsLoading(true);
    try {
      const data = await coachAPI.getAllPuzzles(true);
      setPuzzles(data);
    } catch (error) {
      console.error('Failed to load puzzles:', error);
      toast.error('Failed to load puzzles');
    } finally {
      setIsLoading(false);
    }
  };

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

  const filteredPuzzles = puzzles.filter(puzzle => {
    if (filterActive === 'active') return puzzle.is_active;
    if (filterActive === 'inactive') return !puzzle.is_active;
    return true;
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading puzzles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-8 lg:px-12 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              📝 Manage Puzzles
            </h1>
            <p className="text-gray-600">
              Edit, delete, or revalidate puzzles
            </p>
          </div>
          <Link
            href="/coach/puzzles/create"
            className="bg-gradient-to-r from-primary-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-primary-600 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New
          </Link>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 mb-6">
          {[
            { value: 'all', label: 'All Puzzles' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterActive(filter.value as any)}
              style={{
                backgroundColor: filterActive === filter.value ? '#9333ea' : '#ffffff',
                color: filterActive === filter.value ? '#ffffff' : '#1f2937',
                border: filterActive === filter.value ? '2px solid #9333ea' : '2px solid #d1d5db',
              }}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Puzzles Table */}
        <div className="bg-white rounded-2xl shadow-lg border-4 border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-primary-500 to-purple-600 text-white">
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
                {filteredPuzzles.map((puzzle, index) => (
                  <tr
                    key={puzzle.id}
                    className={`border-t-2 border-gray-100 hover:bg-gray-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">
                      #{puzzle.id}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/coach/puzzles/${puzzle.id}`}>
                        <div className="hover:bg-primary-50 p-2 rounded-lg transition-colors cursor-pointer">
                          <p className="font-bold text-primary-600 hover:text-primary-700">
                            {puzzle.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {puzzle.description}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold border-2 capitalize ${getDifficultyColor(puzzle.difficulty)}`}>
                        {puzzle.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                      {puzzle.theme || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-yellow-600">
                      {puzzle.xp_reward} XP
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-gray-600">
                        {puzzle.success_count}/{puzzle.attempts_count}
                      </span>
                      {puzzle.attempts_count > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({Math.round((puzzle.success_count / puzzle.attempts_count) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {puzzle.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-600 font-bold">
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                          <XCircle className="w-4 h-4" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRevalidate(puzzle.id)}
                          className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all"
                          title="Revalidate with Stockfish"
                        >
                          <RefreshCw className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(puzzle.id, puzzle.title)}
                          className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-all"
                          title="Deactivate puzzle"
                          disabled={!puzzle.is_active}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPuzzles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No puzzles found</p>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Puzzles</p>
            <p className="text-2xl font-bold text-primary-600">{puzzles.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Active Puzzles</p>
            <p className="text-2xl font-bold text-green-600">
              {puzzles.filter(p => p.is_active).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Inactive Puzzles</p>
            <p className="text-2xl font-bold text-red-600">
              {puzzles.filter(p => !p.is_active).length}
            </p>
          </div>
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
