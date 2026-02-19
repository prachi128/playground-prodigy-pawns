"use client"

import { useState, useEffect } from "react"
import { Trophy, Medal, Star, Zap, Crown, TrendingUp } from "lucide-react"
import { leaderboardAPI, LeaderboardEntry } from "@/lib/api"
import { useAuthStore } from "@/lib/store"
import toast from "react-hot-toast"

export function LeaderboardContent() {
  const { user } = useAuthStore()
  const [leaderboardType, setLeaderboardType] = useState<"xp" | "rating">("xp")
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [leaderboardType])

  const loadLeaderboard = async () => {
    setIsLoading(true)
    try {
      const data = await leaderboardAPI.get(leaderboardType, 50)
      setLeaderboard(data)
    } catch (error) {
      console.error("Failed to load leaderboard:", error)
      toast.error("Failed to load leaderboard")
    } finally {
      setIsLoading(false)
    }
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇"
    if (rank === 2) return "🥈"
    if (rank === 3) return "🥉"
    return null
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-yellow-400 to-amber-500"
    if (rank === 2) return "from-gray-300 to-gray-400"
    if (rank === 3) return "from-orange-400 to-orange-500"
    return "from-slate-200 to-slate-300"
  }

  const currentUserRank = leaderboard.findIndex((entry) => entry.user_id === user?.id) + 1

  return (
    <div className="mx-auto max-w-6xl pt-6">
      {/* Mascot Speech Bubble */}
      <section className="mb-5">
        <div className="flex items-start gap-3">
          <div className="animate-mascot-bounce shrink-0 text-5xl">{"♞"}</div>
          <div className="relative flex-1">
            <div className="absolute -left-2 top-4 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-white" />
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="font-heading text-lg font-bold text-card-foreground">
                {"Compete with the best! 🏆"}
              </p>
              <p className="mt-0.5 font-heading text-sm font-semibold text-muted-foreground">
                {"See where you rank among all players! 📊"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Type Selector */}
      <section className="mb-6">
        <div className="flex gap-3 rounded-2xl border-2 border-border bg-card p-2 shadow-sm">
          <button
            onClick={() => setLeaderboardType("xp")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-heading font-bold transition-all ${
              leaderboardType === "xp"
                ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <Star className="h-5 w-5" />
            XP Leaderboard
          </button>
          <button
            onClick={() => setLeaderboardType("rating")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-heading font-bold transition-all ${
              leaderboardType === "rating"
                ? "bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <Trophy className="h-5 w-5" />
            Rating Leaderboard
          </button>
        </div>
      </section>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <section className="mb-6">
          <div className="grid grid-cols-3 gap-4">
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, idx) => {
              const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3
              const height = idx === 1 ? "h-48" : "h-36"
              return (
                <div
                  key={entry.user_id}
                  className={`flex flex-col items-center justify-end rounded-3xl border-2 bg-gradient-to-t ${getRankColor(actualRank)} p-6 shadow-lg ${
                    actualRank === 1 ? "border-yellow-300" : actualRank === 2 ? "border-gray-300" : "border-orange-300"
                  }`}
                >
                  <div className={`${height} flex flex-col items-center justify-center w-full`}>
                    <div className="text-4xl mb-2">{getRankEmoji(actualRank)}</div>
                    <div className="text-3xl font-heading font-bold text-white mb-1">
                      #{actualRank}
                    </div>
                    <div className="text-lg font-heading font-bold text-white text-center mb-2">
                      {entry.full_name}
                    </div>
                    <div className="text-sm text-white/90 mb-1">@{entry.username}</div>
                    <div className="flex items-center gap-1 text-white">
                      {leaderboardType === "xp" ? (
                        <>
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-bold">{entry.score.toLocaleString()} XP</span>
                        </>
                      ) : (
                        <>
                          <Trophy className="h-4 w-4" />
                          <span className="font-bold">{entry.score}</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-white/80 mt-1">Level {entry.level}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Leaderboard List */}
      <section>
        <div className="overflow-hidden rounded-3xl border-2 border-border bg-card shadow-sm">
          <div className="bg-gradient-to-r from-slate-600 to-slate-500 px-5 py-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-white">
                {"Full Leaderboard 📋"}
              </h3>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>Top {leaderboard.length} Players</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
                <p className="font-heading text-muted-foreground font-semibold">Loading leaderboard...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {leaderboard.map((entry, idx) => {
                const rank = idx + 1
                const isCurrentUser = entry.user_id === user?.id
                const isTopThree = rank <= 3

                return (
                  <div
                    key={entry.user_id}
                    className={`group flex items-center gap-4 p-4 transition-all duration-200 ${
                      isCurrentUser
                        ? "bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {/* Rank */}
                    <div className="flex w-12 shrink-0 items-center justify-center">
                      {isTopThree ? (
                        <span className="text-2xl">{getRankEmoji(rank)}</span>
                      ) : (
                        <span
                          className={`font-heading text-lg font-bold ${
                            isCurrentUser ? "text-purple-600" : "text-muted-foreground"
                          }`}
                        >
                          #{rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="relative">
                      <div
                        className={`h-12 w-12 rounded-full bg-gradient-to-br ${
                          isTopThree ? getRankColor(rank) : "from-slate-300 to-slate-400"
                        } flex items-center justify-center text-white font-heading font-bold text-lg shadow-md`}
                      >
                        {entry.avatar_url ? (
                          <img
                            src={entry.avatar_url}
                            alt={entry.full_name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          entry.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {isCurrentUser && (
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white">
                          <Zap className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-heading text-base font-bold truncate ${
                            isCurrentUser ? "text-purple-700" : "text-card-foreground"
                          }`}
                        >
                          {entry.full_name}
                        </p>
                        {isCurrentUser && (
                          <span className="rounded-full bg-purple-500 px-2 py-0.5 text-xs font-bold text-white">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">@{entry.username}</p>
                    </div>

                    {/* Score */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        {leaderboardType === "xp" ? (
                          <>
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-heading text-lg font-bold text-card-foreground">
                              {entry.score.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <>
                            <Trophy className="h-4 w-4 text-orange-500" />
                            <span className="font-heading text-lg font-bold text-card-foreground">
                              {entry.score}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Medal className="h-3 w-3" />
                        <span>Level {entry.level}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Current User Rank Display (if not in top 50) */}
          {currentUserRank === 0 && user && (
            <div className="border-t-2 border-border bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Zap className="h-4 w-4 text-purple-500" />
                <span className="font-heading text-sm font-semibold">
                  Your rank is outside the top {leaderboard.length}. Keep playing to climb higher!
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
