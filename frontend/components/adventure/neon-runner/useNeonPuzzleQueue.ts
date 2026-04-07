import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { puzzleAPI, type Puzzle } from "@/lib/api"
import { parseThemeList } from "@/lib/utils"

const BASE_ALLOWED_NEON_THEMES = [
  "checkmate",
  "combination",
  "endgame",
  "fork",
  "pin",
  "positional",
  "sacrifice",
] as const

const TARGET_THEME_COUNT = 10

export function useNeonPuzzleQueue() {
  const [pool, setPool] = useState<Puzzle[]>([])
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discoveredThemes, setDiscoveredThemes] = useState<string[]>([])
  const poolRef = useRef<Puzzle[]>([])
  useEffect(() => {
    poolRef.current = pool
  }, [pool])

  const allowedThemes = useMemo(() => {
    const ordered = [...BASE_ALLOWED_NEON_THEMES]
    for (const theme of discoveredThemes) {
      if (ordered.length >= TARGET_THEME_COUNT) break
      if (!ordered.includes(theme as (typeof BASE_ALLOWED_NEON_THEMES)[number])) {
        ordered.push(theme as (typeof BASE_ALLOWED_NEON_THEMES)[number])
      }
    }
    return ordered.slice(0, TARGET_THEME_COUNT)
  }, [discoveredThemes])

  const isAllowedTheme = useCallback(
    (theme?: string) => {
      if (!theme) return false
      const normalized = parseThemeList(theme).map((x) => x.toLowerCase())
      return normalized.some((t) => allowedThemes.includes(t as (typeof BASE_ALLOWED_NEON_THEMES)[number]))
    },
    [allowedThemes]
  )

  const refill = useCallback(async (): Promise<Puzzle[]> => {
    if (loading) return poolRef.current
    setLoading(true)
    setError(null)
    try {
      const batch = await puzzleAPI.getAll(undefined, undefined, skip, 200)
      setSkip((s) => s + 200)
      const valid = batch.filter((p) => isAllowedTheme(p.theme))

      const newThemes = new Set<string>()
      for (const p of batch) {
        for (const t of parseThemeList(p.theme).map((x) => x.toLowerCase())) newThemes.add(t)
      }
      setDiscoveredThemes((prev) => Array.from(new Set([...prev, ...newThemes])))

      let merged: Puzzle[] = []
      setPool((prev) => {
        const byId = new Map<number, Puzzle>()
        for (const p of prev) byId.set(p.id, p)
        for (const p of valid) byId.set(p.id, p)
        merged = Array.from(byId.values())
        return merged
      })
      return merged
    } catch {
      setError("Failed to load puzzles")
      return []
    } finally {
      setLoading(false)
    }
  }, [isAllowedTheme, loading, skip])

  const getNextPuzzle = useCallback(
    async (excludeIds: number[]): Promise<Puzzle | null> => {
      let source = poolRef.current.filter((p) => !excludeIds.includes(p.id))
      if (source.length === 0) {
        const merged = await refill()
        source = merged.filter((p) => !excludeIds.includes(p.id))
      }
      if (source.length === 0) return null
      const idx = Math.floor(Math.random() * source.length)
      return source[idx]
    },
    [refill]
  )

  return {
    loading,
    error,
    allowedThemes,
    targetThemeCount: TARGET_THEME_COUNT,
    baseThemeCount: BASE_ALLOWED_NEON_THEMES.length,
    poolSize: pool.length,
    refill,
    getNextPuzzle,
  }
}
