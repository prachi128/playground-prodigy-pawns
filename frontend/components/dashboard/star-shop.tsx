"use client"

import Link from "next/link"
import { Star, Lock, Crown, ArrowRight, Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { rewardsAPI, shopAPI, type ShopCatalogItem } from "@/lib/api"
import { useAuthStore } from "@/lib/store"

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "detail" in error.response.data &&
    typeof error.response.data.detail === "string"
  ) {
    return error.response.data.detail
  }
  return fallback
}

const itemVisuals: Record<string, { icon: string; gradient: string; borderColor: string; description: string; rarityColor: string }> = {
  cool_sunglasses: { icon: "😎", gradient: "from-cyan-100 to-blue-100", borderColor: "border-cyan-300", description: "Look cool while you checkmate!", rarityColor: "bg-slate-100 text-slate-600" },
  golden_crown: { icon: "👑", gradient: "from-yellow-100 to-amber-100", borderColor: "border-yellow-300", description: "Rule the board like royalty!", rarityColor: "bg-blue-100 text-blue-700" },
  fire_trail: { icon: "🔥", gradient: "from-orange-100 to-red-100", borderColor: "border-orange-300", description: "Leave a blazing trail!", rarityColor: "bg-purple-100 text-purple-700" },
  space_theme: { icon: "🚀", gradient: "from-indigo-100 to-purple-100", borderColor: "border-indigo-300", description: "Play chess among the stars!", rarityColor: "bg-purple-100 text-purple-700" },
  castle_theme: { icon: "🏰", gradient: "from-stone-100 to-amber-100", borderColor: "border-stone-300", description: "A medieval chess fortress!", rarityColor: "bg-blue-100 text-blue-700" },
  dragon_pet: { icon: "🐉", gradient: "from-emerald-100 to-green-100", borderColor: "border-emerald-300", description: "Your very own dragon companion!", rarityColor: "bg-amber-100 text-amber-700" },
}

type StarShopMode = "preview" | "full"

