"use client"

import {
  Bot,
  Users,
  Zap,
  Trophy,
  Clock,
  Star,
  Gamepad2,
} from "lucide-react"
import { useAuthStore } from "@/lib/store"

const playCards = [
  {
    title: "Play with Computer",
    description: "Challenge AI opponents of varying difficulty levels",
    image: "/images/play-bot.jpg",
    gradient: "from-purple-400 to-indigo-500",
    borderColor: "border-purple-300",
    emoji: "🤖",
    href: "/beat-the-bot",
  },
  {
    title: "Play with Friends",
    description: "Challenge your friends and classmates to exciting matches",
    image: "/images/play-chess.jpg",
    gradient: "from-orange-400 to-pink-500",
    borderColor: "border-orange-300",
    emoji: "👥",
    href: "/chess-game",
  },
]

export function PlayContent() {
  const { user } = useAuthStore()

  return (
    <div className="mx-auto max-w-6xl pt-6">
      {/* Mascot Speech Bubble */}
      <section className="mb-5">
        <div className="flex items-start gap-3">
          <div className="animate-mascot-bounce shrink-0 text-5xl">{"♞"}</div>
          <div className="relative flex-1">
            <div className="absolute -left-2 top-4 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-white" />
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="font-heading text-lg font-bold text-card-foreground">
                {"Ready to play? Choose your opponent! ⚔️"}
              </p>
              <p className="mt-0.5 font-heading text-sm font-semibold text-muted-foreground">
                {"Challenge the computer or play with friends! 🎮"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Play Cards - Matching dashboard action cards style */}
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {playCards.map((card, idx) => (
            <a
              key={card.title}
              href={card.href}
              className={`animate-bounce-in hover-wiggle group flex flex-col overflow-hidden rounded-3xl border-2 ${card.borderColor} bg-white shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              style={{ animationDelay: `${idx * 120}ms` }}
            >
              {/* Illustration - gradient placeholder */}
              <div className={`relative h-40 w-full overflow-hidden bg-gradient-to-br ${card.gradient} sm:h-44 transition-transform duration-300 group-hover:scale-105`}>
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
              <div className={`bg-gradient-to-r ${card.gradient} px-4 py-4 text-center`}>
                <span className="font-heading text-xl font-bold text-white drop-shadow-sm">
                  {card.title}
                </span>
                <p className="mt-0.5 font-heading text-xs font-semibold text-white/80">
                  {card.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="overflow-hidden rounded-3xl border-2 border-purple-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-purple-400 to-indigo-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">
                Your Level
              </h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Star className="h-8 w-8 text-purple-500" />
              <span className="font-heading text-4xl font-bold text-purple-600">
                {user?.level ?? 1}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border-2 border-orange-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-orange-400 to-pink-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">
                Rating
              </h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Trophy className="h-8 w-8 text-orange-500" />
              <span className="font-heading text-4xl font-bold text-orange-600">
                {user?.rating ?? 1000}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border-2 border-yellow-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">
                Total XP
              </h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Zap className="h-8 w-8 text-yellow-500" />
              <span className="font-heading text-4xl font-bold text-yellow-600">
                {user?.total_xp ?? 0}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
