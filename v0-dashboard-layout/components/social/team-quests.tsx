"use client"

import { Zap, Users, Calendar } from "lucide-react"
import type { TeamQuest } from "@/lib/social-types"

const teamQuests: TeamQuest[] = [
  {
    id: "1",
    name: "Class Puzzle Rush",
    description: "Solve 500 puzzles together as a class",
    goal: 500,
    current: 387,
    reward: 2000,
    deadline: "2 days left",
    participants: ["Sarah", "Michael", "Emma", "Alex"],
  },
  {
    id: "2",
    name: "Game Tournament",
    description: "Play 100 games together",
    goal: 100,
    current: 62,
    reward: 1500,
    deadline: "5 days left",
    participants: ["Emma", "Sarah", "You", "Michael"],
  },
  {
    id: "3",
    name: "Lesson Masters",
    description: "Complete 30 lessons as a class",
    goal: 30,
    current: 28,
    reward: 1000,
    deadline: "1 day left",
    participants: ["Michael", "Alex", "You"],
  },
]

export function TeamQuests() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-bold mb-4">Team Quests</h2>
        <p className="text-sm text-muted-foreground">Work together with your class to complete challenges</p>
      </div>

      <div className="space-y-4">
        {teamQuests.map((quest, idx) => {
          const progressPercent = Math.round((quest.current / quest.goal) * 100)
          const isUrgent = quest.deadline.includes("1 day")

          return (
            <div
              key={quest.id}
              className={`rounded-2xl border-2 p-4 transition-all ${
                isUrgent
                  ? "border-red-300 bg-gradient-to-br from-red-50 to-orange-50"
                  : "border-border bg-card"
              }`}
              style={{ animation: `quest-fill 1.5s ease-out ${idx * 0.15}s both` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading font-bold text-card-foreground">{quest.name}</h3>
                  <p className="text-sm text-muted-foreground">{quest.description}</p>
                </div>
                {isUrgent && (
                  <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                    Urgent!
                  </span>
                )}
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold">{quest.current} / {quest.goal}</span>
                  <span className="text-sm font-bold text-orange-600">{progressPercent}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500 animate-quest-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-bold">{quest.participants.length} joining</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span className="font-bold">+{quest.reward} XP reward</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold">{quest.deadline}</span>
                </div>
              </div>

              {/* Participants */}
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs font-bold text-muted-foreground">Participants:</p>
                <div className="flex gap-1">
                  {quest.participants.map((p) => (
                    <div key={p} className="px-2 py-1 rounded-full bg-blue-100 text-xs font-bold text-blue-900">
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button className="w-full py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold hover:shadow-lg transition-all hover:scale-105">
                Join Quest
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
