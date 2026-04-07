// app/(student)/learn/burger-collector/page.tsx - Burger Collector Landing (choose piece)

'use client'

import Link from 'next/link'
import { PIECE_LESSON_SETS } from '@/lib/data/basics-levels'
import type { PieceTypeCode } from '@/lib/data/basics-levels'
import { ChevronRight } from 'lucide-react'

const PIECE_ORDER: PieceTypeCode[] = ['r', 'b', 'n', 'q', 'k', 'p']
const SLUG_BY_PIECE: Record<PieceTypeCode, string> = {
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  q: 'queen',
  k: 'king',
  p: 'pawn',
}

export default function BurgerCollectorLandingPage() {
  return (
    <div className="relative mx-auto max-w-6xl overflow-hidden pt-4 sm:pt-6">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 20%, #fbbf24 0, transparent 25%), radial-gradient(circle at 90% 30%, #fb923c 0, transparent 28%), radial-gradient(circle at 50% 100%, #f472b6 0, transparent 35%)',
        }}
        aria-hidden
      />

      {/* Hero intro */}
      <section className="mb-6">
        <div className="relative overflow-hidden rounded-3xl border-4 border-amber-400 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 p-5 shadow-xl sm:p-7">
          <div className="absolute -right-6 -top-6 text-8xl opacity-20" aria-hidden>
            🍔
          </div>
          <div className="absolute -bottom-4 left-8 text-6xl opacity-15" aria-hidden>
            🍟
          </div>
          <div className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-amber-400 to-orange-500 p-3 text-5xl shadow-lg">
              🍔
            </div>
            <div>
              <p className="font-heading text-xs font-bold uppercase tracking-widest text-amber-900/70">
                Learn chess moves · yummy edition
              </p>
              <h1 className="font-heading text-3xl font-black text-amber-950 sm:text-4xl">Burger Collector</h1>
              <p className="mt-1 max-w-xl font-heading text-sm font-semibold text-amber-950/85 sm:text-base">
                Grab every burger with your piece! Early levels are easy snack runs — later levels add lava 🌋 and rocks 🪨.
                Can you beat all {PIECE_LESSON_SETS.r.lessonCount} levels?
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Piece cards */}
      <section className="mb-8">
        <h2 className="mb-3 font-heading text-lg font-bold text-card-foreground">Pick your hero</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIECE_ORDER.map((pieceType, idx) => {
            const meta = PIECE_LESSON_SETS[pieceType]
            const slug = SLUG_BY_PIECE[pieceType]
            return (
              <Link
                key={pieceType}
                href={`/learn/burger-collector/${slug}`}
                className="animate-bounce-in hover-wiggle group relative flex items-center gap-4 overflow-hidden rounded-3xl border-4 border-amber-300/90 bg-white p-4 shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-amber-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <span className="absolute right-3 top-3 text-2xl opacity-40 transition-opacity group-hover:opacity-70" aria-hidden>
                  🍔
                </span>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-2xl font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  {meta.pieceName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-lg font-extrabold text-card-foreground">{meta.pieceName}</h2>
                  <p className="font-heading text-sm font-semibold text-muted-foreground">
                    {meta.lessonCount} levels · hotter snacks as you go!
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 shrink-0 text-amber-600" />
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
