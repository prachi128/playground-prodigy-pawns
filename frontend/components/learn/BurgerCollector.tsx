'use client'

import Link from 'next/link'
import { useState, useCallback, useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { motion, AnimatePresence } from 'framer-motion'
import { playSound } from '@/utils/audio'
import { updateStudentStats } from '@/app/(student)/actions/game-actions'
import {
  type PieceTypeCode,
  type PieceLessonMeta,
  type PieceLessonStep,
  getPieceLessonSet,
} from '@/lib/data/basics-levels'

/** Board square colors - match dashboard primary theme */
const BOARD_DARK = 'hsl(var(--primary))'
const BOARD_LIGHT = 'hsl(var(--primary) / 0.18)'

const PIECE_TO_BOARD: Record<PieceTypeCode, string> = {
  b: 'wB',
  n: 'wN',
  r: 'wR',
  q: 'wQ',
  k: 'wK',
  p: 'wP',
}

function playPopSound() {
  if (typeof window === 'undefined') return
  try {
    playSound('correct')
  } catch {
    // no sound
  }
}

function isLegalMoveForPiece(pieceType: PieceTypeCode, from: string, to: string): boolean {
  const fx = from.charCodeAt(0) - 97
  const fy = parseInt(from[1], 10)
  const tx = to.charCodeAt(0) - 97
  const ty = parseInt(to[1], 10)
  const dx = tx - fx
  const dy = ty - fy
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)

  switch (pieceType) {
    case 'b':
      return adx === ady && adx > 0
    case 'r':
      return (dx === 0 || dy === 0) && (adx > 0 || ady > 0)
    case 'q':
      return (adx === ady || dx === 0 || dy === 0) && (adx > 0 || ady > 0)
    case 'n':
      return (adx === 2 && ady === 1) || (adx === 1 && ady === 2)
    case 'k':
      return adx <= 1 && ady <= 1 && (adx > 0 || ady > 0)
    case 'p':
      if (dx !== 0) return false
      if (fy === 2) return ty === 3 || ty === 4
      return ty === fy + 1
    default:
      return false
  }
}

function toPositionObject(heroSquare: string, pieceType: PieceTypeCode): Record<string, { pieceType: string }> {
  const boardType = pieceType === 'p' ? 'wP' : PIECE_TO_BOARD[pieceType]
  return { [heroSquare]: { pieceType: boardType } }
}

export interface BurgerCollectorProps {
  pieceType: PieceTypeCode
  initialLessonIndex?: number
  onAllComplete?: () => void
}

