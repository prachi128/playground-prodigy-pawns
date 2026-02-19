"use client"

import {
  TrendingUp,
  Star,
  Trophy,
  Target,
  Zap,
  Flame,
  BookOpen,
  Swords,
  Puzzle,
  GraduationCap,
  Calendar,
  Award,
  BarChart3,
  ArrowUp,
  CheckCircle,
} from "lucide-react"
import { useAuthStore } from "@/lib/store"
import { LevelCard } from "./level-card"

const skillCategories = [
  { name: "Puzzles", icon: Puzzle, color: "from-cyan-400 to-blue-500", progress: 87, xp: 450 },
  { name: "Games", icon: Swords, color: "from-orange-400 to-pink-500", progress: 72, xp: 320 },
  { name: "Lessons", icon: BookOpen, color: "from-pink-400 to-rose-500", progress: 65, xp: 280 },
  { name: "Practice", icon: Target, color: "from-purple-400 to-indigo-500", progress: 58, xp: 190 },
]

const achievements = [
  { title: "First Win", icon: Trophy, earned: true, progress: 100, emoji: "🏆" },
  { title: "Puzzle Master", icon: Puzzle, earned: true, progress: 100, emoji: "🧩" },
  { title: "10 Day Streak", icon: Flame, earned: true, progress: 100, emoji: "🔥" },
  { title: "100 Puzzles", icon: Target, earned: false, progress: 64, emoji: "🎯" },
  { title: "Level 10", icon: Star, earned: false, progress: 40, emoji: "⭐" },
  { title: "Perfect Week", icon: Calendar, earned: false, progress: 85, emoji: "📅" },
]

const recentActivity = [
  { type: "puzzle", action: "Solved", item: "Knight Fork #4821", xp: 10, time: "2 hours ago", icon: Puzzle },
  { type: "game", action: "Won", item: "vs ChessWhiz42", xp: 25, time: "5 hours ago", icon: Swords },
  { type: "lesson", action: "Completed", item: "Meet the Bishop", xp: 40, time: "1 day ago", icon: BookOpen },
  { type: "puzzle", action: "Solved", item: "Checkmate in 2", xp: 15, time: "2 days ago", icon: Puzzle },
]

export function ProgressContent() {
  const { user } = useAuthStore()

  const totalXP = user?.total_xp ?? 0
  const currentLevel = user?.level ?? 1
  const rating = user?.rating ?? 1000
  const nextLevelXP = currentLevel * 1000
  const xpToNextLevel = nextLevelXP - totalXP
  const levelProgress = totalXP > 0 ? Math.min(100, Math.round((totalXP / nextLevelXP) * 100)) : 0

  const totalAchievements = achievements.filter((a) => a.earned).length
  const totalAchievementsPercent = Math.round((totalAchievements / achievements.length) * 100)

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
                {"Track your journey! 📊"}
              </p>
              <p className="mt-0.5 font-heading text-sm font-semibold text-muted-foreground">
                {"See how far you've come and what's next! 🚀"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Level Card */}
      <section className="mb-6">
        <LevelCard
          currentLevel={currentLevel}
          currentXP={totalXP}
          totalXPNeeded={nextLevelXP}
          userName={user?.full_name ?? "Player"}
        />
      </section>

      {/* Main Stats Grid */}
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-3xl border-2 border-emerald-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-emerald-400 to-green-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">Total XP</h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Zap className="h-8 w-8 text-emerald-500" />
              <span className="font-heading text-4xl font-bold text-emerald-600">
                {totalXP.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border-2 border-blue-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-blue-400 to-cyan-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">Rating</h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Trophy className="h-8 w-8 text-blue-500" />
              <span className="font-heading text-4xl font-bold text-blue-600">
                {rating}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border-2 border-orange-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-orange-400 to-red-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">Streak</h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Flame className="h-8 w-8 text-orange-500" />
              <span className="font-heading text-4xl font-bold text-orange-600">
                7
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border-2 border-yellow-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">Achievements</h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Award className="h-8 w-8 text-yellow-500" />
              <span className="font-heading text-4xl font-bold text-yellow-600">
                {totalAchievements}/{achievements.length}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Skill Categories Progress */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-emerald-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-emerald-400 to-green-500 px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-2xl font-bold text-white">
                {"Skill Progress 📈"}
              </h3>
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {skillCategories.map((skill, idx) => {
                const Icon = skill.icon
                return (
                  <div
                    key={skill.name}
                    className="group rounded-2xl border-2 border-border bg-white p-4 transition-all duration-200 hover:shadow-md"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${skill.color}`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-heading text-base font-bold text-card-foreground">
                            {skill.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{skill.xp} XP earned</p>
                        </div>
                      </div>
                      <span className="font-heading text-lg font-bold text-emerald-600">
                        {skill.progress}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${skill.color} transition-all duration-500`}
                        style={{ width: `${skill.progress}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Achievements Progress */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-yellow-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-2xl font-bold text-white">
                {"Achievements 🏆"}
              </h3>
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-bold text-white">{totalAchievementsPercent}%</span>
                <Award className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="mb-4 h-3 overflow-hidden rounded-full bg-yellow-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-500"
                style={{ width: `${totalAchievementsPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement, idx) => {
                const Icon = achievement.icon
                return (
                  <div
                    key={achievement.title}
                    className={`group relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-200 ${
                      achievement.earned
                        ? "border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-md"
                        : "border-border bg-white hover:shadow-md"
                    }`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
                          achievement.earned ? "bg-gradient-to-br from-yellow-400 to-amber-500" : "bg-muted"
                        }`}
                      >
                        {achievement.earned ? achievement.emoji : <Icon className="h-6 w-6 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-heading text-sm font-bold ${
                          achievement.earned ? "text-yellow-700" : "text-card-foreground"
                        }`}>
                          {achievement.title}
                        </p>
                        {!achievement.earned && (
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500"
                              style={{ width: `${achievement.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {achievement.earned && (
                        <CheckCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-border bg-card shadow-sm">
          <div className="bg-gradient-to-r from-slate-600 to-slate-500 px-5 py-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-white">
                {"Recent Activity 📝"}
              </h3>
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex flex-col divide-y divide-border p-5">
            {recentActivity.map((activity, idx) => {
              const Icon = activity.icon
              return (
                <div
                  key={idx}
                  className="flex items-center gap-4 py-3 transition-all duration-200 hover:bg-muted/50"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                    <Icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm font-bold text-card-foreground">
                      {activity.action} <span className="font-normal">{activity.item}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1">
                    <ArrowUp className="h-3 w-3 text-emerald-600" />
                    <span className="font-heading text-sm font-bold text-emerald-700">
                      +{activity.xp} XP
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* XP to Next Level */}
      <section>
        <div className="overflow-hidden rounded-3xl border-2 border-emerald-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-emerald-400 to-green-500 px-5 py-4">
            <h3 className="font-heading text-xl font-bold text-white">
              {"Next Level Progress 🎯"}
            </h3>
          </div>
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-heading text-sm font-bold text-card-foreground">
                Level {currentLevel} → Level {currentLevel + 1}
              </span>
              <span className="font-heading text-sm font-bold text-emerald-600">
                {xpToNextLevel > 0 ? `${xpToNextLevel} XP needed` : "Level Up!"}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {totalXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
