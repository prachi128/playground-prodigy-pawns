import type { RunnerState } from "./types"

type NeonHudProps = {
  runner: RunnerState
  allowedThemes: string[]
  targetThemeCount: number
}

export function NeonHud({ runner, allowedThemes, targetThemeCount }: NeonHudProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="grid grid-cols-2 gap-2">
          <HudBox label="Score" value={`${runner.score}`} />
          <HudBox label="Combo" value={`${runner.combo}x`} />
          <HudBox label="Fuel" value={`${Math.round(runner.fuel * 100)}%`} />
          <HudBox label="Checkpoints" value={`${runner.checkpointsCleared}`} />
        </div>
        <div className="rounded-lg border border-cyan-400/60 bg-black/60 px-3 py-2 text-right text-xs font-bold text-cyan-200">
          <div>Themes: {allowedThemes.length}/{targetThemeCount}</div>
          <div>
            Next gate: {Math.round(runner.nextCheckpointX)}
          </div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded bg-black/60">
        <div
          className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400 transition-all"
          style={{ width: `${runner.fuel * 100}%` }}
        />
      </div>
    </div>
  )
}

function HudBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-cyan-300/60 bg-black/60 px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-cyan-200/80">{label}</div>
      <div className="font-heading text-sm font-black text-white">{value}</div>
    </div>
  )
}
