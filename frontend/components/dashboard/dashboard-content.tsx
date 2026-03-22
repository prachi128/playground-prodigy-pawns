"use client"

import Link from "next/link"
import {
  Trophy,
  Target,
  Swords,
  ChevronRight,
  Star,
  GraduationCap,
} from "lucide-react"
import { useAuthStore } from "@/lib/store"
import { StarShopPreview } from "./star-shop"
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist"
import { LevelCard } from "./level-card"
import { ActivityFeed } from "./activity-feed"

// --- Data ---

const actionCards = [
  {
    title: "Play Now!",
    description: "Challenge another kid!",
    image: "/images/play-chess.jpg",
    gradient: "from-orange-400 to-pink-500",
    borderColor: "border-orange-300",
    emoji: "\u2694\uFE0F",
    href: "/chess-game",
  },
  {
    title: "Solve This!",
    description: "Puzzles to train your brain!",
    image: "/images/puzzle-duel.jpg",
    gradient: "from-cyan-400 to-blue-500",
    borderColor: "border-cyan-300",
    emoji: "\uD83E\uDDE9",
    href: "/puzzles",
  },
  {
    title: "Beat the Bot!",
    description: "Can you outsmart the computer?",
    image: "/images/play-bot.jpg",
    gradient: "from-purple-400 to-indigo-500",
    borderColor: "border-purple-300",
    emoji: "\uD83E\uDD16",
    href: "/beat-the-bot",
  },
]

const levelRanks = [
  { name: "Pawn", emoji: "\u265F", color: "bg-amber-100 text-amber-700" },
  { name: "Knight", emoji: "\u265E", color: "bg-emerald-100 text-emerald-700" },
  { name: "Bishop", emoji: "\u265D", color: "bg-blue-100 text-blue-700" },
  { name: "Rook", emoji: "\u265C", color: "bg-purple-100 text-purple-700" },
  { name: "Queen", emoji: "\u265B", color: "bg-pink-100 text-pink-700" },
  { name: "King", emoji: "\u265A", color: "bg-yellow-100 text-yellow-700" },
]

const currentRankIndex = 1 // Knight

// --- Main Component ---
export function DashboardContent() {
  const { user } = useAuthStore()

  return (
    <div className="mx-auto min-w-0 w-full max-w-6xl pt-2">
      {/* Mascot Speech Bubble */}
      <section className="mb-5">
        <div className="flex items-start gap-3">
          <div className="animate-mascot-bounce shrink-0 text-5xl">{"♞"}</div>
          <div className="relative flex-1">
            <div className="absolute -left-2 top-4 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-white" />
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="font-heading text-lg font-bold text-card-foreground">
                {"Ready for today's adventure? \uD83D\uDE80"}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-muted-foreground">
                {"Complete all your tasks to earn +50 bonus XP! \uD83C\uDF1F"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Action Cards - Vibrant gradient backgrounds */}
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {actionCards.map((card, idx) => (
            <Link
              key={card.title}
              href={card.href}
              className={`animate-bounce-in hover-wiggle group flex flex-col overflow-hidden rounded-3xl border-2 ${card.borderColor} bg-white shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              style={{ animationDelay: `${idx * 120}ms` }}
            >
              {/* Illustration - gradient placeholder */}
              <div className={`relative h-32 w-full overflow-hidden bg-gradient-to-br ${card.gradient} sm:h-40 md:h-44 transition-transform duration-300 group-hover:scale-105`}>
              <img
                  src={card.image}
                  alt={card.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Floating emoji */}
                <div className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl shadow-lg">
                  {card.emoji}
                </div>
              </div>
              {/* Gradient button label */}
              <div className={`bg-gradient-to-r ${card.gradient} px-3 py-3 text-center sm:px-4 sm:py-4`}>
                <span className="font-heading text-lg font-bold text-white drop-shadow-sm sm:text-xl">
                  {card.title}
                </span>
                <p className="mt-0.5 text-xs font-semibold text-white/80">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Level Card - level from rating, XP for hints/rewards */}
      <LevelCard
        currentLevel={user?.level ?? 4}
        rating={user?.rating ?? 100}
        totalXP={user?.total_xp ?? 0}
        userName={user?.full_name ?? "Player"}
      />

      {/* Star Shop Preview */}
      <StarShopPreview />

      {/* Getting Started Checklist */}
      <section>
        <OnboardingChecklist />
      </section>

      {/* Trophies / Achievements */}
      <section>
        <div className="overflow-hidden rounded-3xl border-2 border-yellow-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-white">
                {"Trophies \uD83C\uDFC6"}
              </h3>
              <button className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-white/20">
                View All
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto p-5 scrollbar-hide">
            {[
              { title: "First Win!", icon: Trophy, bg: "bg-gradient-to-br from-yellow-100 to-amber-100", color: "text-yellow-600", earned: true, rarity: "Common", rarityColor: "bg-slate-100 text-slate-600" },
              { title: "Puzzle Pro!", icon: Target, bg: "bg-gradient-to-br from-cyan-100 to-blue-100", color: "text-cyan-600", earned: true, rarity: "Rare", rarityColor: "bg-blue-100 text-blue-600" },
              { title: "100 Games", icon: Swords, bg: "bg-gradient-to-br from-pink-100 to-rose-100", color: "text-pink-600", earned: false, rarity: "Epic", rarityColor: "bg-purple-100 text-purple-600" },
              { title: "Star Scholar", icon: Star, bg: "bg-gradient-to-br from-purple-100 to-indigo-100", color: "text-purple-600", earned: false, rarity: "Legendary", rarityColor: "bg-amber-100 text-amber-700" },
              { title: "Grandmaster", icon: GraduationCap, bg: "bg-gradient-to-br from-emerald-100 to-green-100", color: "text-emerald-600", earned: false, rarity: "Legendary", rarityColor: "bg-amber-100 text-amber-700" },
            ].map((trophy) => {
              const Icon = trophy.icon
              return (
                <div
                  key={trophy.title}
                  className={`flex shrink-0 flex-col items-center gap-2 rounded-3xl border-2 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                    trophy.earned
                      ? `${trophy.bg} border-yellow-300 animate-earned-glow`
                      : "border-border bg-muted/30 opacity-50 grayscale"
                  }`}
                  style={{ minWidth: "120px" }}
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${trophy.earned ? trophy.bg : "bg-muted"}`}>
                    <Icon className={`h-7 w-7 ${trophy.earned ? trophy.color : "text-muted-foreground/40"}`} />
                  </div>
                  <p className="text-center font-heading text-sm font-bold text-card-foreground">
                    {trophy.title}
                  </p>
                  {/* Rarity badge */}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${trophy.rarityColor}`}>
                    {trophy.rarity}
                  </span>
                  {trophy.earned && (
                    <span className="animate-unlock rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-700">
                      {"Earned! \u2B50"}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Activity Feed */}
      <ActivityFeed />
    </div>
  )
}
