import type { ShopCatalogItem, ShopInventoryResponse } from "@/lib/api"

type ShopCategory = ShopCatalogItem["category"]

const CATEGORY_LABELS: Record<ShopCategory, string> = {
  accessory: "Accessories",
  board_theme: "Board Themes",
  trail: "Trails",
  companion: "Companions",
}

export function getCollectorTitle(ownedCount: number, totalCount: number): string {
  if (totalCount > 0 && ownedCount >= totalCount) return "Master Collector"
  if (ownedCount >= 4) return "Collector II"
  if (ownedCount >= 2) return "Collector I"
  return "New Collector"
}

export function getCollectionStats(items: ShopCatalogItem[]) {
  const ownedCount = items.filter((item) => item.owned).length
  const equippedCount = items.filter((item) => item.equipped).length
  const rarePlusCount = items.filter((item) => item.owned && item.rarity !== "Common").length
  const progressPercent = items.length > 0 ? Math.round((ownedCount / items.length) * 100) : 0

  const categoryProgress = Object.entries(CATEGORY_LABELS).map(([key, label]) => {
    const category = key as ShopCategory
    const total = items.filter((item) => item.category === category).length
    const owned = items.filter((item) => item.category === category && item.owned).length
    return { key: category, label, owned, total }
  })

  return {
    ownedCount,
    totalCount: items.length,
    equippedCount,
    rarePlusCount,
    progressPercent,
    collectorTitle: getCollectorTitle(ownedCount, items.length),
    categoryProgress,
  }
}

export function getInventorySummary(inventory: ShopInventoryResponse | null) {
  const ownedItems = inventory?.owned_items ?? []
  const ownedCount = ownedItems.length
  const rarePlusCount = ownedItems.filter((item) => item.rarity !== "Common").length
  const categoryCounts = Object.entries(CATEGORY_LABELS).map(([key, label]) => {
    const category = key as ShopCategory
    const owned = ownedItems.filter((item) => item.category === category).length
    return { key: category, label, owned }
  })

  return {
    ownedCount,
    rarePlusCount,
    collectorTitle: getCollectorTitle(ownedCount, 6),
    categoryCounts,
    latestItems: ownedItems.slice(0, 3),
  }
}
