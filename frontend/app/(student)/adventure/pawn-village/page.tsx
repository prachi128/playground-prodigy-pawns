'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdventureMap } from '@/components/dashboard/adventure-map';

export default function PawnVillagePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <Link
          href="/adventure"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-card-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Adventure
        </Link>
      </div>
      <div className="mb-6 overflow-hidden rounded-3xl border-2 border-emerald-200 bg-card shadow-sm">
        <div className="bg-gradient-to-r from-sky-400 to-emerald-500 px-6 py-4">
          <h1 className="font-heading text-2xl font-bold text-white">Pawn Village</h1>
          <p className="text-sm font-semibold text-white/90">
            Run, jump, and solve chess puzzles along the golden path!
          </p>
        </div>
      </div>
      <AdventureMap />
    </div>
  );
}
