import Link from "next/link"
import type { ReactNode } from "react"
import type { RunnerState } from "./types"

export function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <Overlay>
      <h1 className="font-heading text-5xl font-black text-cyan-300">Neon Runner</h1>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">x Chess Fuel</p>
      <p className="mt-5 max-w-md text-center text-sm text-slate-300">Infinite run. Equal-distance chess checkpoints. Fail once, retry with a new puzzle, fail again and the run restarts.</p>
      <button onClick={onStart} className="mt-7 rounded border-2 border-cyan-300 px-5 py-2 font-bold text-cyan-200">
        Start Running
      </button>
      <Link href="/adventure" className="mt-3 text-sm text-slate-400 underline underline-offset-2">
        Back to Adventure games
      </Link>
    </Overlay>
  )
}

export function GameOverScreen({
  reason,
  runner,
  onRestart,
}: {
  reason: string
  runner: RunnerState
  onRestart: () => void
}) {
  return (
    <Overlay>
      <h2 className="font-heading text-4xl font-black text-red-400">Game Over</h2>
      <p className="mt-2 text-sm text-slate-300">{reason}</p>
      <p className="mt-2 text-sm text-slate-300">Score: {runner.score}</p>
      <p className="mt-1 text-sm text-slate-300">Puzzles solved: {runner.puzzlesSolved}</p>
      <p className="mt-1 text-sm text-slate-300">Best combo: {runner.maxCombo}x</p>
      <button onClick={onRestart} className="mt-6 rounded border-2 border-red-400 px-5 py-2 font-bold text-red-300">
        Try Again
      </button>
      <Link href="/adventure" className="mt-3 text-sm text-slate-400 underline underline-offset-2">
        Back to Adventure games
      </Link>
    </Overlay>
  )
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#05070df5] p-6">
      {children}
    </div>
  )
}
