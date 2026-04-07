"use client"

import { useEffect, useState } from "react"
import type { Puzzle } from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import { calculateSolveReward, getDistanceBand } from "./reward-policy"
import { NeonHud } from "./NeonHud"
import { NeonPuzzlePanel } from "./NeonPuzzlePanel"
import { GameOverScreen, StartScreen } from "./NeonScreens"
import { useNeonRunnerEngine } from "./useNeonRunnerEngine"
import { useNeonPuzzleQueue } from "./useNeonPuzzleQueue"

type Overlay = "none" | "puzzle" | "gameOver"

export function NeonRunnerGame() {
  const { user, updateUser } = useAuthStore()
  const [overlay, setOverlay] = useState<Overlay>("none")
  const [gameOverReason, setGameOverReason] = useState("")
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null)
  const [excludePuzzleIds, setExcludePuzzleIds] = useState<number[]>([])
  const puzzleQueue = useNeonPuzzleQueue()

  const {
    canvasRef,
    gameWidth,
    gameHeight,
    started,
    runner,
    start,
    restartRun,
    applyCheckpointSolve,
    applyCheckpointFail,
  } = useNeonRunnerEngine({
    puzzleOpen: overlay === "puzzle",
    onCheckpoint: async () => {
      const puzzle = await puzzleQueue.getNextPuzzle(excludePuzzleIds)
      if (!puzzle) {
        setGameOverReason("No puzzles available from database for allowed themes.")
        setOverlay("gameOver")
        return
      }
      setActivePuzzle(puzzle)
      setExcludePuzzleIds((prev) => [...prev.slice(-20), puzzle.id])
      setOverlay("puzzle")
    },
    onGameOver: (reason) => {
      setGameOverReason(reason)
      setOverlay("gameOver")
    },
  })

  useEffect(() => {
    if (!started) return
    if (puzzleQueue.poolSize < 20 && !puzzleQueue.loading) {
      void puzzleQueue.refill()
    }
  }, [started, puzzleQueue])

  function onPuzzleSolved(xpEarned: number) {
    const reward = calculateSolveReward({
      solveStreak: runner.solveStreak + 1,
      distanceBand: getDistanceBand(runner.playerX),
      baseFuel: 0.2,
      baseScore: 180,
    })
    applyCheckpointSolve(reward)
    if (user) {
      updateUser({ total_xp: user.total_xp + xpEarned + reward.xpBonus })
    }
    setOverlay("none")
    setActivePuzzle(null)
  }

  function onPuzzleFailed() {
    applyCheckpointFail()
    if (runner.currentCheckpointAttempt >= 2) {
      setGameOverReason("Checkpoint failed twice. Run restarted.")
      setOverlay("gameOver")
      return
    }
    void puzzleQueue.getNextPuzzle(excludePuzzleIds).then((nextPuzzle) => {
      if (!nextPuzzle) {
        setGameOverReason("No retry puzzle available.")
        setOverlay("gameOver")
        return
      }
      setActivePuzzle(nextPuzzle)
      setExcludePuzzleIds((prev) => [...prev.slice(-20), nextPuzzle.id])
    })
  }

  function restart() {
    setOverlay("none")
    setGameOverReason("")
    setActivePuzzle(null)
    restartRun()
  }

  if (!started) {
    return <StartScreen onStart={start} />
  }

  return (
    <div className="mx-auto max-w-6xl pt-2">
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-800 bg-black shadow-2xl">
        <NeonHud runner={runner} allowedThemes={puzzleQueue.allowedThemes} targetThemeCount={puzzleQueue.targetThemeCount} />
        <canvas
          ref={canvasRef}
          width={gameWidth}
          height={gameHeight}
          className="block w-full"
        />

        {overlay === "puzzle" && activePuzzle && (
          <NeonPuzzlePanel puzzle={activePuzzle} attemptNumber={runner.currentCheckpointAttempt as 1 | 2} onSolved={onPuzzleSolved} onFailed={onPuzzleFailed} />
        )}
        {overlay === "gameOver" && (
          <GameOverScreen
            reason={gameOverReason}
            runner={runner}
            onRestart={restart}
          />
        )}
      </div>
    </div>
  )
}
