'use client'

import { useState, useCallback, useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Target } from 'lucide-react'
import { playSound } from '@/utils/audio'
import { updateStudentStats } from '@/app/(student)/actions/game-actions'
import {
  type PieceTypeCode,
  type PieceLessonMeta,
  type PieceLessonStep,
  getPieceLessonSet,
} from '@/lib/data/basics-levels'
import type { StarCollectorLevel } from '@/lib/data/basics-levels'

/** Board square colors - match dashboard primary theme */
const BOARD_DARK = 'hsl(var(--primary))'
const BOARD_LIGHT = 'hsl(var(--primary) / 0.18)'

/** react-chessboard piece type: white piece codes (wB, wN, wR, wQ, wK, wP). */
const PIECE_TO_BOARD: Record<PieceTypeCode, string> = {
  b: 'wB',
  n: 'wN',
  r: 'wR',
  q: 'wQ',
  k: 'wK',
  p: 'wP',
}

/** Play a short "pop" sound when collecting a star. */
function playPopSound() {
  if (typeof window === 'undefined') return
  try {
    playSound('correct')
  } catch {
    // fallback: no sound
  }
}

/** Check if a move is legal for the given piece type (ignoring other pieces). */
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

/** Position object for react-chessboard: only the hero piece (no dummy kings). */
function toPositionObject(heroSquare: string, pieceType: PieceTypeCode): Record<string, { pieceType: string }> {
  const boardType = pieceType === 'p' ? 'wP' : PIECE_TO_BOARD[pieceType]
  return { [heroSquare]: { pieceType: boardType } }
}

// --- Generic piece-lesson mode props ---
export interface StarCollectorPieceLessonProps {
  pieceType: PieceTypeCode
  initialLessonIndex?: number
  onAllComplete?: () => void
}

// --- Legacy mode props (existing FEN + stars levels) ---
export interface StarCollectorLegacyProps {
  level: StarCollectorLevel
  onLevelComplete: () => void
  onWrongMove?: (message: string) => void
}

export type StarCollectorProps = StarCollectorPieceLessonProps | StarCollectorLegacyProps

function isPieceLessonProps(props: StarCollectorProps): props is StarCollectorPieceLessonProps {
  return 'pieceType' in props
}

