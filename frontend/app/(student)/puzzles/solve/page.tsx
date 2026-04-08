// app/(student)/puzzles/solve/page.tsx - Random puzzle starter

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { puzzleAPI, userAPI } from '@/lib/api';
import { Loader2, ArrowLeft, Dice6 } from 'lucide-react';
import toast from 'react-hot-toast';

const DIFFICULTIES = [
  { value: '', label: 'All' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

function getDifficultyForPuzzleRating(
  rating: number | null | undefined
): '' | 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (rating == null) return '';
  if (rating <= 999) return 'beginner';
  if (rating <= 1400) return 'intermediate';
  if (rating <= 1800) return 'advanced';
  return 'expert';
}

export default function PuzzlesSolvePage() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  const startRandom = async (difficulty: string) => {
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
      params.set('mode', 'random');
      if (difficulty) params.set('difficulty', difficulty);
      router.push(`/puzzles/${next.id}?${params.toString()}`);
    } catch (error) {
      console.error('Failed to start random puzzle:', error);
      toast.error('Failed to start random puzzle');
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
        await startRandom(difficulty);
      } catch (error) {
        console.error('Failed to initialize random puzzle:', error);
        toast.error('Could not start a random puzzle');
        if (!cancelled) setIsStarting(false);
      }
    };

    initFromPuzzleRating();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isStarting) {
    return (
      <div className="mx-auto max-w-7xl flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="font-heading font-semibold text-muted-foreground">Starting a random puzzle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5">
        <Link
          href="/puzzles"
          className="inline-flex items-center gap-1 text-primary hover:text-primary/90 font-heading font-semibold text-sm mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Puzzle Games
        </Link>
      </div>
      <div className="rounded-2xl border-2 border-border bg-card p-6 shadow-md max-w-xl">
        <h2 className="font-heading text-xl font-bold text-card-foreground mb-2 flex items-center gap-2">
          <Dice6 className="w-5 h-5 text-primary" />
          Random Puzzle
        </h2>
        <p className="font-sans text-sm text-muted-foreground mb-4">
          We could not auto-start a puzzle. Try again to get a random unseen puzzle.
        </p>
        <button
          type="button"
          onClick={() => startRandom(selectedDifficulty)}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-primary bg-primary px-4 py-2 font-heading font-bold text-primary-foreground hover:opacity-90"
        >
          <Dice6 className="w-4 h-4" />
          Start Random Puzzle
        </button>
      </div>
    </div>
  );
}
