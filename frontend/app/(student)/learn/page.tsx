// app/(student)/learn/page.tsx - Learn Landing (Lessons & Star Collector)

'use client';

import Link from 'next/link';
import { BookOpen, Star, Hamburger } from 'lucide-react';

const learnCards = [
  {
    title: 'Lessons',
    description: 'Video lessons, readings, and interactive exercises to master chess',
    gradient: 'from-pink-400 to-rose-500',
    borderColor: 'border-pink-300',
    emoji: '📚',
    href: '/learn/lessons',
    icon: BookOpen,
  },
  {
    title: 'Burger Collector',
    description: 'Collect stars by completing challenges and leveling up your skills',
    gradient: 'from-amber-400 to-yellow-500',
    borderColor: 'border-amber-300',
    emoji: '🍔',
    href: '/learn/burger-collector',
    icon: Hamburger,
  },
];

export default function LearnLandingPage() {
  return (
    <div className="mx-auto max-w-6xl pt-6">
      {/* Mascot Speech Bubble */}
      <section className="mb-5">
        <div className="flex items-start gap-3">
          <div className="animate-mascot-bounce shrink-0 text-5xl">♞</div>
          <div className="relative flex-1">
            <div className="absolute -left-2 top-4 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-white" />
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="font-heading text-lg font-bold text-card-foreground">
                What would you like to learn today?
              </p>
              <p className="mt-0.5 font-heading text-sm font-semibold text-muted-foreground">
                Pick Lessons or collect stars with challenges! 🎓
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Learn Cards */}
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {learnCards.map((card, idx) => (
            <Link
              key={card.title}
              href={card.href}
              className={`animate-bounce-in hover-wiggle group flex flex-col overflow-hidden rounded-3xl border-2 ${card.borderColor} bg-white shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              style={{ animationDelay: `${idx * 120}ms` }}
            >
              <div
                className={`relative flex h-40 w-full items-center justify-center overflow-hidden bg-gradient-to-br ${card.gradient} sm:h-44 transition-transform duration-300 group-hover:scale-105`}
              >
                <card.icon className="h-20 w-20 text-white/90 transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl shadow-lg">
                  {card.emoji}
                </div>
              </div>
              <div className={`bg-gradient-to-r ${card.gradient} px-4 py-4 text-center`}>
                <span className="font-heading text-xl font-bold text-white drop-shadow-sm">
                  {card.title}
                </span>
                <p className="mt-0.5 font-heading text-xs font-semibold text-white/80">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
