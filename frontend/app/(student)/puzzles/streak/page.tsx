// app/(student)/puzzles/streak/page.tsx - Puzzle streak starter

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { puzzleAPI, userAPI } from '@/lib/api';
import { Loader2, ArrowLeft, Flame } from 'lucide-react';
import toast from 'react-hot-toast';

function getDifficultyForPuzzleRating(
  rating: number | null | undefined
): '' | 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (rating == null) return '';
  if (rating <= 999) return 'beginner';
  if (rating <= 1400) return 'intermediate';
  if (rating <= 1800) return 'advanced';
  return 'expert';
}

export default function PuzzleStreakStartPage() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  const startStreak = async (difficulty: string) => {
    setIsStarting(true);
    try {
      const list = await puzzleAPI.getAll(
        difficulty || undefined,
        'healthyMix',
        0,
        200,
        { excludeAttempted: true }
      );
      if (list.length === 0) {
        toast.error('No unseen puzzles available right now.');
        setIsStarting(false);
        return;
      }
      const next = list[Math.floor(Math.random() * list.length)];
      const params = new URLSearchParams();
      params.set('mode', 'streak');
      params.set('streak', '0');
      params.set('best', '0');
      if (difficulty) params.set('difficulty', difficulty);
      router.push(`/puzzles/${next.id}?${params.toString()}`);
    } catch (error) {
      console.error('Failed to start puzzle streak:', error);
      toast.error('Failed to start puzzle streak');
      setIsStarting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initFromPuzzleRating = async () => {
      try {
        const stats = await userAPI.getStats();
        if (cancelled) return;
        const difficulty = getDifficultyForPuzzleRating(stats.puzzle_rating);
        setSelectedDifficulty(difficulty);
        await startStreak(difficulty);
      } catch (error) {
        console.error('Failed to initialize puzzle streak:', error);
        toast.error('Could not start puzzle streak');
        if (!cancelled) setIsStarting(false);
      }
    };

    void initFromPuzzleRating();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isStarting) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary-600" />
          <p className="font-heading font-semibold text-muted-foreground">Starting your puzzle streak...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5">
        <Link
          href="/puzzles"
          className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Puzzle Games
        </Link>
      </div>
      <div className="max-w-xl rounded-2xl border-2 border-border bg-card p-6 shadow-md">
        <h2 className="mb-2 flex items-center gap-2 font-heading text-xl font-bold text-card-foreground">
          <Flame className="h-5 w-5 text-orange-500" />
          Puzzle Streak
        </h2>
        <p className="mb-4 font-sans text-sm text-muted-foreground">
          We could not auto-start your streak. Try again to begin a fresh run and keep solving until your first miss.
        </p>
        <button
          type="button"
          onClick={() => startStreak(selectedDifficulty)}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-orange-500 bg-orange-500 px-4 py-2 font-heading font-bold text-white hover:opacity-90"
        >
          <Flame className="h-4 w-4" />
          Start Puzzle Streak
        </button>
      </div>
    </div>
  );
}
