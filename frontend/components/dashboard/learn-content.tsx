"use client"

import { useState } from "react"
import {
  BookOpen,
  GraduationCap,
  Video,
  FileText,
  CheckCircle,
  Lock,
  Star,
  Clock,
  Zap,
  Trophy,
} from "lucide-react"
import { useAuthStore } from "@/lib/store"

interface Lesson {
  id: number
  title: string
  description: string
  type: "video" | "reading" | "interactive"
  duration: string
  xpReward: number
  status: "completed" | "available" | "locked"
  emoji: string
  category: string
}

const lessons: Lesson[] = [
  {
    id: 1,
    title: "Meet the Pawn",
    description: "Learn the basics of pawn movement and strategy",
    type: "video",
    duration: "5 min",
    xpReward: 25,
    status: "completed",
    emoji: "♟️",
    category: "Basics",
  },
  {
    id: 2,
    title: "The Mighty Rook",
    description: "Master the rook's powerful horizontal and vertical moves",
    type: "interactive",
    duration: "8 min",
    xpReward: 30,
    status: "available",
    emoji: "♜",
    category: "Basics",
  },
  {
    id: 3,
    title: "Knight's Unique Moves",
    description: "Understand the knight's L-shaped movement pattern",
    type: "video",
    duration: "6 min",
    xpReward: 25,
    status: "available",
    emoji: "♞",
    category: "Basics",
  },
  {
    id: 4,
    title: "Bishop's Diagonal Power",
    description: "Learn how bishops control diagonals",
    type: "reading",
    duration: "7 min",
    xpReward: 20,
    status: "locked",
    emoji: "♝",
    category: "Basics",
  },
  {
    id: 5,
    title: "The Queen's Dominance",
    description: "Master the most powerful piece on the board",
    type: "video",
    duration: "10 min",
    xpReward: 40,
    status: "locked",
    emoji: "♛",
    category: "Advanced",
  },
  {
    id: 6,
    title: "King Safety",
    description: "Learn how to protect your king",
    type: "interactive",
    duration: "12 min",
    xpReward: 35,
    status: "locked",
    emoji: "♚",
    category: "Advanced",
  },
]

const categories = ["All", "Basics", "Advanced", "Strategy", "Tactics"]

