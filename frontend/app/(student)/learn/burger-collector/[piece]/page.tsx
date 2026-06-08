'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { BurgerCollector } from '@/components/learn/BurgerCollector'
import toast from 'react-hot-toast'
import type { PieceTypeCode } from '@/lib/data/basics-levels'
import { Trophy } from 'lucide-react'
import { playSound } from '@/utils/audio'

const SLUG_TO_PIECE: Record<string, PieceTypeCode> = {
  rook: 'r',
  bishop: 'b',
  knight: 'n',
  queen: 'q',
  king: 'k',
  pawn: 'p',
}

export default function BurgerCollectorPiecePage() {
  const params = useParams()
  const router = useRouter()
  const slug = typeof params.piece === 'string' ? params.piece.toLowerCase() : ''
  const pieceType = SLUG_TO_PIECE[slug]
  const [showCelebration, setShowCelebration] = useState(false)
  const burstConfetti = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2
        const distance = 60 + (i % 6) * 20
        return {
          id: i,
          tx: `${Math.cos(angle) * distance}px`,
          ty: `${Math.sin(angle) * distance}px`,
          emoji: i % 4 === 0 ? '🎉' : i % 4 === 1 ? '✨' : i % 4 === 2 ? '🍔' : '⭐',
        }
      }),
    []
  )
  const fallingConfetti = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: `${(i * 97) % 100}%`,
        delay: `${(i % 12) * 80}ms`,
        duration: `${1800 + (i % 8) * 170}ms`,
        emoji: i % 5 === 0 ? '🎉' : i % 5 === 1 ? '✨' : i % 5 === 2 ? '🍔' : i % 5 === 3 ? '⭐' : '🥳',
      })),
    []
  )

  useEffect(() => {
    if (slug && !pieceType) {
      router.replace('/learn/burger-collector')
    }
  }, [slug, pieceType, router])

  if (!slug || !pieceType) {
    return null
  }

  return (
    <>
      <BurgerCollector
        pieceType={pieceType}
        onAllComplete={() => {
          playSound('win')
          setShowCelebration(true)
          toast.success('Piece complete! +50 coins, +100 XP saved. 🍔')
        }}
      />

      {showCelebration && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {fallingConfetti.map((c) => (
              <span
                key={`fall-${c.id}`}
                className="absolute -top-10 text-2xl"
                style={{
                  left: c.left,
                  animation: `burgerConfettiFall ${c.duration} linear ${c.delay} infinite`,
                }}
              >
                {c.emoji}
              </span>
            ))}
          </div>
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border-4 border-amber-300 bg-gradient-to-b from-amber-50 via-white to-orange-50 p-3 shadow-2xl sm:p-4">
            <div className="pointer-events-none absolute inset-0">
              {burstConfetti.map((c) => (
                <span
                  key={c.id}
                  className="animate-confetti-burst absolute left-1/2 top-1/2 text-2xl"
                  style={{ ['--tx' as string]: c.tx, ['--ty' as string]: c.ty } as Record<string, string>}
                >
                  {c.emoji}
                </span>
              ))}
            </div>

            <div className="relative z-10 grid items-center gap-0 md:grid-cols-[0.92fr_1fr]">
              <div className="order-2 mt-2 flex items-end justify-center md:order-1 md:mt-0 md:justify-start">
                <div className="celebration-dancer-wrap" aria-label="animated burger dancer" role="img">
                  <img
                    src="/images/burger-celebration-dancer.png"
                    alt="Dancing burger celebration character"
                    className="celebration-dancer-img"
                  />
                  <span className="celebration-note note-one">♪</span>
                  <span className="celebration-note note-two">♫</span>
                  <span className="celebration-note note-three">♪</span>
                </div>
              </div>

              <div className="order-1 text-center md:order-2 md:text-center">
                <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <Trophy className="h-6 w-6 text-amber-600" />
                </div>
                <h2 className="font-heading text-3xl font-black text-amber-900">Amazing! Piece Mastered!</h2>
                <p className="mt-2 font-heading text-sm font-semibold text-amber-900/80 sm:text-base">
                  You finished all 15 levels for this piece.
                </p>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => router.push('/learn/burger-collector')}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 font-heading text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Back to pieces
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes burgerConfettiFall {
          0% {
            transform: translateY(-5vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes dancerBob {
          0%,
          100% {
            transform: translateY(0) rotate(0deg) scale(1);
          }
          20% {
            transform: translateY(-8px) rotate(-2deg) scale(1.015);
          }
          50% {
            transform: translateY(-2px) rotate(2deg) scale(1.03);
          }
          75% {
            transform: translateY(-10px) rotate(-1deg) scale(1.02);
          }
        }
        @keyframes dancerShadow {
          0%,
          100% {
            transform: scaleX(1);
            opacity: 0.22;
          }
          50% {
            transform: scaleX(0.86);
            opacity: 0.12;
          }
        }
        @keyframes noteFloat {
          0% {
            transform: translateY(0) scale(0.85);
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          100% {
            transform: translateY(-36px) scale(1.05);
            opacity: 0;
          }
        }
        .celebration-dancer-wrap {
          position: relative;
          width: min(320px, 62vw);
          animation: dancerBob 820ms ease-in-out infinite;
          transform-origin: center bottom;
        }
        .celebration-dancer-wrap::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 50%;
          width: 68%;
          height: 16px;
          transform: translateX(-50%);
          border-radius: 9999px;
          background: rgba(120, 53, 15, 0.45);
          filter: blur(7px);
          animation: dancerShadow 820ms ease-in-out infinite;
          z-index: 0;
        }
        .celebration-dancer-img {
          position: relative;
          z-index: 1;
          width: 100%;
          height: auto;
          border: none;
          border-radius: 0;
          box-shadow: none;
        }
        .celebration-note {
          position: absolute;
          font-size: 1.3rem;
          font-weight: 700;
          color: #78350f;
          text-shadow: 0 2px 6px rgba(255, 255, 255, 0.55);
          animation: noteFloat 1350ms ease-out infinite;
          z-index: 2;
          pointer-events: none;
        }
        .note-one {
          top: 20%;
          left: 2%;
        }
        .note-two {
          top: 12%;
          right: 4%;
          animation-delay: 420ms;
        }
        .note-three {
          top: 34%;
          right: -2%;
          animation-delay: 760ms;
        }
      `}</style>
    </>
  )
}
