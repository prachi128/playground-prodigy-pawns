// app/puzzles-legacy/page.tsx - Original Puzzles List (kept for reference, not in use)

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { puzzleAPI, Puzzle } from '@/lib/api';
import { getDifficultyColor, getThemeEmoji, parseThemeList } from '@/lib/utils';
import { Puzzle as PuzzleIcon, Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PuzzlesLegacyPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  useEffect(() => {
    useAuthStore.getState().loadSession();
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      loadPuzzles();
    }
  }, [isAuthenticated, authLoading, router, selectedDifficulty]);

  const loadPuzzles = async () => {
    setIsLoading(true);
    try {
      const data = await puzzleAPI.getAll(selectedDifficulty || undefined);
      setPuzzles(data);
    } catch (error) {
      console.error('Failed to load puzzles:', error);
      toast.error('Failed to load puzzles');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading puzzles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-8 lg:px-12 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Chess Puzzles 🧩
          </h1>
          <p className="text-gray-600 text-sm">
            Solve puzzles and earn XP!
          </p>
        </div>

        {/* Difficulty Filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {[
            { value: '', label: 'All' },
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
            { value: 'expert', label: 'Expert' }
          ].map((diff) => {
            const isSelected = selectedDifficulty === diff.value;
            return (
              <button
                key={diff.value}
                onClick={() => setSelectedDifficulty(diff.value)}
                style={{
                  backgroundColor: isSelected ? '#9333ea' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#1f2937',
                  border: isSelected ? '2px solid #9333ea' : '2px solid #d1d5db',
                }}
                className="px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all"
              >
                {diff.label}
              </button>
            );
          })}
        </div>

        {/* Puzzles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {puzzles.map((puzzle) => (
            <div
              key={puzzle.id}
              onClick={() => router.push(`/puzzles-legacy/${puzzle.id}`)}
              className="bg-white rounded-xl p-4 shadow-lg border-3 border-gray-200 hover:border-primary-400 transition-all hover:shadow-xl cursor-pointer transform hover:scale-105"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 pr-2">
                  <h3 className="text-base font-bold text-gray-800 mb-1">
                    {getThemeEmoji(parseThemeList(puzzle.theme)[0])} {puzzle.title}
                  </h3>
                  <p className="text-xs text-gray-600">{puzzle.description}</p>
                </div>
                <div className="flex items-center gap-1 text-yellow-500 flex-shrink-0">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="font-bold text-xs">{puzzle.xp_reward}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border-2 ${getDifficultyColor(puzzle.difficulty)}`}>
                  {puzzle.difficulty}
                </span>
                {parseThemeList(puzzle.theme).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border-2 border-blue-300 capitalize">
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                <span>Rating: {puzzle.rating}</span>
                <span>
                  {puzzle.success_count}/{puzzle.attempts_count} solved
                </span>
              </div>

              <button className="w-full bg-gradient-to-r from-primary-500 to-purple-600 text-white font-bold py-1.5 px-3 rounded-lg hover:from-primary-600 hover:to-purple-700 transition-all text-xs">
                Solve Puzzle →
              </button>
            </div>
          ))}
        </div>

        {puzzles.length === 0 && (
          <div className="text-center py-12">
            <PuzzleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-sm">No puzzles found</p>
          </div>
        )}
      </div>
    </div>
  );
}
