"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Chess } from "chess.js"
import { Chessboard } from "react-chessboard"
import { ArrowRight, Lightbulb, RotateCcw, X } from "lucide-react"
import { puzzleAPI, Puzzle } from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import {
  applyOpponentReplies,
  formatPlayedUci,
  initializePuzzlePlayState,
  resolvePuzzleFormat,
} from "@/lib/utils"
import { getShopBoardSquareStyles } from "@/lib/shop-cosmetics"
import toast from "react-hot-toast"

interface PuzzleModalProps {
  puzzle: Puzzle
  onClose: () => void
  onSolve: (coins: number, score: number) => void
}

export function PuzzleModal({ puzzle, onClose, onSolve }: PuzzleModalProps) {
  const { user, updateUser } = useAuthStore()
  const playState = useMemo(
    () =>
      initializePuzzlePlayState(puzzle.fen, puzzle.moves, resolvePuzzleFormat(puzzle)),
    [puzzle.fen, puzzle.moves, puzzle.puzzle_format, puzzle.lichess_id],
  )
  const [puzzleGame, setPuzzleGame] = useState<Chess>(() => new Chess(playState.displayFen))
  const [movesMade, setMovesMade] = useState<string[]>(() => playState.movesMade)
  const [playerColor, setPlayerColor] = useState<"w" | "b">(() => playState.playerColor)
  const [puzzleHints, setPuzzleHints] = useState(0)
  const puzzleStartTimeRef = useRef<number>(0)
  const [puzzleResult, setPuzzleResult] = useState<"solved" | "wrong" | null>(null)

  const shopBoardSquareStyles = useMemo(
    () => getShopBoardSquareStyles(user?.equipped_board_theme_item_key),
    [user?.equipped_board_theme_item_key],
  )

  const resetBoard = useCallback(() => {
    const fresh = initializePuzzlePlayState(puzzle.fen, puzzle.moves)
    setPuzzleGame(new Chess(fresh.displayFen))
    setMovesMade(fresh.movesMade)
    setPlayerColor(fresh.playerColor)
    setPuzzleResult(null)
    puzzleStartTimeRef.current = 0
  }, [puzzle])

  const onPuzzleDrop = useCallback(
    (src: string, dst: string) => {
      if (puzzleResult || puzzleGame.turn() !== playerColor) return false
      try {
        if (puzzleStartTimeRef.current === 0) {
          puzzleStartTimeRef.current = Date.now()
        }
        const workingGame = new Chess(puzzleGame.fen())
        const move = workingGame.move({ from: src, to: dst, promotion: "q" })
        if (!move) return false

        const played = formatPlayedUci(move)
        const expected = playState.solutionMoves[movesMade.length]
        if (!expected || played !== expected) {
          setPuzzleResult("wrong")
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
        setPuzzleGame(workingGame)

        const isComplete = updatedMoves.length >= playState.solutionMoves.length
        if (!isComplete) return true

        const timeTaken = Math.floor((Date.now() - puzzleStartTimeRef.current) / 1000)
        puzzleAPI
          .submitAttempt(puzzle.id, {
            is_solved: true,
            moves_made: updatedMoves.join(" "),
            time_taken: timeTaken,
            hints_used: puzzleHints,
          })
          .then((result) => {
            if (result.is_solved && user && result.xp_earned) {
              updateUser({ total_xp: user.total_xp + result.xp_earned })
            }
            if (result.is_solved) {
              setPuzzleResult("solved")
              onSolve(50, 500)
            } else {
              setPuzzleResult("wrong")
            }
          })
          .catch(() => {})
        return true
      } catch {
        return false
      }
    },
    [
      puzzleGame,
      puzzle,
      movesMade,
      puzzleResult,
      puzzleHints,
      user,
      updateUser,
      onSolve,
      playState,
      playerColor,
    ],
  )

  const handleHint = useCallback(() => {
    if (movesMade.length < playState.solutionMoves.length) {
      const next = playState.solutionMoves[movesMade.length]
      toast(`Try: ${next.substring(0, 2)} → ${next.substring(2, 4)}`, { icon: "💡", duration: 4000 })
      setPuzzleHints((h) => h + 1)
    }
  }, [playState.solutionMoves, movesMade])

  const sideLabel = playerColor === "w" ? "White to move" : "Black to move"

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full mx-4"
        style={{ background: "#1a1a2e", border: "4px solid #f0a830" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: "linear-gradient(to right, #f0a830, #d89020)" }}
        >
          <h3
            className="font-heading text-lg font-black text-white"
            style={{ textShadow: "2px 2px 0 #805010" }}
          >
            ? BLOCK PUZZLE!
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Result banner */}
        {puzzleResult === "solved" && (
          <div className="px-4 py-3 text-center" style={{ background: "#208020" }}>
            <p className="font-heading text-lg font-black text-white">CORRECT! +50 COINS ⭐</p>
            <button
              onClick={onClose}
              className="mt-2 rounded-lg px-6 py-2 font-heading font-black text-white hover:scale-105 transition"
              style={{ background: "linear-gradient(to bottom, #e04040, #c02020)", border: "2px solid #ff6060" }}
            >
              CONTINUE <ArrowRight className="inline h-4 w-4 ml-1" />
            </button>
          </div>
        )}
        {puzzleResult === "wrong" && (
          <div className="px-4 py-3 text-center" style={{ background: "#802020" }}>
            <p className="font-heading text-lg font-black text-white">NOT QUITE!</p>
            <button
              onClick={resetBoard}
              className="mt-2 rounded-lg px-6 py-2 font-heading font-black text-white hover:scale-105 transition mr-2"
              style={{ background: "linear-gradient(to bottom, #f0a830, #c07818)", border: "2px solid #f8d878" }}
            >
              <RotateCcw className="inline h-4 w-4 mr-1" /> RETRY
            </button>
            <button
              onClick={onClose}
              className="mt-2 rounded-lg px-6 py-2 font-heading font-black text-gray-300 hover:text-white transition"
              style={{ background: "#333", border: "2px solid #555" }}
            >
              SKIP
            </button>
          </div>
        )}

        {/* Chessboard */}
        {!puzzleResult && (
          <div className="p-4 flex flex-col items-center gap-3">
            <p className="font-heading text-sm font-bold text-gray-300">{sideLabel}</p>
            <div className="relative" style={{ maxWidth: 320 }}>
              <Chessboard
                key={puzzleGame.fen()}
                options={{
                  position: puzzleGame.fen(),
                  allowDragging: true,
                  canDragPiece: ({ square }) => {
                    if (!square || puzzleGame.turn() !== playerColor) return false
                    const piece = puzzleGame.get(square as any)
                    return Boolean(piece && piece.color === playerColor)
                  },
                  onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) =>
                    sourceSquare && targetSquare ? onPuzzleDrop(sourceSquare, targetSquare) : false,
                  boardStyle: { borderRadius: "8px", boxShadow: "0 5px 15px rgba(0,0,0,0.4)" },
                  darkSquareStyle: shopBoardSquareStyles.darkSquareStyle,
                  lightSquareStyle: shopBoardSquareStyles.lightSquareStyle,
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleHint}
                className="rounded-lg px-4 py-2 font-heading text-sm font-black text-white hover:scale-105 transition"
                style={{ background: "linear-gradient(to bottom, #f0a830, #c07818)", border: "2px solid #f8d878" }}
              >
                <Lightbulb className="inline h-4 w-4 mr-1" /> HINT
              </button>
              <button
                onClick={resetBoard}
                className="rounded-lg px-4 py-2 font-heading text-sm font-black text-gray-300 hover:text-white transition"
                style={{ background: "#333", border: "2px solid #555" }}
              >
                <RotateCcw className="inline h-4 w-4 mr-1" /> RESET
              </button>
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 font-heading text-sm font-black text-gray-400 hover:text-white transition"
                style={{ background: "#222", border: "2px solid #444" }}
              >
                SKIP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
