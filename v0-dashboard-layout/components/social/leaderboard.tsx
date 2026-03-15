"use client"

import { useState } from "react"
import { Crown, TrendingUp, Flame } from "lucide-react"
import type { Friend } from "@/lib/social-types"

const mockLeaderboard: (Friend & { rank: number })[] = [
  { id: "1", name: "Emma", level: 6, rating: 1950, streak: 7, online: true, rank: 1, avatar: "👱" },
  { id: "2", name: "Sarah", level: 5, rating: 1850, streak: 12, online: true, rank: 2, avatar: "👧" },
  { id: "3", name: "Michael", level: 4, rating: 1720, streak: 8, online: true, rank: 3, avatar: "👦" },
  { id: "4", name: "You", level: 4, rating: 1680, streak: 5, online: true, rank: 4, avatar: "🧑" },
  { id: "5", name: "Alex", level: 3, rating: 1580, streak: 3, online: false, rank: 5, avatar: "🧑" },
]

export function Leaderboard() {
  const [tab, setTab] = useState<"rating" | "xp" | "streak">("rating")

  const tabs = [
    { id: "rating", label: "Rating", icon: Crown },
    { id: "xp", label: "Weekly XP", icon: TrendingUp },
    { id: "streak", label: "Streak", icon: Flame },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-bold mb-4">Friend Leaderboards</h2>
        <div className="flex gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-semibold ${
                tab === t.id
                  ? "bg-orange-500 text-white shadow-md"
                  : "bg-background border-2 border-border text-foreground hover:bg-accent"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {mockLeaderboard.map((entry, idx) => (
          <div
            key={entry.id}
            className={`flex items-center gap-4 rounded-xl p-4 transition-all ${
              entry.rank === 4
                ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-300"
                : "bg-card border-2 border-border hover:bg-accent"
            }`}
            style={{ animation: `rank-update 0.6s ease-out ${idx * 0.08}s both` }}
          >
            {/* Rank */}
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 font-heading font-bold text-lg">
              {entry.rank === 1 && "🥇"}
              {entry.rank === 2 && "🥈"}
              {entry.rank === 3 && "🥉"}
              {entry.rank > 3 && entry.rank}
            </div>

            {/* Name and stats */}
            <div className="flex-1">
              <p className="font-heading font-bold text-card-foreground">{entry.name}</p>
              <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                <span>Level {entry.level}</span>
                <span>Rating: {entry.rating}</span>
              </div>
            </div>

            {/* Value */}
            <div className="text-right">
              <p className="font-heading text-lg font-bold text-orange-600">
                {tab === "rating" ? entry.rating : tab === "xp" ? "280 XP" : entry.streak}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
