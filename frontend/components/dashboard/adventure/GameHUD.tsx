import type { HudData } from "./types"

interface GameHUDProps {
  hudData: HudData
}

export function GameHUD({ hudData }: GameHUDProps) {
  return (
    <>
      {/* Top HUD bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2"
        style={{ background: "rgba(0,0,0,0.7)" }}
      >
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="font-heading text-[9px] font-bold text-gray-400 uppercase tracking-widest">Lives</p>
            <p className="font-heading text-sm font-black text-white">
              {Array.from({ length: hudData.lives }, () => "♟️").join("")}
            </p>
          </div>
          <div className="text-center">
            <p className="font-heading text-[9px] font-bold text-gray-400 uppercase tracking-widest">Coins</p>
            <p className="font-heading text-lg font-black text-yellow-400">{hudData.coins}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="font-heading text-[9px] font-bold text-gray-400 uppercase tracking-widest">World</p>
            <p className="font-heading text-lg font-black text-white">{hudData.world}</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-[9px] font-bold text-gray-400 uppercase tracking-widest">Score</p>
            <p className="font-heading text-lg font-black text-white">{hudData.score}</p>
          </div>
        </div>
      </div>

      {/* Bottom controls hint */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 font-heading text-[10px] font-bold text-white/40 uppercase tracking-wider">
        Arrow Keys / WASD + Space
      </div>
    </>
  )
}
