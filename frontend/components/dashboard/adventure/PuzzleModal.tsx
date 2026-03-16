"use client"

import { useCallback, useState } from "react"
import { Chess } from "chess.js"
import { Chessboard } from "react-chessboard"
import { ArrowRight, Lightbulb, RotateCcw, X } from "lucide-react"
import { puzzleAPI, Puzzle } from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import toast from "react-hot-toast"

interface PuzzleModalProps {
  puzzle: Puzzle
  onClose: () => void
  onSolve: (coins: number, score: number) => void
}

export function PuzzleModal({ puzzle, onClose, onSolve }: PuzzleModalProps) {
  const { user, updateUser } = useAuthStore()
  const [puzzleGame, setPuzzleGame] = useState<Chess>(new Chess(puzzle.fen))
  const [puzzleMoves, setPuzzleMoves] = useState<string[]>([])
  const [puzzleHints, setPuzzleHints] = useState(0)
  const [puzzleStartTime] = useState(Date.now())
  const [puzzleResult, setPuzzleResult] = useState<"solved" | "wrong" | null>(null)

  const onPuzzleDrop = useCallback(
    (src: string, dst: string) => {
      if (puzzleResult) return false
      try {
        const move = puzzleGame.move({ from: src, to: dst, promotion: "q" })
        if (!move) return false
        const newMoves = [...puzzleMoves, `${src}${dst}`]
        setPuzzleMoves(newMoves)
        setPuzzleGame(new Chess(puzzleGame.fen()))

        const solution = puzzle.moves.split(" ")
        const done = newMoves.length >= solution.length
        const correct = newMoves.every((m, i) => {
          const sol = solution[i]
          return m === sol || m === sol.replace(/[+=]/, "")
        })

        if (done) {
          const timeTaken = Math.floor((Date.now() - puzzleStartTime) / 1000)
          puzzleAPI
            .submitAttempt(puzzle.id, {
              is_solved: correct,
              moves_made: newMoves.join(" "),
              time_taken: timeTaken,
              hints_used: puzzleHints,
            })
            .then((result) => {
              if (correct && user && result.xp_earned) {
                updateUser({ total_xp: user.total_xp + result.xp_earned })
              }
            })
            .catch(() => {})

          if (correct) {
            setPuzzleResult("solved")
            onSolve(50, 500)
          } else {
            setPuzzleResult("wrong")
          }
        }
        return true
      } catch {
        return false
      }
    },
    [puzzleGame, puzzle, puzzleMoves, puzzleResult, puzzleStartTime, puzzleHints, user, updateUser, onSolve]
  )

  const handleHint = useCallback(() => {
    const solution = puzzle.moves.split(" ")
    if (puzzleMoves.length < solution.length) {
      const next = solution[puzzleMoves.length]
      toast(`Try: ${next.substring(0, 2)} → ${next.substring(2, 4)}`, { icon: "💡", duration: 4000 })
      setPuzzleHints((h) => h + 1)
    }
  }, [puzzle, puzzleMoves])

  const resetBoard = useCallback(() => {
    setPuzzleGame(new Chess(puzzle.fen))
    setPuzzleMoves([])
    setPuzzleResult(null)
  }, [puzzle])

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
            <p className="font-heading text-sm font-bold text-gray-300">Find the best move!</p>
            <div style={{ maxWidth: 320 }}>
              <Chessboard
                key={puzzleGame.fen()}
                options={{
                  position: puzzleGame.fen(),
                  onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) =>
                    sourceSquare && targetSquare ? onPuzzleDrop(sourceSquare, targetSquare) : false,
                  boardStyle: { borderRadius: "8px", boxShadow: "0 5px 15px rgba(0,0,0,0.4)" },
                  darkSquareStyle: { backgroundColor: "#6b8e23" },
                  lightSquareStyle: { backgroundColor: "#f0d9b5" },
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