export function StarShopPreview({ mode = "preview" }: { mode?: StarShopMode }) {
  const { user, updateUser, refreshCurrentUser } = useAuthStore()
  const [items, setItems] = useState<ShopCatalogItem[]>([])
  const [stars, setStars] = useState(0)
  const [equippedItems, setEquippedItems] = useState<Record<string, string | null>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [buyingKey, setBuyingKey] = useState<string | null>(null)
  const [equippingKey, setEquippingKey] = useState<string | null>(null)

  useEffect(() => {
    void loadShop()
  }, [])

  const loadShop = async () => {
    setIsLoading(true)
    try {
      const [wallet, catalog] = await Promise.all([rewardsAPI.getWallet(), shopAPI.getCatalog()])
      setStars(wallet.star_balance)
      setItems(catalog.items)
      setEquippedItems(catalog.equipped_items ?? {})
      updateUser({ star_balance: wallet.star_balance, total_xp: wallet.total_xp })
    } catch {
      toast.error("Failed to load star shop")
    } finally {
      setIsLoading(false)
    }
  }

  const maxConvertibleStars = useMemo(() => Math.floor((user?.total_xp ?? 0) / 250), [user?.total_xp])

  const convertOneStar = async () => {
    setConverting(true)
    try {
      const res = await rewardsAPI.convertXpToStars(1)
      setStars(res.star_balance)
      updateUser({ star_balance: res.star_balance, total_xp: res.remaining_xp })
      toast.success("Converted 250 XP into 1 star")
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "XP conversion failed"))
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
      if (res.equipped_items) setEquippedItems(res.equipped_items)
      setItems((prev) =>
        prev.map((p) =>
          p.item_key === item.item_key
            ? { ...p, owned: true, equipped: true }
            : p.category === item.category
              ? { ...p, equipped: false }
              : p
        )
      )
      toast.success(`${item.name} purchased and added to your collection!`)
      await refreshCurrentUser()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Purchase failed"))
    } finally {
      setBuyingKey(null)
    }
  }

  const equipItem = async (item: ShopCatalogItem) => {
    setEquippingKey(item.item_key)
    try {
      const res = await shopAPI.equip(item.item_key)
      setEquippedItems(res.equipped_items ?? {})
      setItems((prev) =>
        prev.map((p) =>
          p.category === item.category ? { ...p, equipped: p.item_key === item.item_key } : p
        )
      )
      toast.success(`${item.name} equipped`)
      await refreshCurrentUser()
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Equip failed"))
    } finally {
      setEquippingKey(null)
    }
  }

  const gridClass =
    mode === "full"
      ? "grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 xl:grid-cols-3"
      : "grid grid-cols-2 gap-4 p-5 sm:grid-cols-3"

  return (
    <section className={mode === "preview" ? "mb-6" : ""} id={mode === "preview" ? "star-shop-preview" : undefined}>
      <div className="overflow-hidden rounded-3xl border-2 border-yellow-200 bg-card shadow-sm">
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-white" />
              <div>
                <h3 className="font-heading text-lg font-bold text-white">Star Shop</h3>
                <p className="text-xs font-semibold text-white/80">1 star = 250 XP</p>
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
                Convert 250 XP {"->"} 1 Star
              </button>
            </div>
          </div>
        </div>
        <div className={gridClass}>
          {items.map((item) => {
            const view = itemVisuals[item.item_key] ?? itemVisuals.cool_sunglasses
            const canAfford = stars >= item.stars_cost
            const isOwned = item.owned
            const isEquipped = item.equipped || equippedItems[item.category] === item.item_key
            return (
              <div
                key={item.item_key}
                className={`group relative flex flex-col items-center gap-3 rounded-2xl border-2 bg-gradient-to-br ${view.gradient} ${view.borderColor} p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${item.rarity === "Rare" ? "animate-rarity-glow-rare" : item.rarity === "Epic" ? "animate-rarity-glow-epic" : item.rarity === "Legendary" ? "animate-rarity-glow-legendary" : ""}`}
              >
                {!canAfford && !isOwned && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-card/60 backdrop-blur-[2px]">
                    <Lock className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                )}
                <span className="text-5xl leading-none" role="img" aria-label={item.name}>{view.icon}</span>
                <p className="text-center font-heading text-sm font-bold leading-tight text-card-foreground">{item.name}</p>
                <p className="hidden text-center text-xs font-semibold text-muted-foreground group-hover:block">{view.description}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${view.rarityColor}`}>{item.rarity}</span>
                <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] font-bold text-card-foreground">
                  {item.category.replace("_", " ")}
                </span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className={`font-heading text-base font-bold ${canAfford ? "text-yellow-700" : "text-muted-foreground"}`}>{item.stars_cost}</span>
                </div>
                {isOwned ? (
                  <button
                    onClick={() => equipItem(item)}
                    disabled={isEquipped || equippingKey === item.item_key || isLoading}
                    className="rounded-lg bg-white/70 px-3 py-1 text-xs font-bold text-card-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isEquipped ? "Equipped" : "Equip"}
                  </button>
                ) : (
                  <button
                    onClick={() => buyItem(item)}
                    disabled={!canAfford || buyingKey === item.item_key || isLoading}
                    className="rounded-lg bg-white/70 px-3 py-1 text-xs font-bold text-card-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Buy
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div className="space-y-4 px-5 pb-5">
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Loading shop..." : `XP: ${user?.total_xp ?? 0} | Stars: ${stars} | Owned: ${items.filter((i) => i.owned).length}`}
          </p>
          {mode === "preview" && (
            <Link
              href="/star-shop"
              className="group relative flex w-full flex-col overflow-hidden rounded-2xl border-2 border-amber-300/80 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 p-[2px] shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
            >
              <span className="flex min-h-[4.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-[14px] bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-3.5 text-center sm:flex-row sm:gap-3 sm:text-left">
                <span className="flex shrink-0 items-center justify-center rounded-full bg-white/20 p-2 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5 text-white" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-center gap-2 font-heading text-base font-bold text-white sm:justify-start sm:text-lg">
                    Visit full Star Shop
                    <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-white/90">
                    Bigger layout · equip cosmetics · board themes and trails
                  </span>
                </span>
                <Crown className="hidden h-8 w-8 shrink-0 text-white/90 sm:block" aria-hidden />
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
