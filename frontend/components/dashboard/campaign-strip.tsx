"use client"

import { Check, Lock, Play, ChevronRight } from "lucide-react"
import { useState } from "react"
import { QuestMapModal } from "./quest-map-modal"

const quests = [
  { id: 1, title: "Pawn Power!", piece: "P", status: "completed" as const, emoji: "\u265F" },
  { id: 2, title: "Knight's Big Jump!", piece: "N", status: "completed" as const, emoji: "\u265E" },
  { id: 3, title: "Save the Queen!", piece: "Q", status: "active" as const, emoji: "\u265B" },
  { id: 4, title: "Bishop's Zigzag!", piece: "B", status: "locked" as const, emoji: "\u265D" },
  { id: 5, title: "Castle Defense!", piece: "R", status: "locked" as const, emoji: "\u265C" },
]

function HorizontalNode({ quest, isWalkerHere }: { quest: (typeof quests)[0]; isWalkerHere: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {quest.status === "active" && (
        <div className="animate-tooltip-float mb-1 flex flex-col items-center">
          <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 shadow-lg shadow-amber-500/25">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 fill-white text-white" />
              <span className="font-heading text-sm font-bold text-white">Play!</span>
            </div>
          </div>
          <div className="h-0 w-0 border-x-[8px] border-t-[8px] border-x-transparent border-t-amber-500" />
        </div>
      )}
      {quest.status !== "active" && <div className="mb-1 h-[46px]" />}
      {isWalkerHere && <div className="animate-walk absolute -top-2 text-2xl">♟</div>}
      <button
        className={`relative flex items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          quest.status === "completed"
            ? "h-16 w-16 bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg"
            : quest.status === "active"
            ? "h-20 w-20 animate-node-pulse bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-4 ring-amber-300 shadow-xl shadow-amber-400/30"
            : "h-16 w-16 bg-muted text-muted-foreground/50"
        }`}
        disabled={quest.status === "locked"}
        aria-label={`${quest.title} - ${quest.status}`}
      >
        {quest.status === "completed" ? <Check className="h-7 w-7" strokeWidth={3} /> : quest.status === "active" ? <span className="text-3xl leading-none">{quest.emoji}</span> : <Lock className="h-6 w-6" />}
      </button>
      <p className={`max-w-[100px] text-center font-heading text-sm font-bold leading-tight ${quest.status === "completed" ? "text-emerald-700" : quest.status === "active" ? "text-amber-800" : "text-muted-foreground/50"}`}>
        {quest.title}
      </p>
    </div>
  )
}

export function CampaignStrip() {
  const [isMapOpen, setIsMapOpen] = useState(false)
  const activeQuest = quests.find((q) => q.status === "active")
  const activeIndex = quests.findIndex((q) => q.status === "active")
  const visibleQuests = quests.slice(activeIndex, activeIndex + 3)

  return (
    <>
      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-amber-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-5 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-bold text-white">Your Adventure 🗺️</h3>
                {activeQuest && <p className="text-sm font-bold text-white/80">Current Quest: {activeQuest.title}</p>}
              </div>
              <button onClick={() => setIsMapOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 font-heading text-sm font-bold text-white transition-colors hover:bg-white/30">
                See Full Map
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="bg-gradient-to-r from-amber-50/50 via-orange-50/50 to-yellow-50/50 px-5 py-8">
            <div className="relative flex items-center justify-between gap-4 sm:gap-8">
              <svg className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" width="100%" height="8" style={{ zIndex: 0 }} aria-hidden="true">
                <line x1="60" y1="4" x2="100%" y2="4" stroke="#c4956a" strokeWidth="6" strokeDasharray="3 10" className="animate-dash-march" strokeLinecap="round" />
              </svg>
              <div className="relative z-10 flex w-full items-center justify-between">
                {visibleQuests.map((quest) => (
                  <HorizontalNode key={quest.id} quest={quest} isWalkerHere={quest.status === "active"} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <QuestMapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
    </>
  )
}
