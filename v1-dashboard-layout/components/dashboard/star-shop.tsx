"use client"

import { Star, Lock, Crown, Heart } from "lucide-react"
import { useState } from "react"

const shopItems = [
  {
    name: "Cool Sunglasses",
    cost: 500,
    icon: "😎",
    unlocked: true,
    rarity: "Common",
    rarityColor: "bg-slate-100 text-slate-600",
    gradient: "from-cyan-100 to-blue-100",
    borderColor: "border-cyan-300",
    description: "Look cool while you checkmate!",
  },
  {
    name: "Golden Crown",
    cost: 1000,
    icon: "👑",
    unlocked: false,
    rarity: "Rare",
    rarityColor: "bg-blue-100 text-blue-700",
    gradient: "from-yellow-100 to-amber-100",
    borderColor: "border-yellow-300",
    description: "Rule the board like royalty!",
  },
  {
    name: "Fire Trail",
    cost: 2000,
    icon: "🔥",
    unlocked: false,
    rarity: "Epic",
    rarityColor: "bg-purple-100 text-purple-700",
    gradient: "from-orange-100 to-red-100",
    borderColor: "border-orange-300",
    description: "Leave a blazing trail!",
  },
  {
    name: "Space Theme",
    cost: 3000,
    icon: "🚀",
    unlocked: false,
    rarity: "Epic",
    rarityColor: "bg-purple-100 text-purple-700",
    gradient: "from-indigo-100 to-purple-100",
    borderColor: "border-indigo-300",
    description: "Play chess among the stars!",
  },
  {
    name: "Castle Theme",
    cost: 2500,
    icon: "🏰",
    unlocked: false,
    rarity: "Rare",
    rarityColor: "bg-blue-100 text-blue-700",
    gradient: "from-stone-100 to-amber-100",
    borderColor: "border-stone-300",
    description: "A medieval chess fortress!",
  },
  {
    name: "Dragon Pet",
    cost: 5000,
    icon: "🐉",
    unlocked: false,
    rarity: "Legendary",
    rarityColor: "bg-amber-100 text-amber-700",
    gradient: "from-emerald-100 to-green-100",
    borderColor: "border-emerald-300",
    description: "Your very own dragon companion!",
  },
]

const playerStars = 42

export function StarShopPreview() {
  const [wishlist, setWishlist] = useState<string[]>([])

  const toggleWishlist = (name: string) => {
    setWishlist(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    )
  }

  return (
    <section className="mb-6">
      <div className="overflow-hidden rounded-3xl border-2 border-yellow-200 bg-card shadow-sm">
        {/* Header with star balance and wishlist count */}
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-white" />
              <div>
                <h3 className="font-heading text-lg font-bold text-white">
                  Star Shop
                </h3>
                <p className="text-xs font-semibold text-white/80">
                  {wishlist.length} items on wishlist
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur">
                <Star className="h-4 w-4 fill-white text-white" />
                <span className="font-heading text-sm font-bold text-white">{playerStars} Stars</span>
              </div>
              <p className="text-xs font-semibold text-white/80">
                15 more for Cool Sunglasses!
              </p>
            </div>
          </div>
        </div>

        {/* Items grid with rarity glows */}
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
          {shopItems.map((item) => {
            const canAfford = playerStars >= item.cost
            const isWishlisted = wishlist.includes(item.name)

            return (
              <div
                key={item.name}
                className={`group relative flex flex-col items-center gap-3 rounded-2xl border-2 bg-gradient-to-br ${item.gradient} ${item.borderColor} p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  item.rarity === "Rare" ? "animate-rarity-glow-rare" : item.rarity === "Epic" ? "animate-rarity-glow-epic" : item.rarity === "Legendary" ? "animate-rarity-glow-legendary" : ""
                }`}
              >
                {/* Lock overlay */}
                {!item.unlocked && !canAfford && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-card/60 backdrop-blur-[2px]">
                    <Lock className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                )}

                {/* Item icon */}
                <span className="text-5xl leading-none" role="img" aria-label={item.name}>
                  {item.icon}
                </span>

                {/* Name */}
                <p className="text-center font-heading text-sm font-bold leading-tight text-card-foreground">
                  {item.name}
                </p>

                {/* Description on hover */}
                <p className="hidden text-center text-xs font-semibold text-muted-foreground group-hover:block">
                  {item.description}
                </p>

                {/* Rarity badge */}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${item.rarityColor}`}>
                  {item.rarity}
                </span>

                {/* Cost */}
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className={`font-heading text-base font-bold ${canAfford ? "text-yellow-700" : "text-muted-foreground"}`}>
                    {item.cost}
                  </span>
                </div>

                {/* Wishlist button */}
                {!item.unlocked && (
                  <button
                    onClick={() => toggleWishlist(item.name)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/20 hover:bg-white/40 transition-colors"
                  >
                    <Heart
                      className={`h-4 w-4 ${isWishlisted ? "fill-red-500 text-red-500" : "text-white"}`}
                    />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA to full shop */}
        <div className="px-5 pb-5">
          <a
            href="/shop"
            className="hover-wiggle flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 font-heading text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <Crown className="h-5 w-5" />
            Visit Full Star Shop
          </a>
        </div>
      </div>
    </section>
  )
}
