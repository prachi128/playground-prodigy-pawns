"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Chess } from "chess.js"
import { Chessboard } from "react-chessboard"
import { puzzleAPI, type Puzzle } from "@/lib/api"
import {
  applyOpponentReplies,
  formatPlayedUci,
  initializePuzzlePlayState,
  resolvePuzzleFormat,
} from "@/lib/utils"
import { useAuthStore } from "@/lib/store"
import { getShopBoardSquareStyles } from "@/lib/shop-cosmetics"

type NeonPuzzlePanelProps = {
  puzzle: Puzzle
  attemptNumber: 1 | 2
  onSolved: (xpEarned: number) => void
  onFailed: () => void
}

export function NeonPuzzlePanel({ puzzle, attemptNumber, onSolved, onFailed }: NeonPuzzlePanelProps) {
  const { user } = useAuthStore()
  const playState = useMemo(
    () =>
      initializePuzzlePlayState(puzzle.fen, puzzle.moves, resolvePuzzleFormat(puzzle)),
    [puzzle.fen, puzzle.moves, puzzle.puzzle_format, puzzle.lichess_id],
  )
  const [game, setGame] = useState(() => new Chess(playState.displayFen))
  const [movesMade, setMovesMade] = useState<string[]>(() => playState.movesMade)
  const playerColor = playState.playerColor
  const [seconds, setSeconds] = useState(30)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [result, setResult] = useState<"playing" | "solved" | "failed">("playing")
  const [startTime] = useState(() => Date.now())

  const shopBoardSquareStyles = useMemo(
    () => getShopBoardSquareStyles(user?.equipped_board_theme_item_key),
    [user?.equipped_board_theme_item_key],
  )

  useEffect(() => {
    if (result !== "playing") return
    const iv = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(iv)
          setResult("failed")
          onFailed()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(iv)
  }, [onFailed, result])

  const onDrop = useCallback(
    (from: string, to: string) => {
      if (result !== "playing" || game.turn() !== playerColor) return false
      try {
        const workingGame = new Chess(game.fen())
        const move = workingGame.move({ from, to, promotion: "q" })
        if (!move) return false
        const played = formatPlayedUci(move)
        const expected = playState.solutionMoves[movesMade.length]
        if (!expected || played.toLowerCase() !== expected.toLowerCase()) {
          setResult("failed")
          onFailed()
          return false
        }

        let updatedMoves = [...movesMade, played]
        const replies = applyOpponentReplies(
          workingGame,
          playState.solutionMoves,
          updatedMoves,
          playerColor,
        )
        updatedMoves = replies.movesMade
        setMovesMade(updatedMoves)
        setGame(workingGame)

        const completed = updatedMoves.length >= playState.solutionMoves.length
        if (!completed) return true

        const timeTaken = Math.max(1, Math.floor((Date.now() - startTime) / 1000))
        puzzleAPI
          .submitAttempt(puzzle.id, {
            is_solved: true,
            moves_made: updatedMoves.join(" "),
            time_taken: timeTaken,
            hints_used: hintsUsed,
          })
          .then((resp) => {
            setResult("solved")
            onSolved(resp?.xp_earned ?? puzzle.xp_reward ?? 0)
          })
          .catch(() => {
            setResult("solved")
            onSolved(puzzle.xp_reward ?? 0)
          })
        return true
      } catch {
        return false
      }
    },
    [result, game, movesMade, playState, startTime, puzzle, hintsUsed, onFailed, onSolved, playerColor],
  )

  function showHint() {
    if (result !== "playing") return
    setHintsUsed((h) => h + 1)
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#04070fe8] p-3">
      <div className="flex w-full max-w-4xl gap-4 rounded-xl border-2 border-yellow-300 bg-[#080d16] p-4 shadow-2xl">
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-heading text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
              Checkpoint Puzzle - Attempt {attemptNumber}
            </p>
            <p className={`font-heading text-2xl font-black ${seconds <= 8 ? "text-red-400" : "text-emerald-300"}`}>{seconds}</p>
          </div>
          <div className="relative" style={{ maxWidth: 420 }}>
            <Chessboard
              key={game.fen()}
              options={{
                position: game.fen(),
                allowDragging: result === "playing",
                canDragPiece: ({ square }) => {
                  if (!square || result !== "playing" || game.turn() !== playerColor) return false
                  const piece = game.get(square as any)
                  return Boolean(piece && piece.color === playerColor)
                },
                onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) =>
                  sourceSquare && targetSquare ? onDrop(sourceSquare, targetSquare) : false,
                darkSquareStyle: shopBoardSquareStyles.darkSquareStyle,
                lightSquareStyle: shopBoardSquareStyles.lightSquareStyle,
              }}
            />
          </div>
        </div>
        <div className="w-64 shrink-0">
          <p className="rounded-md border border-yellow-300/50 bg-black/30 p-2 text-xs text-slate-200">
            <span className="font-bold text-yellow-300">Theme:</span> {puzzle.theme || "unknown"}
          </p>
          <p className="mt-2 rounded-md border border-slate-600 bg-black/30 p-2 text-xs text-slate-200">
            Solve the full line correctly. A wrong move fails this attempt.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={showHint} className="rounded border border-yellow-300 px-3 py-1 text-xs font-bold text-yellow-300">
              Hint
            </button>
          </div>
          {result === "solved" && <p className="mt-2 text-xs text-emerald-300">Solved. Reward applied.</p>}
          {result === "failed" && <p className="mt-2 text-xs text-red-300">Failed. Returning to run flow.</p>}
        </div>
      </div>
    </div>
  )
}
