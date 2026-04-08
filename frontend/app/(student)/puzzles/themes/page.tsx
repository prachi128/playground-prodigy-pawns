// app/(student)/puzzles/themes/page.tsx - Puzzle Themes (Lichess-style groups)

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { puzzleAPI, PuzzleThemeGroup, userAPI } from '@/lib/api';
import { getThemeEmoji } from '@/lib/utils';
import { Puzzle as PuzzleIcon, Loader2, ArrowLeft } from 'lucide-react';
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

export default function PuzzleThemesPage() {
  const router = useRouter();
  const [themeGroups, setThemeGroups] = useState<PuzzleThemeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [puzzleRating, setPuzzleRating] = useState<number | null>(null);
  const [startingTheme, setStartingTheme] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const selectedDifficultyRef = useRef(selectedDifficulty);
  selectedDifficultyRef.current = selectedDifficulty;
  const cacheRef = useRef<Record<string, PuzzleThemeGroup[]>>({});

  const loadThemes = useCallback(
    async (difficulty: string) => {
      try {
        const data = await puzzleAPI.getThemes(difficulty || undefined);
        const key = difficulty || '__all__';
        cacheRef.current[key] = data;
        const current = selectedDifficultyRef.current;
        const isCurrentTab =
          current === difficulty || (current === '' && difficulty === '');
        if (isCurrentTab) {
          setThemeGroups(data);
        }
      } catch (error) {
        console.error('Failed to load puzzle themes:', error);
        toast.error('Failed to load puzzle themes');
      } finally {
        const current = selectedDifficultyRef.current;
        const isCurrentTab =
          current === difficulty || (current === '' && difficulty === '');
        if (isCurrentTab) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const startTheme = useCallback(
    async (theme: string) => {
      if (startingTheme) return;
      const difficulty = selectedDifficultyRef.current;
      setStartingTheme(theme);
      try {
        const next = await puzzleAPI.getNext({
          difficulty,
          theme,
          excludeAttempted: true,
        });
        const params = new URLSearchParams();
        if (difficulty) params.set('difficulty', difficulty);
        params.set('theme', theme);
        router.push(`/puzzles/${next.id}?${params.toString()}`);
      } catch {
        toast.error('No unseen puzzles found in this theme yet.');
      } finally {
        setStartingTheme(null);
      }
    },
    [router, startingTheme]
  );

  useEffect(() => {
    if (!isInitialized) return;

    const key = selectedDifficulty || '__all__';
    const cached = cacheRef.current[key];

    if (cached) {
      setThemeGroups(cached);
      setIsLoading(false);
      loadThemes(selectedDifficulty);
      return;
    }

    setIsLoading(true);
    setThemeGroups([]);
    loadThemes(selectedDifficulty);
  }, [selectedDifficulty, isInitialized, loadThemes]);

  useEffect(() => {
    let cancelled = false;

    const initFromPuzzleRating = async () => {
      try {
        const stats = await userAPI.getStats();
        if (cancelled) return;
        setPuzzleRating(stats.puzzle_rating ?? null);
        const difficulty = getDifficultyForPuzzleRating(stats.puzzle_rating);
        setSelectedDifficulty(difficulty);
      } catch (error) {
        console.error('Failed to load user stats for puzzle difficulty selection:', error);
      } finally {
        if (!cancelled) {
          setIsInitialized(true);
        }
      }
    };

    initFromPuzzleRating();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="font-heading font-semibold text-muted-foreground">Loading puzzle themes...</p>
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
        {puzzleRating != null && (
          <p className="font-sans text-xs text-muted-foreground">
            Puzzle Rating: <span className="font-heading font-bold text-foreground">{puzzleRating}</span>
          </p>
        )}
      </div>

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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themeGroups.map((group) => (
          <div key={group.group} className="md:col-span-2 lg:col-span-3">
            <h3 className="font-heading text-lg font-bold text-card-foreground mb-3">{group.group}</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((theme) => (
                <button
                  type="button"
                  key={`${group.group}-${theme.key}`}
                  onClick={() => startTheme(theme.key)}
                  disabled={startingTheme != null}
                  className="bg-card rounded-xl p-4 shadow-lg border-2 border-border hover:border-primary/50 transition-all hover:shadow-xl cursor-pointer transform hover:scale-[1.02] flex flex-col h-full text-left"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 pr-2">
                      <h4 className="font-heading text-lg font-bold text-card-foreground mb-1">
                        {getThemeEmoji(theme.key)} {theme.label}
                      </h4>
                      <p className="font-sans text-xs text-muted-foreground">
                        Practice {theme.label.toLowerCase()} puzzles at this level.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-sans text-xs text-muted-foreground mb-3">
                    <span>Available puzzles</span>
                    <span className="font-heading font-bold text-card-foreground">{theme.count}</span>
                  </div>

                  <span className="mt-auto w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-heading font-bold py-1.5 px-3 rounded-lg text-xs text-center">
                    {startingTheme === theme.key ? 'Starting...' : 'Start Theme →'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {themeGroups.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <PuzzleIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-sans text-sm text-muted-foreground">No themes found</p>
        </div>
      )}
    </div>
  );
}
