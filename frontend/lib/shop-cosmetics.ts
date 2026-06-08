import type { CSSProperties } from "react"
import type { User } from "./api"

/** react-chessboard square colors from equipped board_theme shop item (viewer's theme). */
export function getShopBoardSquareStyles(themeKey: string | null | undefined): {
  lightSquareStyle: CSSProperties
  darkSquareStyle: CSSProperties
} {
  switch (themeKey) {
    case "space_theme":
      return {
        lightSquareStyle: { backgroundColor: "#818cf8" },
        darkSquareStyle: { backgroundColor: "#312e81" },
      }
    case "castle_theme":
      return {
        lightSquareStyle: { backgroundColor: "#f5e6c8" },
        darkSquareStyle: { backgroundColor: "#6b4f2a" },
      }
    default:
      return {
        lightSquareStyle: { backgroundColor: "#eeeed2" },
        darkSquareStyle: { backgroundColor: "#769656" },
      }
  }
}

export function shopAvatarTrailClass(trailKey: string | null | undefined): string {
  if (trailKey === "fire_trail") {
    return "shadow-[0_0_14px_rgba(251,146,60,0.95)] shadow-orange-400/80"
  }
  return ""
}

export function resolveShopCosmeticsForPlayer(
  player: User | null | undefined,
  authUser: User | null | undefined,
): {
  accessoryKey: string | null
  companionKey: string | null
  trailKey: string | null
} {
  if (!player?.id) {
    return { accessoryKey: null, companionKey: null, trailKey: null }
  }
  const src = authUser && player.id === authUser.id ? authUser : player
  return {
    accessoryKey: src.equipped_accessory_item_key ?? null,
    companionKey: src.equipped_companion_item_key ?? null,
    trailKey: src.equipped_trail_item_key ?? null,
  }
}