/** Single-lesson engine: empty board, only the lesson piece (no dummy kings), star squares, infinite moves, pawn promotion. */
function PieceLessonBoard({
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
  const [starsRemaining, setStarsRemaining] = useState<Set<string>>(() => new Set(step.starSquares))
  const [showComplete, setShowComplete] = useState(false)
  const [hasNext, setHasNext] = useState(false)
  const [savedRewards, setSavedRewards] = useState(false)
  const totalStars = step.starSquares.length
  const collectedCount = totalStars - starsRemaining.size

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

      if (starsRemaining.has(targetSquare)) {
        const nextRemaining = new Set(starsRemaining)
        nextRemaining.delete(targetSquare)
        setStarsRemaining(nextRemaining)
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
    [heroSquare, effectivePieceType, meta.pieceName, meta.pieceType, starsRemaining, lessonIndex, totalLessons, onWrongMove, savedRewards]
  )

  const squareStyles: Record<string, React.CSSProperties> = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}
    starsRemaining.forEach((square) => {
      styles[square] = {
        background: 'radial-gradient(circle, hsl(var(--primary)) 35%, transparent 45%)',
        borderRadius: '50%',
      }
    })
    return styles
  }, [starsRemaining])

  return (
    <>
      <div className="mb-2 flex items-center justify-center gap-2">
        <Star className="h-5 w-5 text-primary fill-primary" />
        <span className="font-heading font-semibold text-card-foreground">
          Stars Collected: {collectedCount} / {totalStars}
        </span>
      </div>
      <div className="relative w-[500px] h-[500px]">
        <div className="overflow-hidden rounded-xl border-[10px] shadow-xl border-border" style={{ borderColor: 'hsl(var(--primary) / 0.4)' }}>
          <Chessboard
            options={{
              id: `star-collector-${meta.pieceType}-${lessonIndex}`,
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
        {/* Overlay stars with pop animation */}
        <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden" style={{ margin: '10px' }}>
          <AnimatePresence mode="popLayout">
            {Array.from(starsRemaining).map((square) => {
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
                  <span className="text-3xl drop-shadow-md">★</span>
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
                className="max-w-sm rounded-2xl bg-card px-8 py-6 text-center shadow-2xl border border-border"
              >
                <h3 className="font-heading mb-2 text-2xl font-bold text-card-foreground">Level Complete!</h3>
                <p className="mb-4 font-heading text-sm font-semibold text-muted-foreground">
                  {hasNext
                    ? 'You collected all the stars. Ready for the next lesson?'
                    : 'You finished all levels! +50 coins, +100 XP saved.'}
                </p>
                <button
                  type="button"
                  onClick={() => onLessonComplete(hasNext)}
                  className="inline-block rounded-full bg-primary px-6 py-2.5 font-heading font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {hasNext ? 'Next Lesson' : 'Done'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

/** Studio layout: left sidebar (lessons), center board, right description + goal. */
function PieceLessonStudio({
  pieceType,
  initialLessonIndex = 0,
  onAllComplete,
}: StarCollectorPieceLessonProps) {
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
      {/* Left: Lesson sidebar */}
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

      {/* Center: Board */}
      <div className="min-w-0 flex-1 flex flex-col items-center justify-center">
        <PieceLessonBoard
          key={lessonIndex}
          meta={meta}
          step={step}
          lessonIndex={lessonIndex}
          totalLessons={totalLessons}
          onLessonComplete={handleLessonComplete}
        />
      </div>

      {/* Right: Piece description + Your Goal */}
      <aside className="w-64 flex-shrink-0 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-heading mb-2 font-bold text-card-foreground">{meta.pieceName}</h3>
          <p className="font-heading text-sm font-semibold text-muted-foreground">{meta.description}</p>
        </div>
        <div className="flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h3 className="font-heading mb-1 font-bold text-card-foreground">Your Goal</h3>
            <p className="font-heading text-sm font-semibold text-muted-foreground">{meta.goalText}</p>
          </div>
        </div>
      </aside>
    </div>
  )
}

/** Legacy StarCollector: single level with FEN + stars (e.g. from basicsLevels). */
function LegacyStarCollector({ level, onLevelComplete, onWrongMove }: StarCollectorLegacyProps) {
  const [game, setGame] = useState(() => new Chess(level.fen))
  const [collectedStars, setCollectedStars] = useState<Set<string>>(new Set())
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const pieceChar = level.piece === 'pawn' ? 'p' : level.piece[0].toLowerCase()
  const findHero = useCallback(() => {
    const board = game.board()
    const color = level.pieceColor === 'w' ? 'w' : 'b'
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = String.fromCharCode(97 + col) + (8 - row)
        const piece = board[row][col]
        if (piece && piece.color === color) {
          const pt = piece.type === 'p' ? 'p' : piece.type
          if (pt.toLowerCase() === pieceChar) return square
        }
      }
    }
    return null
  }, [game, level.piece, level.pieceColor, pieceChar])

  const validSquares = useMemo(() => {
    const hero = findHero()
    if (!hero) return {}
    const moves = game.moves({ square: hero as any, verbose: true })
    const styles: Record<string, React.CSSProperties> = {}
    moves.forEach((m) => {
      styles[m.to] = { backgroundColor: '#10b981' }
    })
    level.stars.forEach((s) => {
      if (!collectedStars.has(s)) styles[s] = { backgroundColor: '#fbbf24', borderRadius: '50%' }
    })
    return styles
  }, [game, findHero, collectedStars, level.stars])

  const handleMove = useCallback(
    (from: string, to: string): boolean => {
      const copy = new Chess(game.fen())
      const move = copy.move({ from, to, promotion: 'q' })
      if (!move) {
        setShake(true)
        setTimeout(() => setShake(false), 500)
        setErrorMessage(level.piece === 'rook' ? 'Rooks move straight!' : 'Invalid move!')
        setTimeout(() => setErrorMessage(null), 3000)
        onWrongMove?.('Invalid move!')
        return false
      }
      setGame(copy)
      if (level.stars.includes(to) && !collectedStars.has(to)) {
        const next = new Set(collectedStars)
        next.add(to)
        setCollectedStars(next)
        playPopSound()
        if (next.size === level.stars.length) {
          setTimeout(() => {
            playSound('win')
            onLevelComplete()
          }, 500)
        }
      }
      return true
    },
    [game, level.stars, collectedStars, level.piece, onLevelComplete, onWrongMove]
  )

  const onSquareClick = useCallback(
    (square: string) => {
      const hero = findHero()
      if (!hero) return
      if (selectedSquare == null) {
        if (square === hero) setSelectedSquare(square)
      } else {
        if (square === selectedSquare) setSelectedSquare(null)
        else handleMove(selectedSquare, square)
        setSelectedSquare(null)
      }
    },
    [findHero, selectedSquare, handleMove]
  )

  const onPieceDrop = useCallback(
    (source: string, target: string) => {
      if (source !== findHero()) return false
      return handleMove(source, target)
    },
    [findHero, handleMove]
  )

  const squareStyles = { ...validSquares }
  if (selectedSquare) squareStyles[selectedSquare] = { backgroundColor: '#3b82f6' }

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mb-4 flex items-center gap-2">
        <Star className="h-5 w-5 fill-primary text-primary" />
        <span className="font-heading font-semibold text-card-foreground">{collectedStars.size} / {level.stars.length}</span>
      </div>
      <motion.div animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : {}} transition={{ duration: 0.4 }}>
        <div style={{ width: 500, height: 500 }}>
          <Chessboard
            options={{
              id: 'legacy-star-collector',
              position: game.fen(),
              onSquareClick: ({ square }) => onSquareClick(square),
              onPieceDrop: ({ sourceSquare, targetSquare }) =>
                targetSquare ? onPieceDrop(sourceSquare, targetSquare) : false,
              squareStyles,
              boardOrientation: 'white',
              darkSquareStyle: { backgroundColor: BOARD_DARK },
              lightSquareStyle: { backgroundColor: BOARD_LIGHT },
              boardStyle: { borderRadius: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' },
              showAnimations: true,
              allowDragging: true,
            }}
          />
        </div>
      </motion.div>
      <p className="mt-4 text-center font-heading text-sm font-semibold text-muted-foreground">{level.instructions}</p>
    </div>
  )
}

/** Reusable Star Collector: generic piece-lesson engine or legacy FEN-based level. */
export function StarCollector(props: StarCollectorProps) {
  if (isPieceLessonProps(props)) {
    return <PieceLessonStudio {...props} />
  }
  return <LegacyStarCollector {...props} />
}
