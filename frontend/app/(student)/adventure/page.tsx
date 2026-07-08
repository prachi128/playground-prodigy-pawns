// app/(student)/adventure/page.tsx - Adventure placeholder

'use client';

import { Clock3, Map } from 'lucide-react';

export default function AdventurePage() {
  return (
    <div className="mx-auto max-w-4xl pt-6">
      <section className="overflow-hidden rounded-3xl border-2 border-amber-200 bg-card shadow-sm">
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <Map className="h-6 w-6 text-white" />
            <h1 className="font-heading text-2xl font-bold text-white">Adventure</h1>
          </div>
        </div>

        <div className="px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Clock3 className="h-8 w-8" />
          </div>
          <p className="font-heading text-3xl font-bold text-card-foreground">Coming soon...</p>
        </div>
      </section>
    </div>
  );
}
