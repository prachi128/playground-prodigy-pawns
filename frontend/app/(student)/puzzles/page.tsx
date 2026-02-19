// app/(student)/puzzles/page.tsx - Puzzles List (student theme, dashboard layout)

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { puzzleAPI, Puzzle } from '@/lib/api';
import { getDifficultyColor, getThemeEmoji } from '@/lib/utils';
import { Puzzle as PuzzleIcon, Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PuzzlesPage() {
  const router = useRouter();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  const loadPuzzles = useCallback(async () => {
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
  }, [selectedDifficulty]);

  useEffect(() => {
    loadPuzzles();
  }, [loadPuzzles]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="font-heading font-semibold text-muted-foreground">Loading puzzles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
          Chess Puzzles 🧩
        </h1>
        <p className="font-sans text-sm text-muted-foreground">
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
              className={`px-3 py-1.5 rounded-lg font-heading font-semibold text-xs whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-2 border-primary'
                  : 'bg-card text-card-foreground border-2 border-border hover:border-primary/50'
              }`}
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
            onClick={() => router.push(`/puzzles/${puzzle.id}`)}
            className="bg-card rounded-xl p-4 shadow-lg border-2 border-border hover:border-primary/50 transition-all hover:shadow-xl cursor-pointer transform hover:scale-[1.02]"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 pr-2">
                <h3 className="font-heading text-base font-bold text-card-foreground mb-1">
                  {getThemeEmoji(puzzle.theme)} {puzzle.title}
                </h3>
                <p className="font-sans text-xs text-muted-foreground">{puzzle.description}</p>
              </div>
              <div className="flex items-center gap-1 text-amber-500 flex-shrink-0">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="font-heading font-bold text-xs">{puzzle.xp_reward}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-heading font-bold border-2 ${getDifficultyColor(puzzle.difficulty)}`}>
                {puzzle.difficulty}
              </span>
              {puzzle.theme && (
                <span className="px-2 py-0.5 rounded-full text-xs font-heading font-bold bg-blue-100 text-blue-800 border-2 border-blue-300">
                  {puzzle.theme}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between font-sans text-xs text-muted-foreground mb-3">
              <span>Rating: {puzzle.rating}</span>
              <span>
                {puzzle.success_count}/{puzzle.attempts_count} solved
              </span>
            </div>

            <button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-heading font-bold py-1.5 px-3 rounded-lg hover:opacity-90 transition-all text-xs">
              Solve Puzzle →
            </button>
          </div>
        ))}
      </div>

      {puzzles.length === 0 && (
        <div className="text-center py-12">
          <PuzzleIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-sans text-sm text-muted-foreground">No puzzles found</p>
        </div>
      )}
    </div>
  );
}
