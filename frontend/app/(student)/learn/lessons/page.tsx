'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

import { lessonAPI, Lesson } from '@/lib/api';

function levelBadge(level: string): string {
  switch (level) {
    case 'beginner':
      return 'border-green-200 bg-green-50 text-green-700';
    case 'intermediate':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'advanced':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'super_advanced':
      return 'border-purple-200 bg-purple-50 text-purple-700';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

export default function LearnLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  useEffect(() => {
    lessonAPI
      .getMyLessons()
      .then(setLessons)
      .catch(() => toast.error('Failed to load lessons'))
      .finally(() => setLoading(false));
  }, []);

  const visibleLessons = useMemo(() => {
    if (filter === 'completed') return lessons.filter((lesson) => lesson.student_completed);
    if (filter === 'pending') return lessons.filter((lesson) => !lesson.student_completed);
    return lessons;
  }, [filter, lessons]);

  return (
    <div className="mx-auto max-w-6xl pt-6">
      <Link
        href="/learn"
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-heading font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to Learn
      </Link>

      <section className="overflow-hidden rounded-3xl border-2 border-pink-200 bg-card shadow-sm">
        <div className="bg-gradient-to-r from-pink-400 to-rose-500 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-white" />
              <div>
                <h1 className="font-heading text-2xl font-bold text-white">Lessons</h1>
                <p className="font-heading text-sm font-semibold text-white/85">
                  Lessons opened by your coach appear here.
                </p>
              </div>
            </div>
            <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
              {lessons.length} total
            </div>
          </div>
        </div>

        <div className="border-b border-border/70 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {[
              ['all', 'All'],
              ['pending', 'To do'],
              ['completed', 'Completed'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value as 'all' | 'completed' | 'pending')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : visibleLessons.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 font-heading text-2xl font-bold text-card-foreground">No lessons yet</p>
              <p className="mt-2 font-heading text-sm font-semibold text-muted-foreground">
                Your coach has not opened any lessons for you yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/learn/lessons/${lesson.id}`}
                  className="rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-xl font-bold text-card-foreground">{lesson.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {lesson.summary || 'Open this lesson to start learning.'}
                      </p>
                    </div>
                    {lesson.student_completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${levelBadge(lesson.level)}`}>
                      {lesson.level.replaceAll('_', ' ')}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        lesson.student_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {lesson.student_completed ? 'Completed' : 'Open'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
