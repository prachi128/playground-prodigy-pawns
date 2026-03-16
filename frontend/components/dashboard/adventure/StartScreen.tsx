import { SKY, SKY_BOTTOM, GROUND_COLOR, GRASS_TOP } from "./constants"

interface StartScreenProps {
  onStart: () => void
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ border: "4px solid #333" }}>
        <div
          className="relative"
          style={{ height: 420, background: `linear-gradient(to bottom, ${SKY}, ${SKY_BOTTOM})` }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 h-28"
            style={{ background: `linear-gradient(to top, ${GROUND_COLOR}, ${GRASS_TOP})` }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl mb-4">♟️</div>
            <h1
              className="font-heading text-4xl font-black text-white mb-2"
              style={{ textShadow: "3px 3px 0 #000" }}
            >
              CHESS ADVENTURE
            </h1>
            <p
              className="font-heading text-lg font-bold text-white/80 mb-6"
              style={{ textShadow: "2px 2px 0 #000" }}
            >
              A Mario-style platformer with chess puzzles!
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={onStart}
                className="rounded-xl px-10 py-4 font-heading text-xl font-black text-white shadow-lg hover:scale-105 transition-transform"
                style={{ background: "linear-gradient(to bottom, #e04040, #c02020)", border: "3px solid #ff6060" }}
              >
                START GAME
              </button>
              <div
                className="flex gap-4 text-sm font-heading font-bold text-white/70"
                style={{ textShadow: "1px 1px 0 #000" }}
              >
                <span>Arrow Keys / WASD = Move</span>
                <span>Space = Jump</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