export function LearnContent() {
  const { user } = useAuthStore()
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedType, setSelectedType] = useState<"all" | "video" | "reading" | "interactive">("all")

  const filteredLessons = lessons.filter((lesson) => {
    const categoryMatch = selectedCategory === "All" || lesson.category === selectedCategory
    const typeMatch = selectedType === "all" || lesson.type === selectedType
    return categoryMatch && typeMatch
  })

  const completedCount = lessons.filter((l) => l.status === "completed").length
  const totalCount = lessons.length
  const progressPercent = Math.round((completedCount / totalCount) * 100)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return Video
      case "reading":
        return FileText
      case "interactive":
        return Zap
      default:
        return BookOpen
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "from-red-400 to-pink-500"
      case "reading":
        return "from-blue-400 to-cyan-500"
      case "interactive":
        return "from-purple-400 to-indigo-500"
      default:
        return "from-gray-400 to-gray-500"
    }
  }

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
                {"Ready to learn? 📚"}
              </p>
              <p className="mt-0.5 font-heading text-sm font-semibold text-muted-foreground">
                {"Complete lessons to earn XP and unlock new content! 🎓"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Progress Card */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-pink-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-pink-400 to-rose-500 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-2xl font-bold text-white">
                  {"Learning Progress 🎯"}
                </h3>
                <p className="font-heading text-xs font-semibold text-white/80">
                  {completedCount} of {totalCount} lessons completed
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="rounded-full bg-white/25 px-4 py-2">
                  <span className="font-heading text-2xl font-bold text-white">
                    {progressPercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="h-3 overflow-hidden rounded-full bg-pink-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Category Filter */}
          <div className="flex flex-1 gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-xl border-2 px-4 py-2 font-heading text-sm font-bold transition-all whitespace-nowrap ${
                  selectedCategory === category
                    ? "border-pink-400 bg-gradient-to-r from-pink-400 to-rose-500 text-white shadow-md"
                    : "border-border bg-card text-card-foreground hover:border-pink-300"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            {[
              { label: "All", value: "all" as const },
              { label: "Video", value: "video" as const },
              { label: "Reading", value: "reading" as const },
              { label: "Interactive", value: "interactive" as const },
            ].map((type) => {
              const TypeIcon = type.value === "all" ? BookOpen : getTypeIcon(type.value)
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 font-heading text-xs font-bold transition-all ${
                    selectedType === type.value
                      ? "border-pink-400 bg-gradient-to-r from-pink-400 to-rose-500 text-white shadow-md"
                      : "border-border bg-card text-card-foreground hover:border-pink-300"
                  }`}
                >
                  <TypeIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Lessons Grid */}
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLessons.map((lesson, idx) => {
            const TypeIcon = getTypeIcon(lesson.type)
            const isCompleted = lesson.status === "completed"
            const isLocked = lesson.status === "locked"

            return (
              <div
                key={lesson.id}
                className={`group relative overflow-hidden rounded-3xl border-2 transition-all duration-200 ${
                  isCompleted
                    ? "border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md"
                    : isLocked
                    ? "border-gray-200 bg-muted/30 opacity-60"
                    : "border-pink-200 bg-card shadow-md hover:shadow-xl hover:-translate-y-1"
                }`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Status Badge */}
                <div className="absolute right-3 top-3 z-10">
                  {isCompleted ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-lg">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                  ) : isLocked ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-400 text-white shadow-lg">
                      <Lock className="h-6 w-6" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg">
                      <Star className="h-6 w-6 fill-current" />
                    </div>
                  )}
                </div>

                {/* Header */}
                <div className={`bg-gradient-to-r ${getTypeColor(lesson.type)} px-5 py-4`}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-2xl">
                      {lesson.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading text-lg font-bold text-white truncate">
                        {lesson.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <TypeIcon className="h-4 w-4 text-white/90" />
                        <span className="font-heading text-xs font-semibold text-white/80">{lesson.category}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <p className="mb-4 font-heading text-sm text-muted-foreground line-clamp-2">
                    {lesson.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 font-heading text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-semibold">{lesson.duration}</span>
                      </div>
                      <div className="flex items-center gap-1 font-heading text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">+{lesson.xpReward} XP</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    disabled={isLocked}
                    className={`mt-4 w-full rounded-xl px-4 py-2.5 font-heading text-sm font-bold text-white transition-all ${
                      isCompleted
                        ? "bg-gradient-to-r from-green-500 to-emerald-600"
                        : isLocked
                        ? "bg-gray-400 cursor-not-allowed"
                        : `bg-gradient-to-r ${getTypeColor(lesson.type)} hover:scale-105 hover:shadow-lg`
                    }`}
                  >
                    {isCompleted ? "Completed ✓" : isLocked ? "Locked" : "Start Lesson"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="overflow-hidden rounded-3xl border-2 border-pink-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-pink-400 to-rose-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">
                Lessons Completed
              </h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <CheckCircle className="h-8 w-8 text-pink-500" />
              <span className="font-heading text-4xl font-bold text-pink-600">
                {completedCount}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border-2 border-yellow-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">
                XP Earned
              </h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
              <span className="font-heading text-4xl font-bold text-yellow-600">
                {lessons.filter((l) => l.status === "completed").reduce((sum, l) => sum + l.xpReward, 0)}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border-2 border-purple-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-purple-400 to-indigo-500 px-5 py-3">
              <h3 className="font-heading text-lg font-bold text-white">
                Streak
              </h3>
            </div>
            <div className="flex items-center justify-center gap-3 p-5">
              <Trophy className="h-8 w-8 text-purple-500" />
              <span className="font-heading text-4xl font-bold text-purple-600">
                {user?.current_streak ?? 0}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
