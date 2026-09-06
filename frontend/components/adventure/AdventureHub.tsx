"use client"

import Link from "next/link"
import { Map, ChevronRight } from "lucide-react"
import { ADVENTURE_MODES } from "@/lib/data/adventure-hub"

export function AdventureHub() {
  return (
    <div className="mx-auto max-w-6xl pt-2">
      <section className="mb-8">
        <div className="overflow-hidden rounded-3xl border-2 border-amber-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-5">
            <div className="flex items-center gap-3">
              <Map className="h-6 w-6 text-white" />
              <h1 className="font-heading text-2xl font-bold text-white">Adventure</h1>
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="font-heading text-lg font-bold text-card-foreground">
              Pick your adventure
            </p>
            <p className="mt-0.5 font-heading text-sm font-semibold text-muted-foreground">
              Two epic journeys — choose where your quest begins!
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {ADVENTURE_MODES.map((mode, idx) => {
            const isLive = mode.status === "live"
            return (
              <Link
                key={mode.id}
                href={mode.href}
                className={`animate-bounce-in group flex flex-col overflow-hidden rounded-3xl border-2 ${mode.borderColor} bg-card shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`relative h-40 w-full bg-gradient-to-br ${mode.gradient} sm:h-48`}>
                  <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_30%),radial-gradient(circle_at_80%_80%,white,transparent_35%)]" />
                  <div className="absolute inset-0 flex items-center justify-center text-7xl md:text-8xl">
                    {mode.emoji}
                  </div>
                  <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700">
                    {isLive ? "Play" : "Coming Soon"}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-heading text-xl font-bold text-card-foreground">
                    {mode.title}
                  </h2>
                  <p className="mt-2 font-sans text-sm text-muted-foreground">{mode.description}</p>
                  <div
                    className={`mt-4 inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r ${mode.gradient} px-4 py-2 font-heading text-sm font-bold text-white shadow-sm transition-shadow group-hover:shadow-md`}
                  >
                    {isLive ? "Start adventure" : "Preview"}
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
