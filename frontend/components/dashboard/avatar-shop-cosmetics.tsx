"use client"

import type { ReactNode } from "react"
import { shopAvatarTrailClass } from "@/lib/shop-cosmetics"

const ACCESSORY: Record<string, string> = {
  golden_crown: "👑",
  cool_sunglasses: "😎",
}

const COMPANION: Record<string, string> = {
  dragon_pet: "🐉",
}

const SIZE_CLASSES = {
  xs: { acc: "-top-1 left-1/2 -translate-x-1/2 text-[11px]", compBr: "-bottom-0.5 -right-0.5 text-[11px]", compBl: "-bottom-0.5 -left-0.5 text-[11px]" },
  sm: { acc: "-top-1 left-1/2 -translate-x-1/2 text-xs", compBr: "-bottom-0.5 -right-0.5 text-xs", compBl: "-bottom-0.5 -left-0.5 text-xs" },
  md: { acc: "-top-1.5 left-1/2 -translate-x-1/2 text-sm", compBr: "-bottom-1 -right-1 text-sm", compBl: "-bottom-1 -left-1 text-sm" },
  lg: { acc: "-top-2 left-1/2 -translate-x-1/2 text-lg", compBr: "-bottom-1 -right-1 text-base", compBl: "-bottom-1 -left-1 text-base" },
} as const

export function AvatarShopCosmetics({
  accessoryKey,
  companionKey,
  trailKey,
  size,
  companionPlacement = "br",
  className,
  children,
}: {
  accessoryKey?: string | null
  companionKey?: string | null
  trailKey?: string | null
  size: "xs" | "sm" | "md" | "lg"
  companionPlacement?: "br" | "bl"
  className?: string
  children: ReactNode
}) {
  const acc = accessoryKey ? ACCESSORY[accessoryKey] : null
  const comp = companionKey ? COMPANION[companionKey] : null
  const s = SIZE_CLASSES[size]
  const compCls = companionPlacement === "bl" ? s.compBl : s.compBr

  return (
    <div className={`relative inline-flex ${shopAvatarTrailClass(trailKey)} ${className ?? ""}`}>
      {children}
      {acc ? (
        <span
          className={`pointer-events-none absolute z-10 leading-none drop-shadow-md ${s.acc}`}
          aria-hidden
        >
          {acc}
        </span>
      ) : null}
      {comp ? (
        <span
          className={`pointer-events-none absolute z-10 leading-none drop-shadow-md ${compCls}`}
          aria-hidden
        >
          {comp}
        </span>
      ) : null}
    </div>
  )
}
