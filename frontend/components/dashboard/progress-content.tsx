"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock3,
  Gamepad2,
  Sparkles,
  TrendingUp,
  Star,
  Zap,
  Trophy,
} from "lucide-react"
import { useAuthStore } from "@/lib/store"
import { LevelCard } from "./level-card"
import { gameAPI, userAPI, type Game, type UserStats } from "@/lib/api"

type ChartPoint = { label: string; value: number }

function formatShortDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function getLastNDates(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

function SimpleLineChart({
  data,
  strokeClassName,
  areaClassName,
}: {
  data: ChartPoint[]
  strokeClassName: string
  areaClassName: string
}) {
  const width = 100
  const height = 40
  const padX = 6
  const padY = 4
  const min = Math.min(...data.map((d) => d.value))
  const max = Math.max(...data.map((d) => d.value))
  const span = Math.max(1, max - min)
  const stepX = (width - padX * 2) / Math.max(1, data.length - 1)

  const points = data
    .map((d, i) => {
      const x = padX + i * stepX
      const y = padY + (height - padY * 2) * (1 - (d.value - min) / span)
      return `${x},${y}`
    })
    .join(" ")
  const areaPoints = `${padX},${height - padY} ${points} ${width - padX},${height - padY}`
  const midLabel = data[Math.floor(data.length / 2)]?.label ?? ""

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full overflow-visible">
        <polyline points={areaPoints} className={areaClassName} />
        <polyline points={points} className={strokeClassName} fill="none" strokeWidth="1.8" />
      </svg>
      <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{midLabel}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

export function ProgressContent() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  const totalXP = user?.total_xp ?? 0
  const stars = user?.star_balance ?? 0
  const currentLevel = user?.level ?? 1
  const rating = user?.rating ?? 100

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const [statsData, gamesData] = await Promise.all([
          userAPI.getStats(),
          gameAPI.getGames({ user_id: user.id, limit: 200 }),
        ])
        if (!cancelled) {
          setStats(statsData)
          setGames(gamesData)
        }
      } catch {
        if (!cancelled) {
          setStats(null)
          setGames([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Scroll to Your Level when navigating with hash.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#your-level") {
      const t = setTimeout(() => {
        document.getElementById("your-level")?.scrollIntoView({ behavior: "smooth" })
      }, 150)
      return () => clearTimeout(t)
    }
  }, [])

  const dailyGameCounts = useMemo(() => {
    const days = getLastNDates(30)
    const counts = new Map<string, number>(days.map((d) => [d, 0]))
    games.forEach((g) => {
      const when = (g.ended_at || g.started_at || "").slice(0, 10)
      if (counts.has(when)) {
        counts.set(when, (counts.get(when) ?? 0) + 1)
      }
    })
    return days.map((d) => ({ day: d, count: counts.get(d) ?? 0 }))
  }, [games])

  const activityTrend: ChartPoint[] = useMemo(
    () => dailyGameCounts.map((d) => ({ label: formatShortDate(d.day), value: d.count })),
    [dailyGameCounts],
  )

  const ratingTrend: ChartPoint[] = useMemo(() => {
    const days = getLastNDates(30)
    const deltasByDay = new Map<string, number>(days.map((d) => [d, 0]))
    const completed = games
      .filter((g) => g.result && g.result !== "*")
      .sort((a, b) => new Date(a.ended_at || a.started_at).getTime() - new Date(b.ended_at || b.started_at).getTime())

    completed.forEach((g) => {
      const day = (g.ended_at || g.started_at || "").slice(0, 10)
      if (!deltasByDay.has(day)) return
      const isWhite = g.white_player_id === user?.id
      const res = g.result
      let delta = 0
      if (res === "1/2-1/2") delta = 0
      else if ((res === "1-0" && isWhite) || (res === "0-1" && !isWhite)) delta = 8
      else delta = -8
      deltasByDay.set(day, (deltasByDay.get(day) ?? 0) + delta)
    })

    let running = rating - Array.from(deltasByDay.values()).reduce((a, b) => a + b, 0)
    return days.map((d) => {
      running += deltasByDay.get(d) ?? 0
      return { label: formatShortDate(d), value: running }
    })
  }, [games, rating, user?.id])

  const gamesLast30 = dailyGameCounts.reduce((sum, d) => sum + d.count, 0)
  const activeDays = dailyGameCounts.filter((d) => d.count > 0).length
  const ratingChange30 = ratingTrend.length > 1 ? ratingTrend[ratingTrend.length - 1].value - ratingTrend[0].value : 0

  const recentGames = useMemo(
    () =>
      games
        .filter((g) => g.result && g.result !== "*")
        .sort((a, b) => new Date(b.ended_at || b.started_at).getTime() - new Date(a.ended_at || a.started_at).getTime())
        .slice(0, 5),
    [games],
  )

  const totalGamesPlayed = stats?.games_played ?? games.length
  const puzzleAttempts = stats?.puzzle_attempts ?? 0

  return (
    <div className="mx-auto max-w-6xl pt-0">
      <section className="mb-6">
        <LevelCard currentLevel={currentLevel} rating={rating} />
      </section>

      <section className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-3xl border-2 border-amber-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">Total XP</h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Zap className="h-8 w-8 text-amber-500" />
              <span className="font-heading text-4xl font-bold text-amber-600">
                {totalXP.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border-2 border-yellow-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">Stars</h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
              <span className="font-heading text-4xl font-bold text-yellow-600">
                {stars}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border-2 border-indigo-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">Games (30D)</h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Gamepad2 className="h-8 w-8 text-indigo-500" />
              <span className="font-heading text-4xl font-bold text-indigo-600">
                {gamesLast30}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border-2 border-cyan-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">Active Days (30D)</h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Calendar className="h-8 w-8 text-cyan-500" />
              <span className="font-heading text-4xl font-bold text-cyan-600">
                {activeDays}/30
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border-2 border-emerald-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xl font-bold text-white">Rating Trend</h3>
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-white/90">Estimated 30-day rating path</p>
            </div>
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span className="text-card-foreground">Rating change (30D)</span>
                <span className={ratingChange30 >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {ratingChange30 >= 0 ? "+" : ""}
                  {ratingChange30}
                </span>
              </div>
              <SimpleLineChart
                data={ratingTrend}
                strokeClassName="stroke-emerald-500"
                areaClassName="fill-emerald-200/40"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border-2 border-blue-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xl font-bold text-white">Activity Trend</h3>
                <Activity className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-white/90">Games played per day (30D)</p>
            </div>
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span className="text-card-foreground">Active days (30D)</span>
                <span className="text-cyan-600">{activeDays}/30</span>
              </div>
              <SimpleLineChart
                data={activityTrend}
                strokeClassName="stroke-cyan-500"
                areaClassName="fill-cyan-200/40"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-purple-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-2xl font-bold text-white">Learning & Rewards</h3>
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-purple-700">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Total XP</span>
                </div>
                <p className="font-heading text-2xl font-bold text-purple-900">{totalXP.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-yellow-700">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="text-xs font-bold uppercase">Stars</span>
                </div>
                <p className="font-heading text-2xl font-bold text-yellow-900">{stars}</p>
              </div>
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-blue-700">
                  <Gamepad2 className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Games Played</span>
                </div>
                <p className="font-heading text-2xl font-bold text-blue-900">{totalGamesPlayed}</p>
              </div>
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-emerald-700">
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Puzzle Attempts</span>
                </div>
                <p className="font-heading text-2xl font-bold text-emerald-900">{puzzleAttempts}</p>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              XP and Stars are rewards. Level progression is based on rating in the card above.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-border bg-card shadow-sm">
          <div className="bg-gradient-to-r from-slate-600 to-slate-500 px-5 py-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-white">Recent Games</h3>
              <Clock3 className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex flex-col divide-y divide-border p-5">
            {loading && (
              <div className="flex items-center gap-2 py-4 text-sm font-semibold text-muted-foreground">
                <Clock3 className="h-4 w-4 animate-spin" />
                Loading activity...
              </div>
            )}
            {!loading && recentGames.length === 0 && (
              <div className="flex items-center gap-2 py-4 text-sm font-semibold text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                No recent completed games yet.
              </div>
            )}
            {!loading &&
              recentGames.map((g) => {
                const isWhite = g.white_player_id === user?.id
                const resultLabel =
                  g.result === "1/2-1/2"
                    ? "Draw"
                    : (g.result === "1-0" && isWhite) || (g.result === "0-1" && !isWhite)
                      ? "Won"
                      : "Lost"
                const date = new Date(g.ended_at || g.started_at).toLocaleDateString()
                return (
                  <div key={g.id} className="flex items-center gap-4 py-3 transition-all duration-200 hover:bg-muted/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                      <Gamepad2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-sm font-bold text-card-foreground">
                        Game #{g.id} • {resultLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                        resultLabel === "Won"
                          ? "bg-emerald-100 text-emerald-700"
                          : resultLabel === "Draw"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {resultLabel === "Won" ? <CheckCircle className="mr-1 inline h-3 w-3" /> : null}
                      {resultLabel}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      </section>
    </div>
  )
}
