"use client"

import { Heart, MessageCircle, Share2 } from "lucide-react"

const activities = [
  {
    id: "1",
    type: "achievement",
    user: "Sarah",
    action: "unlocked the Checkmate Master badge",
    time: "2 hours ago",
    icon: "🏆",
  },
  {
    id: "2",
    type: "streak",
    user: "Michael",
    action: "reached a 10-day streak",
    time: "4 hours ago",
    icon: "🔥",
  },
  {
    id: "3",
    type: "level",
    user: "Emma",
    action: "reached Level 6",
    time: "1 day ago",
    icon: "⭐",
  },
  {
    id: "4",
    type: "game",
    user: "Alex",
    action: "won against Sarah in a challenge game",
    time: "2 days ago",
    icon: "🎮",
  },
]

export function SocialActivityFeed() {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl font-bold">Friend Activity</h2>

      <div className="space-y-3">
        {activities.map((activity, idx) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 rounded-xl border-2 border-border bg-card p-4 hover:bg-accent/50 transition-all"
            style={{ animation: `share-slide 0.5s ease-out ${idx * 0.1}s both` }}
          >
            {/* Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 text-lg">
              {activity.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-bold text-card-foreground">{activity.user}</span>{" "}
                <span className="text-muted-foreground">{activity.action}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              <button className="p-2 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors">
                <Heart className="h-4 w-4" />
              </button>
              <button className="p-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors">
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
