"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import {
  Trophy,
  Target,
  Flame,
  Swords,
  Clock,
  ChevronRight,
  BookOpen,
  Star,
  Zap,
  GraduationCap,
  Sparkles,
  Check,
} from "lucide-react"
import { CampaignStrip } from "./campaign-strip"
import { StarShopPreview } from "./star-shop"
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist"
import { LevelCard } from "./level-card"
import { ActivityFeed } from "./activity-feed"

// --- Data ---

const actionCards = [
  {
    title: "Play Now!",
    description: "Challenge another kid!",
    image: "/images/play-chess.jpg",
    gradient: "from-orange-400 to-pink-500",
    borderColor: "border-orange-300",
    emoji: "\u2694\uFE0F",
  },
  {
    title: "Solve This!",
    description: "Puzzles to train your brain!",
    image: "/images/puzzle-duel.jpg",
    gradient: "from-cyan-400 to-blue-500",
    borderColor: "border-cyan-300",
    emoji: "\uD83E\uDDE9",
  },
  {
    title: "Beat the Bot!",
    description: "Can you outsmart the computer?",
    image: "/images/play-bot.jpg",
    gradient: "from-purple-400 to-indigo-500",
    borderColor: "border-purple-300",
    emoji: "\uD83E\uDD16",
  },
]

const levelRanks = [
  { name: "Pawn", emoji: "\u265F", color: "bg-amber-100 text-amber-700" },
  { name: "Knight", emoji: "\u265E", color: "bg-emerald-100 text-emerald-700" },
  { name: "Bishop", emoji: "\u265D", color: "bg-blue-100 text-blue-700" },
  { name: "Rook", emoji: "\u265C", color: "bg-purple-100 text-purple-700" },
  { name: "Queen", emoji: "\u265B", color: "bg-pink-100 text-pink-700" },
  { name: "King", emoji: "\u265A", color: "bg-yellow-100 text-yellow-700" },
]

const currentRankIndex = 1 // Knight

const recentActivity = [
  {
    type: "game",
    result: "Won! \uD83C\uDF89",
    description: "You beat ChessWhiz42!",
    time: "5 min ago",
    badge: "bg-emerald-100 text-emerald-700",
    gradientBg: "from-emerald-50 to-green-50",
    icon: Swords,
    xp: "+25 XP",
  },
  {
    type: "puzzle",
    result: "Solved! \u2B50",
    description: "Knight Fork Puzzle #4821",
    time: "32 min ago",
    badge: "bg-cyan-100 text-cyan-700",
    gradientBg: "from-cyan-50 to-blue-50",
    icon: Target,
    xp: "+10 XP",
  },
  {
    type: "lesson",
    result: "Complete! \uD83D\uDCDA",
    description: "Meet the Bishop",
    time: "1 hour ago",
    badge: "bg-purple-100 text-purple-700",
    gradientBg: "from-purple-50 to-indigo-50",
    icon: BookOpen,
    xp: "+40 XP",
  },
]

const dailyTasks = [
  { label: "Solve 5 puzzles", done: true, xp: 25, emoji: "🧩", type: "puzzle", icon: Target },
  { label: "Play 2 games", done: true, xp: 20, emoji: "⚔️", type: "game", icon: Swords },
  { label: "Watch a lesson", done: false, xp: 30, emoji: "📚", type: "lesson", icon: BookOpen },
  { label: "Practice opening", done: false, xp: 15, emoji: "🎯", type: "practice", icon: Target },
]

