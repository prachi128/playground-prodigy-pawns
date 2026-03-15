"use client"

import { Users, TrendingUp, Trophy, Zap } from "lucide-react"

export function ClassDashboard() {
  const classStats = {
    memberCount: 28,
    averageRating: 1720,
    classChallenge: {
      goal: 500,
      current: 387,
      name: "Solve 500 puzzles",
      reward: 2000,
    },
    topPerformers: [
      { name: "Emma", rating: 1950, avatar: "👱" },
      { name: "Sarah", rating: 1850, avatar: "👧" },
      { name: "Michael", rating: 1720, avatar: "👦" },
    ],
  }

  const progressPercent = Math.round((classStats.classChallenge.current / classStats.classChallenge.goal) * 100)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold mb-4">Class Overview</h2>
        <p className="text-sm text-muted-foreground">{classStats.memberCount} students in your class</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: Users, label: "Class Members", value: classStats.memberCount, color: "from-blue-500 to-cyan-500" },
          { icon: TrendingUp, label: "Average Rating", value: classStats.averageRating, color: "from-orange-500 to-red-500" },
          { icon: Trophy, label: "Top Streak", value: "12 days", color: "from-amber-500 to-yellow-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border-2 border-border bg-gradient-to-br p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${stat.color} text-white`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-muted-foreground">{stat.label}</p>
            </div>
            <p className="font-heading text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Class Challenge */}
      <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="h-6 w-6 text-orange-600" />
          <div>
            <h3 className="font-heading font-bold text-orange-900">{classStats.classChallenge.name}</h3>
            <p className="text-sm text-orange-700">Team Challenge</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-bold">{classStats.classChallenge.current} / {classStats.classChallenge.goal}</span>
            <span className="text-sm font-bold text-orange-600">{progressPercent}%</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-orange-200">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500 animate-quest-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-orange-700">Reward when complete: +{classStats.classChallenge.reward} XP for each student</p>
          <button className="px-4 py-2 rounded-lg bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors">
            View Details
          </button>
        </div>
      </div>

      {/* Top Performers */}
      <div>
        <h3 className="font-heading text-xl font-bold mb-4">Top Performers This Week</h3>
        <div className="space-y-3">
          {classStats.topPerformers.map((student, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 rounded-xl border-2 border-border bg-card p-4"
              style={{ animation: `rank-update 0.6s ease-out ${idx * 0.1}s both` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 text-lg">
                {idx === 0 && "🥇"}
                {idx === 1 && "🥈"}
                {idx === 2 && "🥉"}
              </div>
              <div className="flex-1">
                <p className="font-bold">{student.name}</p>
                <p className="text-xs text-muted-foreground">Rating: {student.rating}</p>
              </div>
              <div className="text-2xl">{student.avatar}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
