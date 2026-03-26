"use client"

import { Star, Lock, Crown } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { rewardsAPI, shopAPI, type ShopCatalogItem } from "@/lib/api"
import { useAuthStore } from "@/lib/store"

const itemVisuals: Record<string, { icon: string; gradient: string; borderColor: string; description: string; rarityColor: string }> = {
  cool_sunglasses: { icon: "😎", gradient: "from-cyan-100 to-blue-100", borderColor: "border-cyan-300", description: "Look cool while you checkmate!", rarityColor: "bg-slate-100 text-slate-600" },
  golden_crown: { icon: "👑", gradient: "from-yellow-100 to-amber-100", borderColor: "border-yellow-300", description: "Rule the board like royalty!", rarityColor: "bg-blue-100 text-blue-700" },
  fire_trail: { icon: "🔥", gradient: "from-orange-100 to-red-100", borderColor: "border-orange-300", description: "Leave a blazing trail!", rarityColor: "bg-purple-100 text-purple-700" },
  space_theme: { icon: "🚀", gradient: "from-indigo-100 to-purple-100", borderColor: "border-indigo-300", description: "Play chess among the stars!", rarityColor: "bg-purple-100 text-purple-700" },
  castle_theme: { icon: "🏰", gradient: "from-stone-100 to-amber-100", borderColor: "border-stone-300", description: "A medieval chess fortress!", rarityColor: "bg-blue-100 text-blue-700" },
  dragon_pet: { icon: "🐉", gradient: "from-emerald-100 to-green-100", borderColor: "border-emerald-300", description: "Your very own dragon companion!", rarityColor: "bg-amber-100 text-amber-700" },
}

export function StarShopPreview() {
  const { user, updateUser } = useAuthStore()
  const [items, setItems] = useState<ShopCatalogItem[]>([])
  const [stars, setStars] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [buyingKey, setBuyingKey] = useState<string | null>(null)

  useEffect(() => {
    void loadShop()
  }, [])

  const loadShop = async () => {
    setIsLoading(true)
    try {
      const [wallet, catalog] = await Promise.all([rewardsAPI.getWallet(), shopAPI.getCatalog()])
      setStars(wallet.star_balance)
      setItems(catalog.items)
      updateUser({ star_balance: wallet.star_balance, total_xp: wallet.total_xp })
    } catch {
      toast.error("Failed to load star shop")
    } finally {
      setIsLoading(false)
    }
  }

  const maxConvertibleStars = useMemo(() => Math.floor((user?.total_xp ?? 0) / 200), [user?.total_xp])

  const convertOneStar = async () => {
    setConverting(true)
    try {
      const res = await rewardsAPI.convertXpToStars(1)
      setStars(res.star_balance)
      updateUser({ star_balance: res.star_balance, total_xp: res.remaining_xp })
      toast.success("Converted 200 XP into 1 star")
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "XP conversion failed")
    } finally {
      setConverting(false)
    }
  }

  const buyItem = async (item: ShopCatalogItem) => {
    setBuyingKey(item.item_key)
    try {
      const res = await shopAPI.purchase(item.item_key)
      setStars(res.star_balance)
      updateUser({ star_balance: res.star_balance })
      toast.success(`${item.name} purchased. Delivery will be coordinated.`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Purchase failed")
    } finally {
      setBuyingKey(null)
    }
  }

  return (
    <section className="mb-6">
      <div className="overflow-hidden rounded-3xl border-2 border-yellow-200 bg-card shadow-sm">
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-white" />
              <div>
                <h3 className="font-heading text-lg font-bold text-white">Star Shop</h3>
                <p className="text-xs font-semibold text-white/80">1 star = 200 XP</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur">
                <Star className="h-4 w-4 fill-white text-white" />
                <span className="font-heading text-sm font-bold text-white">{stars} Stars</span>
              </div>
              <button
                onClick={convertOneStar}
                disabled={converting || maxConvertibleStars < 1}
                className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Convert 200 XP -> 1 Star
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
          {items.map((item) => {
            const view = itemVisuals[item.item_key] ?? itemVisuals.cool_sunglasses
            const canAfford = stars >= item.stars_cost
            return (
              <div
                key={item.item_key}
                className={`group relative flex flex-col items-center gap-3 rounded-2xl border-2 bg-gradient-to-br ${view.gradient} ${view.borderColor} p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${item.rarity === "Rare" ? "animate-rarity-glow-rare" : item.rarity === "Epic" ? "animate-rarity-glow-epic" : item.rarity === "Legendary" ? "animate-rarity-glow-legendary" : ""}`}
              >
                {!canAfford && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-card/60 backdrop-blur-[2px]">
                    <Lock className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                )}
                <span className="text-5xl leading-none" role="img" aria-label={item.name}>{view.icon}</span>
                <p className="text-center font-heading text-sm font-bold leading-tight text-card-foreground">{item.name}</p>
                <p className="hidden text-center text-xs font-semibold text-muted-foreground group-hover:block">{view.description}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${view.rarityColor}`}>{item.rarity}</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className={`font-heading text-base font-bold ${canAfford ? "text-yellow-700" : "text-muted-foreground"}`}>{item.stars_cost}</span>
                </div>
                <button
                  onClick={() => buyItem(item)}
                  disabled={!canAfford || buyingKey === item.item_key || isLoading}
                  className="rounded-lg bg-white/70 px-3 py-1 text-xs font-bold text-card-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Buy
                </button>
              </div>
            )
          })}
        </div>
        <div className="px-5 pb-5 text-xs text-muted-foreground">
          {isLoading ? "Loading shop..." : `XP: ${user?.total_xp ?? 0} | Stars: ${stars}`}
          <a href="/dashboard" className="hover-wiggle flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 font-heading text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95">
            <Crown className="h-5 w-5" />
            Visit Full Star Shop
          </a>
        </div>
      </div>
    </section>
  )
}