/** Single-lesson board: collect burgers (same data as star squares) with burger emoji overlay. */
function BurgerLessonBoard({
  meta,
  step,
  lessonIndex,
  totalLessons,
  onLessonComplete,
  onWrongMove,
}: {
  meta: PieceLessonMeta
  step: PieceLessonStep
  lessonIndex: number
  totalLessons: number
  onLessonComplete: (hasNext: boolean) => void
  onWrongMove?: (msg: string) => void
}) {
  const [heroSquare, setHeroSquare] = useState(step.startSquare)
  const [effectivePieceType, setEffectivePieceType] = useState<PieceTypeCode>(meta.pieceType)
  const [burgersRemaining, setBurgersRemaining] = useState<Set<string>>(() => new Set(step.starSquares))
  const [showComplete, setShowComplete] = useState(false)
  const [hasNext, setHasNext] = useState(false)
  const [savedRewards, setSavedRewards] = useState(false)
  const totalBurgers = step.starSquares.length
  const collectedCount = totalBurgers - burgersRemaining.size

  const position = useMemo(
    () => toPositionObject(heroSquare, effectivePieceType),
    [heroSquare, effectivePieceType]
  )

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
      if (!targetSquare || sourceSquare === targetSquare) return false
      if (sourceSquare !== heroSquare) return false
      if (!isLegalMoveForPiece(effectivePieceType, sourceSquare, targetSquare)) {
        onWrongMove?.(`${meta.pieceName}s move differently! Try again.`)
        return false
      }
      setHeroSquare(targetSquare)
      if (meta.pieceType === 'p' && targetSquare[1] === '8') {
        setEffectivePieceType('q')
      }

      if (burgersRemaining.has(targetSquare)) {
        const nextRemaining = new Set(burgersRemaining)
        nextRemaining.delete(targetSquare)
        setBurgersRemaining(nextRemaining)
        playPopSound()
        if (nextRemaining.size === 0) {
          const nextExists = lessonIndex + 1 < totalLessons
          setHasNext(nextExists)
          setShowComplete(true)
          if (!nextExists && !savedRewards) {
            setSavedRewards(true)
            updateStudentStats(50, 100).catch((e) => console.error('Failed to save rewards:', e))
          }
        }
      }
      return true
    },
    [heroSquare, effectivePieceType, meta.pieceName, meta.pieceType, burgersRemaining, lessonIndex, totalLessons, onWrongMove, savedRewards]
  )

  const squareStyles: Record<string, React.CSSProperties> = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}
    burgersRemaining.forEach((square) => {
      styles[square] = {
        background: 'radial-gradient(circle, rgba(251, 146, 60, 0.4) 35%, transparent 45%)',
        borderRadius: '50%',
      }
    })
    return styles
  }, [burgersRemaining])

  return (
    <>
      <div className="mb-2 flex items-center justify-center gap-2">
        <span className="text-2xl" aria-hidden>🍔</span>
        <span className="font-heading font-semibold text-card-foreground">
          Burgers collected: {collectedCount} / {totalBurgers}
        </span>
      </div>
      <div className="relative w-[500px] h-[500px]">
        <div className="overflow-hidden rounded-xl border-[10px] shadow-xl border-border" style={{ borderColor: 'hsl(var(--primary) / 0.4)' }}>
          <Chessboard
            options={{
              id: `burger-collector-${meta.pieceType}-${lessonIndex}`,
              position,
              onPieceDrop: handlePieceDrop,
              boardOrientation: 'white',
              darkSquareStyle: { backgroundColor: BOARD_DARK },
              lightSquareStyle: { backgroundColor: BOARD_LIGHT },
              squareStyles,
              boardStyle: { borderRadius: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' },
              showAnimations: true,
              animationDurationInMs: 280,
              allowDragging: true,
              canDragPiece: ({ square }) => square === heroSquare,
            }}
          />
        </div>
        {/* Overlay burgers with pop animation */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg" style={{ margin: '10px' }}>
          <AnimatePresence mode="popLayout">
            {Array.from(burgersRemaining).map((square) => {
              const fileIndex = square.charCodeAt(0) - 97
              const rank = parseInt(square[1], 10)
              const left = (fileIndex / 8) * 100
              const bottom = ((rank - 1) / 8) * 100
              return (
                <motion.div
                  key={square}
                  initial={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.6, opacity: 0, transition: { duration: 0.25 } }}
                  className="absolute flex items-center justify-center"
                  style={{ left: `${left}%`, bottom: `${bottom}%`, width: '12.5%', height: '12.5%' }}
                >
                  <span className="text-3xl drop-shadow-md">🍔</span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-black/50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="max-w-sm rounded-2xl border border-border bg-card px-8 py-6 text-center shadow-2xl"
              >
                <p className="mb-2 text-4xl">🍔</p>
                <h3 className="font-heading mb-2 text-2xl font-bold text-card-foreground">All burgers collected!</h3>
                <p className="mb-4 font-heading text-sm font-semibold text-muted-foreground">
                  {hasNext
                    ? 'Ready for the next lesson?'
                    : 'You finished all levels! +50 coins, +100 XP saved.'}
                </p>
                <button
                  type="button"
                  onClick={() => onLessonComplete(hasNext)}
                  className="inline-block rounded-full bg-primary px-6 py-2.5 font-heading font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {hasNext ? 'Next lesson' : 'Done'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

function BurgerLessonStudio({ pieceType, initialLessonIndex = 0, onAllComplete }: BurgerCollectorProps) {
  const meta = getPieceLessonSet(pieceType)
  const [lessonIndex, setLessonIndex] = useState(initialLessonIndex)
  const step = meta.lessons[lessonIndex]
  const totalLessons = meta.lessonCount

  const handleLessonComplete = useCallback(
    (hasNext: boolean) => {
      if (hasNext) {
        setLessonIndex((i) => Math.min(i + 1, totalLessons - 1))
      } else {
        onAllComplete?.()
      }
    },
    [totalLessons, onAllComplete]
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 p-4">
      <aside className="flex w-32 flex-shrink-0 flex-col gap-1">
        <span className="mb-1 font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lessons</span>
        {Array.from({ length: totalLessons }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLessonIndex(i)}
            className={`rounded-xl border px-3 py-2 text-left font-heading font-medium transition-colors ${
              lessonIndex === i
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-muted/50'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </aside>

      <div className="min-w-0 flex-1 flex flex-col items-center justify-center">
        <BurgerLessonBoard
          key={lessonIndex}
          meta={meta}
          step={step}
          lessonIndex={lessonIndex}
          totalLessons={totalLessons}
          onLessonComplete={handleLessonComplete}
        />
      </div>

      <aside className="w-64 flex-shrink-0 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-heading mb-2 font-bold text-card-foreground">{meta.pieceName}</h3>
          <p className="font-heading text-sm font-semibold text-muted-foreground">{meta.description}</p>
        </div>
        <div className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50/80 p-4">
          <span className="text-xl">🍔</span>
          <div>
            <h3 className="font-heading mb-1 font-bold text-card-foreground">Your goal</h3>
            <p className="font-heading text-sm font-semibold text-muted-foreground">
              Move your {meta.pieceName} to collect every burger on the board!
            </p>
          </div>
        </div>
        <Link
          href="/learn/burger-collector"
          className="group flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
        >
          <span className="text-xl" aria-hidden>
            🎲
          </span>
          <div className="flex flex-col items-start leading-tight">
            <span className="font-heading text-base font-bold text-primary-foreground">
              Pick a different piece
            </span>
            <span className="font-heading text-xs font-semibold text-primary-foreground/90">
              Try another burger-collecting hero!
            </span>
          </div>
        </Link>
      </aside>
    </div>
  )
}

export function BurgerCollector(props: BurgerCollectorProps) {
  return <BurgerLessonStudio {...props} />
}
