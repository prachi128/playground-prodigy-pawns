"use client"

import { useState } from "react"
import { Heart, MessageCircle, Swords, TrendingUp, Flame, Clock } from "lucide-react"
import type { Friend } from "@/lib/social-types"

const mockFriends: Friend[] = [
  { id: "1", name: "Sarah", level: 5, rating: 1850, streak: 12, online: true, avatar: "👧" },
  { id: "2", name: "Michael", level: 4, rating: 1720, streak: 8, online: true, avatar: "👦" },
  { id: "3", name: "Emma", level: 6, rating: 1950, streak: 7, online: false, lastSeen: "2 hours ago", avatar: "👱" },
  { id: "4", name: "Alex", level: 3, rating: 1580, streak: 3, online: false, lastSeen: "1 day ago", avatar: "🧑" },
]

export function FriendsList() {
  const [friends, setFriends] = useState(mockFriends)
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-bold mb-4">Your Chess Friends</h2>
        <p className="text-sm text-muted-foreground mb-6">{friends.filter(f => f.online).length} online now</p>
      </div>

      <div className="grid gap-3">
        {friends.map((friend, idx) => (
          <div
            key={friend.id}
            className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 hover:bg-accent/50 cursor-pointer transition-all hover:shadow-md"
            style={{ animation: `share-slide 0.5s ease-out ${idx * 0.1}s both` }}
          >
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 text-2xl">
                {friend.avatar}
              </div>
              {friend.online && (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full animate-online-pulse" />
              )}
            </div>

            {/* Friend info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-heading font-bold text-card-foreground truncate">{friend.name}</p>
                {friend.online ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                ) : (
                  <span className="text-xs text-muted-foreground">{friend.lastSeen}</span>
                )}
              </div>
              <div className="flex gap-4 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Level {friend.level}
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  {friend.streak} day
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="p-2 rounded-lg bg-orange-500/20 text-orange-600 hover:bg-orange-500/30 transition-colors">
                <Swords className="h-4 w-4" />
              </button>
              <button className="p-2 rounded-lg bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 transition-colors">
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
