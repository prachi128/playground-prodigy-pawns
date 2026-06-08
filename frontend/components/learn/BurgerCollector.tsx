'use client'

import Link from 'next/link'
import { useState, useCallback, useMemo, useEffect, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { playSound } from '@/utils/audio'
import { updateStudentStats } from '@/app/(student)/actions/game-actions'
import {
  type PieceTypeCode,
  type PieceLessonMeta,
  type PieceLessonStep,
  getPieceLessonSet,
} from '@/lib/data/basics-levels'

/** Board square colors — classic game-style (readable, kid-friendly) */
const BOARD_DARK = '#769656'
const BOARD_LIGHT = '#eeeed2'

const PIECE_TO_BOARD: Record<PieceTypeCode, string> = {
  b: 'wB',
  n: 'wN',
  r: 'wR',
  q: 'wQ',
  k: 'wK',
  p: 'wP',
}
const FILES = 'abcdefgh'

function playPopSound() {
  if (typeof window === 'undefined') return
  try {
    playSound('correct')
  } catch {
    // no sound
  }
}

function playOopsSound() {
  if (typeof window === 'undefined') return
  try {
    playSound('wrong')
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

function splitSquare(square: string): { file: number; rank: number } {
  return { file: square.charCodeAt(0) - 97, rank: parseInt(square[1], 10) }
}

function toSquare(file: number, rank: number): string {
  return `${String.fromCharCode(97 + file)}${rank}`
}

function inBounds(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 1 && rank <= 8
}

function pawnMoveSets(
  from: string,
  burgersRemaining: Set<string>
): { legal: string[]; capture: string[] } {
  const { file, rank } = splitSquare(from)
  const legal: string[] = []
  const capture: string[] = []

  const oneForwardRank = rank + 1
  if (inBounds(file, oneForwardRank)) {
    const oneForward = toSquare(file, oneForwardRank)
    if (!burgersRemaining.has(oneForward)) {
      legal.push(oneForward)
      if (rank === 2) {
        const twoForwardRank = rank + 2
        const twoForward = toSquare(file, twoForwardRank)
        if (inBounds(file, twoForwardRank) && !burgersRemaining.has(twoForward)) {
          legal.push(twoForward)
        }
      }
    }
  }

  for (const df of [-1, 1]) {
    const tf = file + df
    const tr = rank + 1
    if (!inBounds(tf, tr)) continue
    const target = toSquare(tf, tr)
    if (burgersRemaining.has(target)) capture.push(target)
  }

  return { legal, capture }
}

/** Legal empty-square destinations vs burger squares (capture-style highlight). Blocked squares excluded. */
function getCollectorLegalDestinations(
  from: string,
  pieceType: PieceTypeCode,
  blocked: Set<string>,
  burgersRemaining: Set<string>
): { legal: string[]; capture: string[] } {
  if (pieceType === 'p') {
    return pawnMoveSets(from, burgersRemaining)
  }

  const legal: string[] = []
  const capture: string[] = []
  for (let rank = 1; rank <= 8; rank += 1) {
    for (let fi = 0; fi < 8; fi += 1) {
      const sq = `${FILES[fi]}${rank}`
      if (sq === from || blocked.has(sq)) continue
      if (!isLegalMoveForPiece(pieceType, from, sq)) continue
      if (burgersRemaining.has(sq)) capture.push(sq)
      else legal.push(sq)
    }
  }
  return { legal, capture }
}

function toPositionObject(heroSquare: string, pieceType: PieceTypeCode): Record<string, { pieceType: string }> {
  const boardType = pieceType === 'p' ? 'wP' : PIECE_TO_BOARD[pieceType]
  return { [heroSquare]: { pieceType: boardType } }
}

/** 1–4 = warm-up → 5–6 = tricky → 7–8 = boss (matches lesson index + 1) */
function difficultyLabel(lessonIndex: number): { title: string; emoji: string; chipClass: string } {
  const n = lessonIndex + 1
  if (n <= 2) {
    return { title: 'Snack run', emoji: '😋', chipClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
  }
  if (n <= 4) {
    return { title: 'Combo meal', emoji: '🎯', chipClass: 'bg-amber-100 text-amber-900 border-amber-300' }
  }
  if (n <= 6) {
    return { title: 'Spicy challenge', emoji: '🌶️', chipClass: 'bg-orange-100 text-orange-900 border-orange-300' }
  }
  return { title: 'Boss platter', emoji: '👑', chipClass: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-400' }
}

type CollectibleStyle = {
  items: string[]
  burgerScale: number
}

function collectibleStyleForLevel(lessonIndex: number): CollectibleStyle {
  const level = lessonIndex + 1
  if (level <= 2) return { items: ['🍔'], burgerScale: 1.0 }
  if (level <= 4) return { items: ['🍔', '🍟', '🥤'], burgerScale: 1.0 }
  if (level === 5) return { items: ['🍔', '🌶️'], burgerScale: 1.0 }
  if (level === 6) return { items: ['🍔', '🌶️', '🫑'], burgerScale: 1.0 }
  if (level === 7) return { items: ['🍔', '🥬', '🍅', '🧅'], burgerScale: 1.25 }
  if (level === 8) return { items: ['🍔', '🥤', '🥬', '🍅'], burgerScale: 1.15 }
  if (level <= 11) return { items: ['🍔', '🍟', '🥤', '🌶️', '🫑'], burgerScale: 1.2 }
  return { items: ['🍔', '🍟', '🥤', '🌶️', '🫑', '🥬', '🍅', '🧅'], burgerScale: 1.25 }
}

function distance(a: string, b: string): number {
  const sa = splitSquare(a)
  const sb = splitSquare(b)
  return Math.abs(sa.file - sb.file) + Math.abs(sa.rank - sb.rank)
}

function legalSquaresFromStart(startSquare: string, pieceType: PieceTypeCode): string[] {
  const out: string[] = []
  for (let rank = 1; rank <= 8; rank += 1) {
    for (let fi = 0; fi < 8; fi += 1) {
      const sq = `${FILES[fi]}${rank}`
      if (sq === startSquare) continue
      if (pieceType === 'p') continue
      if (isLegalMoveForPiece(pieceType, startSquare, sq)) out.push(sq)
    }
  }
  return out
}

function spreadPick(candidates: string[], count: number, startSquare: string): string[] {
  if (count <= 0) return []
  if (candidates.length <= count) return [...candidates]
  const picked: string[] = []
  const byStartDist = [...candidates].sort((a, b) => distance(b, startSquare) - distance(a, startSquare))
  picked.push(byStartDist[0])
  while (picked.length < count) {
    let best = ''
    let bestScore = -1
    for (const c of candidates) {
      if (picked.includes(c)) continue
      const minDistToPicked = Math.min(...picked.map((p) => distance(c, p)))
      const score = minDistToPicked * 10 + distance(c, startSquare)
      if (score > bestScore) {
        bestScore = score
        best = c
      }
    }
    if (!best) break
    picked.push(best)
  }
  return picked
}

function generatePawnLessons(totalLessons: number): PieceLessonStep[] {
  const starts = ['b2', 'c2', 'd2', 'e2', 'f2', 'g2']
  const lessons: PieceLessonStep[] = []
  for (let i = 0; i < totalLessons; i += 1) {
    const startSquare = starts[i % starts.length]
    const { file } = splitSquare(startSquare)
    let currentFile = file
    let currentRank = 2
    let dir = i % 2 === 0 ? -1 : 1
    const steps = Math.min(2 + Math.floor(i / 2), 6)
    const starSquares: string[] = []
    for (let step = 0; step < steps; step += 1) {
      const nextRank = currentRank + 1
      let nextFile = currentFile + dir
      if (!inBounds(nextFile, nextRank)) {
        dir = -dir
        nextFile = currentFile + dir
      }
      if (!inBounds(nextFile, nextRank)) break
      starSquares.push(toSquare(nextFile, nextRank))
      currentFile = nextFile
      currentRank = nextRank
    }
    lessons.push({ startSquare, starSquares })
  }
  return lessons
}

function generateBurgerLessons(meta: PieceLessonMeta, totalLessons: number): PieceLessonStep[] {
  if (meta.pieceType === 'p') {
    return generatePawnLessons(totalLessons)
  }

  const startsByPiece: Record<Exclude<PieceTypeCode, 'p'>, string[]> = {
    r: ['d4', 'e5', 'c3', 'f6', 'b5', 'g4'],
    b: ['d4', 'e5', 'c4', 'f5', 'b3', 'g6'],
    n: ['d4', 'e5', 'c4', 'f5', 'b3', 'g6'],
    q: ['d4', 'e5', 'c4', 'f5', 'b3', 'g6'],
    k: ['d4', 'e5', 'c4', 'f5', 'd5', 'e4'],
  }

  const pieceStarts = startsByPiece[meta.pieceType as Exclude<PieceTypeCode, 'p'>]
  const lessons: PieceLessonStep[] = []
  for (let i = 0; i < totalLessons; i += 1) {
    const startSquare = pieceStarts[i % pieceStarts.length]
    const candidates = legalSquaresFromStart(startSquare, meta.pieceType)
    const requestedCount = Math.min(3 + Math.floor(i / 2), meta.pieceType === 'k' || meta.pieceType === 'n' ? 8 : 12)
    let candidatePool = candidates

    // Rook ramp: from level 4 onward, use off-line targets that are NOT one rook move
    // from the start square. This forces route planning with intermediate moves.
    if (meta.pieceType === 'r' && i >= 3) {
      const s = splitSquare(startSquare)
      const twoStepCandidates: string[] = []
      for (let rank = 1; rank <= 8; rank += 1) {
        for (let fi = 0; fi < 8; fi += 1) {
          const sq = `${FILES[fi]}${rank}`
          if (sq === startSquare) continue
          const t = splitSquare(sq)
          if (t.file === s.file || t.rank === s.rank) continue
          twoStepCandidates.push(sq)
        }
      }
      if (twoStepCandidates.length > 0) {
        candidatePool = twoStepCandidates
      }
    }

    const starSquares = spreadPick(candidatePool, requestedCount, startSquare)
    lessons.push({ startSquare, starSquares })
  }
  return lessons
}

export interface BurgerCollectorProps {
  pieceType: PieceTypeCode
  initialLessonIndex?: number
  onAllComplete?: () => void
}

function blockedSet(): Set<string> {
  return new Set()
}

/** Single-lesson board: collect burgers (same data as star squares) with burger emoji overlay. */
function BurgerLessonBoard({
  meta,
  step,
  lessonIndex,
  totalLessons,
  onLessonComplete,
  onWrongMove,
  onStashStatsChange,
  unlockedUpToIndex,
}: {
  meta: PieceLessonMeta
  step: PieceLessonStep
  lessonIndex: number
  totalLessons: number
  unlockedUpToIndex: number
  onLessonComplete: (hasNext: boolean) => void
  onWrongMove?: (msg: string) => void
  onStashStatsChange?: (stats: { collected: number; total: number }) => void
}) {
  const blockedSquares = useMemo(() => blockedSet(), [])

  const [heroSquare, setHeroSquare] = useState(step.startSquare)
  const [effectivePieceType, setEffectivePieceType] = useState<PieceTypeCode>(meta.pieceType)
  const [burgersRemaining, setBurgersRemaining] = useState<Set<string>>(() => new Set(step.starSquares))
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [legalTargets, setLegalTargets] = useState<string[]>([])
  const [captureTargets, setCaptureTargets] = useState<string[]>([])
  const [showComplete, setShowComplete] = useState(false)
  const [hasNext, setHasNext] = useState(false)
  const [savedRewards, setSavedRewards] = useState(false)
  const totalBurgers = step.starSquares.length
  const collectedCount = totalBurgers - burgersRemaining.size
  const collectibleStyle = useMemo(() => collectibleStyleForLevel(lessonIndex), [lessonIndex])
  const collectiblesBySquare = useMemo(() => {
    const out = new Map<string, string>()
    const sortedSquares = [...step.starSquares].sort()
    const itemPool = collectibleStyle.items
    sortedSquares.forEach((sq, idx) => {
      out.set(sq, itemPool[idx % itemPool.length])
    })
    return out
  }, [step.starSquares, collectibleStyle.items])

  useEffect(() => {
    onStashStatsChange?.({ collected: collectedCount, total: totalBurgers })
  }, [collectedCount, totalBurgers, onStashStatsChange])

  const position = useMemo(
    () => toPositionObject(heroSquare, effectivePieceType),
    [heroSquare, effectivePieceType]
  )

  const clearSelection = useCallback(() => {
    setSelectedSquare(null)
    setLegalTargets([])
    setCaptureTargets([])
  }, [])

  const tryApplyMove = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (sourceSquare === targetSquare) return false
      if (sourceSquare !== heroSquare) return false

      const { legal, capture } = getCollectorLegalDestinations(
        heroSquare,
        effectivePieceType,
        blockedSquares,
        burgersRemaining
      )
      if (!legal.includes(targetSquare) && !capture.includes(targetSquare)) {
        const msg = `${meta.pieceName}s move differently! Try again.`
        toast.error(msg, { duration: 2200 })
        onWrongMove?.(msg)
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
          if (nextExists) {
            setHasNext(true)
            setShowComplete(true)
          } else if (!savedRewards) {
            // Final lesson: award rewards and trigger piece-complete celebration immediately.
            setSavedRewards(true)
            updateStudentStats(50, 100).catch((e) => console.error('Failed to save rewards:', e))
            onLessonComplete(false)
          }
        }
      }
      clearSelection()
      return true
    },
    [
      heroSquare,
      effectivePieceType,
      meta.pieceName,
      meta.pieceType,
      burgersRemaining,
      lessonIndex,
      totalLessons,
      onWrongMove,
      savedRewards,
      blockedSquares,
      clearSelection,
    ]
  )

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
      if (!targetSquare) return false
      return tryApplyMove(sourceSquare, targetSquare)
    },
    [tryApplyMove]
  )

  const handleSquareClick = useCallback(
    (square: string) => {
      if (showComplete) return

      const loadTargets = () =>
        getCollectorLegalDestinations(heroSquare, effectivePieceType, blockedSquares, burgersRemaining)

      if (!selectedSquare) {
        if (square !== heroSquare) return
        const { legal, capture } = loadTargets()
        if (legal.length === 0 && capture.length === 0) return
        setSelectedSquare(heroSquare)
        setLegalTargets(legal)
        setCaptureTargets(capture)
        return
      }
      if (square === selectedSquare) {
        clearSelection()
        return
      }
      if (legalTargets.includes(square) || captureTargets.includes(square)) {
        tryApplyMove(heroSquare, square)
        return
      }
      if (square === heroSquare) {
        const { legal, capture } = loadTargets()
        if (legal.length > 0 || capture.length > 0) {
          setSelectedSquare(heroSquare)
          setLegalTargets(legal)
          setCaptureTargets(capture)
        } else {
          clearSelection()
        }
      } else {
        clearSelection()
      }
    },
    [
      showComplete,
      selectedSquare,
      heroSquare,
      effectivePieceType,
      blockedSquares,
      burgersRemaining,
      legalTargets,
      captureTargets,
      tryApplyMove,
      clearSelection,
    ]
  )

  const squareStyles: Record<string, CSSProperties> = useMemo(() => {
    const styles: Record<string, CSSProperties> = {}
    if (selectedSquare) {
      styles[selectedSquare] = {
        ...(styles[selectedSquare] || {}),
        backgroundColor: 'rgba(190,242,100,0.38)',
      }
    }
    legalTargets.forEach((s) => {
      styles[s] = {
        ...(styles[s] || {}),
        backgroundImage: 'radial-gradient(circle, rgba(163,230,53,0.82) 18%, rgba(163,230,53,0) 22%)',
      }
    })
    captureTargets.forEach((s) => {
      styles[s] = {
        ...(styles[s] || {}),
        backgroundColor: 'rgba(251,191,36,0.45)',
      }
    })
    return styles
  }, [burgersRemaining, selectedSquare, legalTargets, captureTargets])

  return (
    <>
      <div className="relative mx-auto w-full max-w-[min(100vw-2rem,500px)] aspect-square max-h-[min(100vw-2rem,500px)]">
        <div
          className="absolute -inset-2 -z-10 rounded-3xl bg-black/10 blur-md"
          aria-hidden
        />
        <div className="relative h-full w-full overflow-hidden rounded-2xl border-2 border-border shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <Chessboard
            options={{
              id: `burger-collector-${meta.pieceType}-${lessonIndex}`,
              position,
              onPieceDrop: handlePieceDrop,
              onSquareClick: ({ square }) => {
                if (square) handleSquareClick(square)
              },
              boardOrientation: 'white',
              darkSquareStyle: { backgroundColor: BOARD_DARK },
              lightSquareStyle: { backgroundColor: BOARD_LIGHT },
              squareStyles,
              boardStyle: { borderRadius: '8px', boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.12)' },
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
                  initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 1.75, opacity: 0, y: -28, transition: { duration: 0.28 } }}
                  className="absolute flex items-center justify-center"
                  style={{ left: `${left}%`, bottom: `${bottom}%`, width: '12.5%', height: '12.5%' }}
                >
                  <span
                    className="text-[clamp(1.5rem,5.5vw,2.25rem)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
                    style={{
                      transform:
                        collectiblesBySquare.get(square) === '🍔'
                          ? `scale(${collectibleStyle.burgerScale})`
                          : 'scale(1)',
                    }}
                  >
                    {collectiblesBySquare.get(square) ?? '🍔'}
                  </span>
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
              className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-black/55 p-4"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0, rotate: -2 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 18, stiffness: 320 }}
                className="max-w-sm rounded-3xl border-4 border-amber-400 bg-gradient-to-b from-amber-50 via-white to-orange-50 px-6 py-6 text-center shadow-2xl"
              >
                <motion.p
                  className="mb-2 text-5xl"
                  animate={{ rotate: [0, -6, 6, -4, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 0.6 }}
                >
                  🍔✨
                </motion.p>
                <h3 className="font-heading mb-2 text-2xl font-black text-amber-900">Yum! All snacks collected!</h3>
                <p className="mb-4 font-heading text-sm font-semibold text-amber-900/80">
                  {hasNext
                    ? 'You leveled up your snack skills! Ready for the next one?'
                    : 'Mega feast complete! +50 coins, +100 XP saved.'}
                </p>
                <button
                  type="button"
                  onClick={() => onLessonComplete(hasNext)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-heading text-base font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="h-5 w-5" />
                  {hasNext ? 'Next level!' : 'Back to menu'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

function BurgerLessonStudio({ pieceType, onAllComplete }: BurgerCollectorProps) {
  const meta = getPieceLessonSet(pieceType)
  const burgerLessons = useMemo(() => generateBurgerLessons(meta, 15), [meta])
  /** Max lesson index the student may open (0-based). Completing level n unlocks n+1. */
  const [unlockedUpToIndex, setUnlockedUpToIndex] = useState(0)
  const [lessonIndex, setLessonIndex] = useState(0)
  const step = burgerLessons[lessonIndex]
  const totalLessons = burgerLessons.length
  const levelChip = difficultyLabel(lessonIndex)

  const [stashStats, setStashStats] = useState(() => ({
    collected: 0,
    total: burgerLessons[0]?.starSquares.length ?? 0,
  }))

  const handleStashStatsChange = useCallback((stats: { collected: number; total: number }) => {
    setStashStats(stats)
  }, [])

  const handleLessonComplete = useCallback(
    (hasNext: boolean) => {
      setUnlockedUpToIndex((u) => Math.min(Math.max(u, lessonIndex + (hasNext ? 1 : 0)), totalLessons - 1))
      if (hasNext) {
        const nextIndex = Math.min(lessonIndex + 1, totalLessons - 1)
        setLessonIndex(nextIndex)
        setStashStats({ collected: 0, total: burgerLessons[nextIndex].starSquares.length })
      } else {
        onAllComplete?.()
      }
    },
    [lessonIndex, totalLessons, onAllComplete, burgerLessons]
  )

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:flex-row sm:gap-6 sm:p-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, #fbbf24 0, transparent 35%), radial-gradient(circle at 80% 10%, #fb7185 0, transparent 30%), radial-gradient(circle at 50% 90%, #34d399 0, transparent 40%)',
        }}
        aria-hidden
      />

      <aside className="flex w-full flex-shrink-0 flex-row flex-wrap content-start gap-1.5 sm:w-[4.5rem] sm:flex-col sm:gap-1">
        <span className="mb-0 w-full text-center font-heading text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground sm:mb-0 sm:text-left">
          Levels
        </span>
        {Array.from({ length: totalLessons }, (_, i) => {
          const unlocked = i <= unlockedUpToIndex
          return (
            <button
              key={i}
              type="button"
              disabled={!unlocked}
              onClick={() => {
                if (!unlocked) return
                setLessonIndex(i)
                setStashStats({ collected: 0, total: burgerLessons[i].starSquares.length })
              }}
              aria-label={unlocked ? `Open level ${i + 1}` : `Level ${i + 1} locked`}
              title={unlocked ? `Level ${i + 1}` : 'Finish the previous level to unlock'}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 font-heading text-xs font-bold transition-all sm:h-8 sm:w-full sm:max-w-[2.5rem] sm:px-0 ${
                !unlocked
                  ? 'cursor-not-allowed border-muted bg-muted/35 text-muted-foreground opacity-80'
                  : lessonIndex === i
                    ? 'border-amber-500 bg-gradient-to-br from-amber-100 to-orange-100 text-amber-950 shadow-md'
                    : 'border-border bg-card text-card-foreground hover:border-amber-300/60 hover:bg-amber-50/50'
              }`}
            >
              {unlocked ? (
                i + 1
              ) : (
                <Lock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              )}
            </button>
          )
        })}
      </aside>

      <div className="min-w-0 flex flex-1 flex-col items-center justify-start">
        <BurgerLessonBoard
          key={lessonIndex}
          meta={meta}
          step={step}
          lessonIndex={lessonIndex}
          totalLessons={totalLessons}
          unlockedUpToIndex={unlockedUpToIndex}
          onLessonComplete={handleLessonComplete}
          onStashStatsChange={handleStashStatsChange}
        />
      </div>

      <aside className="w-full flex-shrink-0 space-y-3 sm:w-64">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <div
            className={`flex w-full flex-wrap items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-center font-heading text-sm font-bold shadow-sm ${levelChip.chipClass}`}
          >
            <span aria-hidden>{levelChip.emoji}</span>
            <span>
              Level {lessonIndex + 1}: {levelChip.title}
            </span>
          </div>
        </motion.div>
        <div
          className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 text-center shadow-md sm:text-left"
          aria-label="Snack collection progress"
        >
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-3xl" aria-hidden>
              🍔
            </span>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="font-heading text-[10px] font-bold uppercase tracking-wide text-amber-800 sm:text-xs">Snack stash</p>
              <p className="font-heading text-lg font-extrabold leading-tight text-amber-950 sm:text-xl">
                {stashStats.collected} / {stashStats.total} collected
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/80 p-4 shadow-md">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              🏎️
            </span>
            <h3 className="font-heading text-lg font-black text-amber-950">{meta.pieceName} burger run</h3>
          </div>
          <p className="font-heading text-sm font-semibold text-amber-900/85">{meta.description}</p>
        </div>
        <div className="rounded-2xl border-2 border-orange-300 bg-white/90 p-4 shadow-md">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <h3 className="font-heading font-bold text-card-foreground">Your mission</h3>
          </div>
          <p className="font-heading text-sm font-semibold text-muted-foreground">
            Drag your {meta.pieceName} to collect all food items using legal chess moves.
          </p>
        </div>
        <Link
          href="/learn/burger-collector"
          className="group flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-center shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500"
        >
          <span className="text-xl" aria-hidden>
            🎲
          </span>
          <div className="flex flex-col items-start leading-tight">
            <span className="font-heading text-sm font-bold text-white sm:text-base">Pick another hero</span>
            <span className="font-heading text-xs font-semibold text-white/90">Try a different piece!</span>
          </div>
        </Link>
      </aside>
    </div>
  )
}

export function BurgerCollector(props: BurgerCollectorProps) {
  return <BurgerLessonStudio key={props.pieceType} {...props} />
}
