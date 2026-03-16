import type { HudData } from "./types"

interface GameOverScreenProps {
  hudData: HudData
  puzzlesSolved: number
  onRestart: () => void
}

export function GameOverScreen({ hudData, puzzlesSolved, onRestart }: GameOverScreenProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ border: "4px solid #333" }}>
        <div className="relative" style={{ height: 420, background: "#000" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1
              className="font-heading text-4xl font-black text-red-500 mb-4"
              style={{ textShadow: "3px 3px 0 #600" }}
            >
              GAME OVER
            </h1>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <p className="font-heading text-sm font-bold text-gray-400 uppercase tracking-widest">Score</p>
                <p className="font-heading text-3xl font-black text-white">{hudData.score}</p>
              </div>
              <div className="text-center">
                <p className="font-heading text-sm font-bold text-gray-400 uppercase tracking-widest">Coins</p>
                <p className="font-heading text-3xl font-black text-yellow-400">{hudData.coins}</p>
              </div>
              <div className="text-center">
                <p className="font-heading text-sm font-bold text-gray-400 uppercase tracking-widest">World</p>
                <p className="font-heading text-3xl font-black text-white">{hudData.world}</p>
              </div>
              <div className="text-center">
                <p className="font-heading text-sm font-bold text-gray-400 uppercase tracking-widest">Puzzles</p>
                <p className="font-heading text-3xl font-black text-emerald-400">{puzzlesSolved}</p>
              </div>
            </div>
            <button
              onClick={onRestart}
              className="rounded-xl px-10 py-4 font-heading text-xl font-black text-white shadow-lg hover:scale-105 transition-transform"
              style={{ background: "linear-gradient(to bottom, #e04040, #c02020)", border: "3px solid #ff6060" }}
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
