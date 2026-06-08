// app/(student)/learn/lessons/page.tsx - Lessons placeholder

'use client';

import Link from 'next/link';
import { ArrowLeft, Clock3, Sparkles } from 'lucide-react';

export default function LearnLessonsPage() {
  return (
    <div className="mx-auto max-w-4xl pt-6">
      <Link
        href="/learn"
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-heading font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to Learn
      </Link>

      <section className="overflow-hidden rounded-3xl border-2 border-pink-200 bg-card shadow-sm">
        <div className="bg-gradient-to-r from-pink-400 to-rose-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-white" />
            <h1 className="font-heading text-2xl font-bold text-white">Lessons</h1>
          </div>
        </div>

        <div className="px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-pink-600">
            <Clock3 className="h-8 w-8" />
          </div>
          <p className="font-heading text-3xl font-bold text-card-foreground">Coming soon...</p>
          <p className="mt-2 font-heading text-sm font-semibold text-muted-foreground">
            We are building interactive chess lessons for students. Stay tuned!
          </p>
        </div>
      </section>
    </div>
  );
}
