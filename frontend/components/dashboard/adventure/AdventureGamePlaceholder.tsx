"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

type AdventureGamePlaceholderProps = {
  title: string
  subtitle: string
  emoji: string
}

export function AdventureGamePlaceholder({ title, subtitle, emoji }: AdventureGamePlaceholderProps) {
  return (
    <div className="mx-auto max-w-4xl pt-2">
      <div className="rounded-3xl border-2 border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-4 text-7xl">{emoji}</div>
        <h1 className="font-heading text-3xl font-black text-card-foreground">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold text-muted-foreground">{subtitle}</p>
        <div className="mt-7">
          <span className="rounded-full bg-yellow-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-yellow-700">
            Coming soon
          </span>
        </div>
      </div>

      <Link
        href="/adventure"
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-card-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Adventure games
      </Link>
    </div>
  )
}
