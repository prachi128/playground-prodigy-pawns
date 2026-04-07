"use client"

import Link from "next/link"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { ADVENTURE_GAMES } from "@/lib/data/adventure-games"

export function AdventureGamesHub() {
  return (
    <div className="mx-auto max-w-6xl pt-2">
      <section className="mb-8">
        <div className="flex items-start gap-3">
          <div className="animate-mascot-bounce shrink-0 text-5xl">♞</div>
          <div className="relative flex-1">
            <div className="absolute -left-2 top-4 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-white" />
            <div className="rounded-2xl border-2 border-border bg-card p-4 shadow-sm">
              <p className="font-heading text-lg font-bold text-card-foreground">
                Pick your adventure game
              </p>
              <p className="mt-0.5 font-heading text-sm font-semibold text-muted-foreground">
                Four game modes, one hub. Neon Runner x Chess is ready now.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {ADVENTURE_GAMES.map((game, idx) => {
            const isLive = game.status === "live"
            return (
              <Link
                key={game.id}
                href={game.href}
                className={`animate-bounce-in group flex flex-col overflow-hidden rounded-3xl border-2 ${game.borderColor} bg-card shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`relative h-36 w-full bg-gradient-to-br ${game.gradient} sm:h-40`}>
                  <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_30%),radial-gradient(circle_at_80%_80%,white,transparent_35%)]" />
                  <div className="absolute inset-0 flex items-center justify-center text-7xl">
                    {game.emoji}
                  </div>
                  <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700">
                    {isLive ? "Live" : "Coming Soon"}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-heading text-xl font-bold text-card-foreground">{game.title}</h2>
                  <p className="mt-2 font-sans text-sm text-muted-foreground">{game.description}</p>
                  <div className={`mt-4 inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r ${game.gradient} px-4 py-2 font-heading text-sm font-bold text-white shadow-sm transition-shadow group-hover:shadow-md`}>
                    {isLive ? "Play now" : "Open preview"}
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-card-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
    </div>
  )
}
