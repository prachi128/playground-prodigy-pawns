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
    <div className="mx-auto max-w-6xl pt-6">
      {/* Mascot Speech Bubble - match learn landing */}
      <section className="mb-5">
        <div className="flex items-start gap-3">
          <div className="animate-mascot-bounce shrink-0 text-5xl">♞</div>
          <div className="relative flex-1">
            <div className="absolute -left-2 top-4 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-white" />
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="font-heading text-lg font-bold text-card-foreground">
                Burger Collector
              </p>
              <p className="mt-0.5 font-heading text-sm font-semibold text-muted-foreground">
                Move your piece to collect every burger on the board. Choose a piece to start! 🍔
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Piece cards - burger theme (warm orange/amber) */}
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIECE_ORDER.map((pieceType, idx) => {
            const meta = PIECE_LESSON_SETS[pieceType]
            const slug = SLUG_BY_PIECE[pieceType]
            return (
              <Link
                key={pieceType}
                href={`/learn/burger-collector/${slug}`}
                className="animate-bounce-in hover-wiggle group flex items-center gap-4 overflow-hidden rounded-3xl border-2 border-orange-300 bg-white p-4 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 text-2xl font-bold text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
                  {meta.pieceName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading font-semibold text-card-foreground">
                    {meta.pieceName}
                  </h2>
                  <p className="font-heading text-sm text-muted-foreground">
                    {meta.lessonCount} lessons
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-orange-500" />
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
