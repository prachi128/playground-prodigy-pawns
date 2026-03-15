// app/(student)/puzzles/solve/page.tsx - Puzzles List (Solve puzzles)

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { puzzleAPI, Puzzle } from '@/lib/api';
import { getDifficultyColor, getThemeEmoji, parseThemeList } from '@/lib/utils';
import { Puzzle as PuzzleIcon, Loader2, Star, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const DIFFICULTIES = [
  { value: '', label: 'All' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

export default function PuzzlesSolvePage() {
  const router = useRouter();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const selectedDifficultyRef = useRef(selectedDifficulty);
  selectedDifficultyRef.current = selectedDifficulty;
  // Cache per difficulty for instant tab switching
  const cacheRef = useRef<Record<string, { list: Puzzle[]; hasMore: boolean }>>({});

  const loadPuzzles = useCallback(
    async (difficulty: string, append = false, currentList: Puzzle[] = []) => {
      const skip = append ? currentList.length : 0;
      try {
        const data = await puzzleAPI.getAll(
          difficulty || undefined,
          undefined,
          skip,
          puzzleAPI.pageSize
        );
        const newHasMore = data.length >= puzzleAPI.pageSize;
        const newList = append ? [...currentList, ...data] : data;
        const key = difficulty || '__all__';
        cacheRef.current[key] = { list: newList, hasMore: newHasMore };
        const current = selectedDifficultyRef.current;
        const isCurrentTab =
          current === difficulty || (current === '' && difficulty === '');
        if (isCurrentTab) {
          setPuzzles(newList);
          setHasMore(newHasMore);
        }
      } catch (error) {
        console.error('Failed to load puzzles:', error);
        toast.error('Failed to load puzzles');
      } finally {
        const current = selectedDifficultyRef.current;
        const isCurrentTab =
          current === difficulty || (current === '' && difficulty === '');
        if (isCurrentTab) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [selectedDifficulty]
  );

  // When tab changes: show cached data immediately, then fetch if missing or refresh in background
  useEffect(() => {
    const key = selectedDifficulty || '__all__';
    const cached = cacheRef.current[key];

    if (cached) {
      setPuzzles(cached.list);
      setHasMore(cached.hasMore);
      setIsLoading(false);
      setIsLoadingMore(false);
      // Optional: refresh in background so data stays fresh (no loading state)
      loadPuzzles(selectedDifficulty, false, []);
      return;
    }

    setIsLoading(true);
    setPuzzles([]);
    setHasMore(true);
    loadPuzzles(selectedDifficulty, false, []);
  }, [selectedDifficulty]);

  // Prefetch other difficulties after initial load so tab switches are instant
  useEffect(() => {
    const key = selectedDifficulty || '__all__';
    if (!cacheRef.current[key]) return;
    DIFFICULTIES.forEach(({ value }) => {
      const k = value || '__all__';
      if (k !== key && !cacheRef.current[k]) {
        puzzleAPI
          .getAll(value || undefined, undefined, 0, puzzleAPI.pageSize)
          .then((data) => {
            cacheRef.current[k] = {
              list: data,
              hasMore: data.length >= puzzleAPI.pageSize,
            };
          })
          .catch(() => {});
      }
    });
  }, [selectedDifficulty]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      loadPuzzles(selectedDifficulty, true, puzzles);
    }
  }, [loadPuzzles, selectedDifficulty, puzzles, isLoadingMore, hasMore]);

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
      <div className="mb-5">
        <Link
          href="/puzzles"
          className="inline-flex items-center gap-1 text-primary hover:text-primary/90 font-heading font-semibold text-sm mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Puzzles
        </Link>
      </div>

      {/* Difficulty Filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {DIFFICULTIES.map((diff) => {
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
                  {getThemeEmoji(parseThemeList(puzzle.theme)[0])} {puzzle.title}
                </h3>
                <p className="font-sans text-xs text-muted-foreground">{puzzle.description}</p>
              </div>
              <div className="flex items-center gap-1 text-amber-500 flex-shrink-0">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="font-heading font-bold text-xs">{puzzle.xp_reward}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-heading font-bold border-2 ${getDifficultyColor(puzzle.difficulty)}`}>
                {puzzle.difficulty}
              </span>
              {parseThemeList(puzzle.theme).map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full text-xs font-heading font-bold bg-blue-100 text-blue-800 border-2 border-blue-300 capitalize">
                  {t}
                </span>
              ))}
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

      {puzzles.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <PuzzleIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-sans text-sm text-muted-foreground">No puzzles found</p>
        </div>
      )}

      {hasMore && puzzles.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-primary bg-card px-6 py-3 font-heading font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'See more'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