// --- Confetti mini component ---
const ConfettiBurst = memo(function ConfettiBurst() {
  const colors = ["bg-yellow-400", "bg-pink-400", "bg-cyan-400", "bg-emerald-400", "bg-orange-400", "bg-purple-400"]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {colors.map((color, i) => (
        <div
          key={i}
          className={`animate-confetti absolute h-2 w-2 rounded-full ${color}`}
          style={{
            left: `${15 + i * 14}%`,
            top: "10%",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  )
})

// --- Main Component ---
export function DashboardContent() {
  const completedTasks = dailyTasks.filter((t) => t.done).length
  const totalTasks = dailyTasks.length
  const allDone = completedTasks === totalTasks
  const [showConfetti, setShowConfetti] = useState(false)
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState({ hours: 6, minutes: 23 })
  const [tasks, setTasks] = useState(dailyTasks)
  const [streakData, setStreakData] = useState({
    days: 7,
    freezeCount: 2,
    bestStreak: 12,
    isOnFire: true,
    weekDays: [true, true, true, true, true, true, false], // M-S completion
  })
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [showStreakLostModal, setShowStreakLostModal] = useState(false)

  const getMilestoneText = useCallback((days: number) => {
    if (days === 3) return { emoji: "🔥", text: "Getting Warm" }
    if (days === 7) return { emoji: "🔥🔥", text: "On Fire!" }
    if (days === 14) return { emoji: "🔥🔥🔥", text: "Blazing!" }
    if (days === 30) return { emoji: "🔥🔥🔥🔥", text: "Legendary!" }
    if (days === 100) return { emoji: "👑🔥", text: "Immortal Flame!" }
    return null
  }, [])

  const classAverage = useMemo(() => 4, [])
  const userStreakComparison = useMemo(() => 
    streakData.days > classAverage ? "higher" : "lower", 
    [streakData.days, classAverage]
  )

  // Simulate time counting down
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev.minutes === 0) {
          return { hours: prev.hours - 1, minutes: 59 }
        }
        return { ...prev, minutes: prev.minutes - 1 }
      })
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  const handleTaskComplete = useCallback((idx: number) => {
    if (!tasks[idx].done) {
      setCompletingTaskId(idx)
      setShowConfetti(true)
      setTimeout(() => {
        const newTasks = [...tasks]
        newTasks[idx].done = true
        setTasks(newTasks)
        setCompletingTaskId(null)
        setShowConfetti(false)
      }, 800)
    }
  }, [tasks])

  const isUrgent = timeRemaining.hours < 2
  const progressPercent = Math.round((completedTasks / totalTasks) * 100)

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
                {"Ready for today's adventure? \uD83D\uDE80"}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-muted-foreground">
                {"Complete all your tasks to earn +50 bonus XP! \uD83C\uDF1F"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Action Cards - Vibrant gradient backgrounds */}
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {actionCards.map((card, idx) => (
            <button
              key={card.title}
              className={`animate-bounce-in hover-wiggle group flex flex-col overflow-hidden rounded-3xl border-2 ${card.borderColor} bg-card shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              style={{ animationDelay: `${idx * 120}ms` }}
            >
              {/* Illustration */}
              <div className="relative h-40 w-full overflow-hidden sm:h-44">
                <img
                  src={card.image}
                  alt={card.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Floating emoji */}
                <div className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl shadow-lg">
                  {card.emoji}
                </div>
              </div>
              {/* Gradient button label */}
              <div className={`bg-gradient-to-r ${card.gradient} px-4 py-4 text-center`}>
                <span className="font-heading text-xl font-bold text-white drop-shadow-sm">
                  {card.title}
                </span>
                <p className="mt-0.5 text-xs font-semibold text-white/80">
                  {card.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Campaign Progress Strip */}
      <CampaignStrip />

      {/* NEW: Comprehensive Level Card */}
      <LevelCard currentLevel={4} currentXP={640} totalXPNeeded={1000} userName="Player" />

      {/* Daily Tasks + Streak Row */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Daily Tasks - Enhanced */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-orange-200 bg-card shadow-sm lg:col-span-2">
          {showConfetti && <ConfettiBurst />}
          <div className="bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-2xl font-bold text-white">
                  {"Today's Quests 🎯"}
                </h3>
                <p className="text-xs font-semibold text-white/80">
                  {allDone ? "All complete!" : `${completedTasks}/${totalTasks} challenges done`}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="rounded-full bg-white/25 px-4 py-2">
                  <span className="font-heading text-2xl font-bold text-white">
                    {progressPercent}%
                  </span>
                </div>
                <p className={`text-xs font-bold ${isUrgent ? "animate-time-pulse text-red-300" : "text-white/70"}`}>
                  Reset in {timeRemaining.hours}h {String(timeRemaining.minutes).padStart(2, "0")}m
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {/* Task Cards Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tasks.map((task, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTaskComplete(idx)}
                  className={`group relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 ${
                    task.done
                      ? "border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md"
                      : isUrgent
                      ? "border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 hover:shadow-lg hover:-translate-y-1"
                      : "border-border bg-white hover:shadow-lg hover:-translate-y-1"
                  }`}
                  disabled={task.done}
                >
                  {/* Number indicator */}
                  <div className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    task.done
                      ? "bg-green-500 text-white"
                      : "bg-orange-500 text-white animate-number-pop"
                  }`}>
                    {task.done ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl font-bold transition-all ${
                      task.done
                        ? "scale-100 bg-green-500/20"
                        : "bg-orange-100 group-hover:scale-110"
                    }`}>
                      {task.emoji}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-base font-bold ${
                        task.done ? "line-through text-green-700" : "text-card-foreground"
                      }`}>
                        {task.label}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{task.type}</p>
                    </div>
                  </div>

                  {/* XP badge with animation */}
                  {!task.done && (
                    <div className={`absolute bottom-3 right-3 rounded-lg bg-amber-100 px-2 py-1 font-heading text-sm font-bold text-amber-700 ${
                      completingTaskId === idx ? "animate-badge-zoom" : ""
                    }`}>
                      +{task.xp} XP
                    </div>
                  )}
                  {task.done && (
                    <div className="absolute bottom-3 right-3 rounded-lg bg-green-100 px-2 py-1 font-heading text-xs font-bold text-green-700">
                      +{task.xp} XP
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Bonus section */}
            <div className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 border-2 border-amber-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-sm font-bold text-amber-900">Completion Bonus</p>
                  <p className="text-xs text-amber-700">Complete all tasks for +50 bonus XP 🚀</p>
                </div>
                <span className="text-2xl">🎁</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Streak + Stats */}
        <div className="flex flex-col gap-4">
          {/* ENHANCED Streak Counter with Milestones */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-orange-200 bg-card shadow-sm">
            {/* Milestone celebration modal backdrop */}
            {showMilestoneModal && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="relative rounded-2xl bg-white p-8 text-center animate-milestone">
                  <p className="text-5xl">🎉</p>
                  <p className="mt-2 font-heading text-3xl font-bold text-orange-600">
                    {getMilestoneText(streakData.days)?.text}
                  </p>
                  <p className="mt-1 text-lg">
                    {getMilestoneText(streakData.days)?.emoji}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    You've reached {streakData.days} days!
                  </p>
                  <button
                    onClick={() => setShowMilestoneModal(false)}
                    className="mt-4 rounded-lg bg-orange-500 px-6 py-2 font-bold text-white"
                  >
                    Awesome!
                  </button>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-orange-500 via-red-400 to-orange-500 px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-bold text-white">
                  Streak
                </h3>
                {streakData.freezeCount > 0 && (
                  <div className="rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
                    <span className="text-xs font-bold text-white">
                      🛡️ {streakData.freezeCount} freeze
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5">
              {/* Big Flame + Number Display */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <Flame className="h-16 w-16 animate-flame text-orange-500 shrink-0" />
                <div>
                  <p className="font-heading text-6xl font-bold text-orange-600 leading-tight">
                    {streakData.days}
                  </p>
                  <p className="font-heading text-xl font-bold text-orange-400">
                    Day Streak!
                  </p>
                </div>
              </div>

              {/* Week calendar with circles */}
              <div className="mb-5 flex gap-2">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={`relative flex h-9 w-9 items-center justify-center rounded-full font-heading text-sm font-bold transition-all ${
                        i === 6
                          ? "animate-pulse-ring border-2 border-orange-500 bg-orange-50 text-orange-600"
                          : streakData.weekDays[i]
                          ? "bg-orange-500 text-white shadow-md"
                          : "border-2 border-orange-200 bg-transparent text-orange-200"
                      }`}
                    >
                      {streakData.weekDays[i] ? "✓" : ""}
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{day}</span>
                  </div>
                ))}
              </div>

              {/* Milestone progress */}
              {getMilestoneText(streakData.days) && (
                <div className="mb-4 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 p-3 border-2 border-orange-200">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {getMilestoneText(streakData.days)?.emoji}
                    </span>
                    <div>
                      <p className="font-heading text-sm font-bold text-orange-600">
                        {getMilestoneText(streakData.days)?.text}
                      </p>
                      <p className="text-xs text-orange-500">
                        Milestone reached!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Competition section */}
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-3 border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-blue-600">Your Streak</p>
                    <p className="font-heading text-lg font-bold text-blue-900">
                      {streakData.days} days
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-blue-600">Class Average</p>
                    <p className="font-heading text-lg font-bold text-blue-900">
                      {classAverage} days
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs font-bold text-blue-600">
                  {userStreakComparison === "higher"
                    ? `🚀 You're ${streakData.days - classAverage} days ahead!`
                    : `Keep pushing! ${classAverage - streakData.days} days to match the class average`}
                </p>
              </div>

              {/* Streak protection info */}
              {streakData.freezeCount > 0 && (
                <div className="mt-4 rounded-lg bg-green-50 p-2 border border-green-200">
                  <p className="text-xs font-bold text-green-700">
                    Streak Freeze active - You're protected!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stars earned */}
          <div className="overflow-hidden rounded-3xl border-2 border-yellow-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">
                {"Earn Stars! \u2B50"}
              </h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Star className="h-10 w-10 fill-yellow-400 text-yellow-400" />
              <span className="font-heading text-5xl font-bold text-yellow-600">42</span>
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
                {"Recent Adventures \uD83D\uDCDC"}
              </h3>
              <button className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-white/20">
                View All
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-3 p-5">
            {recentActivity.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={idx}
                  className={`animate-float flex items-center gap-4 rounded-2xl border-2 bg-gradient-to-r ${item.gradientBg} p-4 transition-all duration-200 hover:shadow-md ${
                    item.type === "game" ? "border-emerald-200" : item.type === "puzzle" ? "border-cyan-200" : "border-purple-200"
                  }`}
                  style={{ animationDelay: `${idx * 0.5}s` }}
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.badge}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-heading text-base font-bold text-card-foreground">
                      {item.description}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {item.time}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${item.badge}`}>
                      {item.result}
                    </span>
                    <span className="font-heading text-sm font-bold text-emerald-600">
                      {item.xp}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Star Shop Preview */}
      <StarShopPreview />

      {/* Getting Started Checklist */}
      <section>
        <OnboardingChecklist />
      </section>

      {/* Trophies / Achievements */}
      <section>
        <div className="overflow-hidden rounded-3xl border-2 border-yellow-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-white">
                {"Trophies \uD83C\uDFC6"}
              </h3>
              <button className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-white/20">
                View All
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto p-5 scrollbar-hide">
            {[
              { title: "First Win!", icon: Trophy, bg: "bg-gradient-to-br from-yellow-100 to-amber-100", color: "text-yellow-600", earned: true, rarity: "Common", rarityColor: "bg-slate-100 text-slate-600" },
              { title: "Puzzle Pro!", icon: Target, bg: "bg-gradient-to-br from-cyan-100 to-blue-100", color: "text-cyan-600", earned: true, rarity: "Rare", rarityColor: "bg-blue-100 text-blue-600" },
              { title: "7-Day Streak!", icon: Flame, bg: "bg-gradient-to-br from-orange-100 to-red-100", color: "text-orange-600", earned: true, rarity: "Epic", rarityColor: "bg-purple-100 text-purple-600" },
              { title: "100 Games", icon: Swords, bg: "bg-gradient-to-br from-pink-100 to-rose-100", color: "text-pink-600", earned: false, rarity: "Epic", rarityColor: "bg-purple-100 text-purple-600" },
              { title: "Star Scholar", icon: Star, bg: "bg-gradient-to-br from-purple-100 to-indigo-100", color: "text-purple-600", earned: false, rarity: "Legendary", rarityColor: "bg-amber-100 text-amber-700" },
              { title: "Grandmaster", icon: GraduationCap, bg: "bg-gradient-to-br from-emerald-100 to-green-100", color: "text-emerald-600", earned: false, rarity: "Legendary", rarityColor: "bg-amber-100 text-amber-700" },
            ].map((trophy) => {
              const Icon = trophy.icon
              return (
                <div
                  key={trophy.title}
                  className={`flex shrink-0 flex-col items-center gap-2 rounded-3xl border-2 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                    trophy.earned
                      ? `${trophy.bg} border-yellow-300 animate-earned-glow`
                      : "border-border bg-muted/30 opacity-50 grayscale"
                  }`}
                  style={{ minWidth: "120px" }}
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${trophy.earned ? trophy.bg : "bg-muted"}`}>
                    <Icon className={`h-7 w-7 ${trophy.earned ? trophy.color : "text-muted-foreground/40"}`} />
                  </div>
                  <p className="text-center font-heading text-sm font-bold text-card-foreground">
                    {trophy.title}
                  </p>
                  {/* Rarity badge */}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${trophy.rarityColor}`}>
                    {trophy.rarity}
                  </span>
                  {trophy.earned && (
                    <span className="animate-unlock rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-700">
                      {"Earned! \u2B50"}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Activity Feed */}
      <ActivityFeed />
    </div>
  )
}
