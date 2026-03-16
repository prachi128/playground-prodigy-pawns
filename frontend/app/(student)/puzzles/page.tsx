// app/(student)/puzzles/page.tsx - Puzzles Landing (Solve puzzles | Puzzle racer)

'use client';

import Link from 'next/link';
import { Puzzle, Zap, ArrowLeft } from 'lucide-react';

const puzzleOptions = [
  {
    title: 'Solve Puzzles',
    description: 'Pick a puzzle, take your time, and find the best move. Earn XP and sharpen your tactics.',
    href: '/puzzles/solve',
    gradient: 'from-cyan-400 to-blue-500',
    borderColor: 'border-cyan-300',
    emoji: '🧩',
    icon: Puzzle,
  },
  {
    title: 'Puzzle Racer',
    description: 'Solve as many puzzles as you can before time runs out. Race the clock and climb the leaderboard!',
    href: '/puzzles/racer',
    gradient: 'from-orange-400 to-amber-500',
    borderColor: 'border-orange-300',
    emoji: '🏎️',
    icon: Zap,
  },
];

export default function PuzzlesLandingPage() {
  return (
    <div className="mx-auto max-w-6xl pt-2">
      {/* Intro */}
      <section className="mb-8">
        <div className="flex items-start gap-3">
          <div className="animate-mascot-bounce shrink-0 text-5xl">♞</div>
          <div className="relative flex-1">
            <div className="absolute -left-2 top-4 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-white" />
            <div className="rounded-2xl bg-card p-4 shadow-sm border-2 border-border">
              <p className="font-heading text-lg font-bold text-card-foreground">
                Train your tactics! Choose how you want to play 🧠
              </p>
              <p className="mt-0.5 font-heading text-sm font-semibold text-muted-foreground">
                Solve at your own pace or race against the clock.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Two options */}
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {puzzleOptions.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className={`animate-bounce-in hover-wiggle group flex flex-col overflow-hidden rounded-3xl border-2 ${card.borderColor} bg-card shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                style={{ animationDelay: `${idx * 120}ms` }}
              >
                <div className={`relative h-36 w-full overflow-hidden bg-gradient-to-br ${card.gradient} sm:h-40 flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}>
                  <span className="text-6xl sm:text-7xl drop-shadow-lg">{card.emoji}</span>
                  <div className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
                    <Icon className="h-6 w-6 text-gray-700" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-heading text-xl font-bold text-card-foreground">
                    {card.title}
                  </h2>
                  <p className="mt-2 font-sans text-sm text-muted-foreground">
                    {card.description}
                  </p>
                  <div className={`mt-4 inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r ${card.gradient} px-4 py-2 font-heading text-sm font-bold text-white shadow-sm group-hover:shadow-md transition-shadow`}>
                    Get started
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
