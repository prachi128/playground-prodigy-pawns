"use client"

import { useAuthStore } from "@/lib/store"
import { Trophy, Star, Zap, Target, Calendar, Mail, User, Award, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"

export function ProfileContent() {
  const { user } = useAuthStore()
  const router = useRouter()

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl pt-6">
        <div className="text-center py-12">
          <p className="font-heading text-lg text-muted-foreground">No user data available</p>
        </div>
      </div>
    )
  }

  const displayName = user.full_name?.split(" ")[0] ?? "Player"
  const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : "Unknown"

  return (
    <div className="mx-auto max-w-4xl pt-6">
      {/* Mascot Speech Bubble */}
      <section className="mb-5">
        <div className="flex items-start gap-3">
          <div className="animate-mascot-bounce shrink-0 text-5xl">{"👤"}</div>
          <div className="relative flex-1">
            <div className="absolute -left-2 top-4 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-white" />
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="font-heading text-lg font-bold text-card-foreground">
                {"Welcome to your profile! 🎉"}
              </p>
              <p className="mt-0.5 font-heading text-sm font-semibold text-muted-foreground">
                {"Check out your stats and achievements here."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Header Card */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-purple-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="h-32 w-32 overflow-hidden rounded-full ring-4 ring-white/50 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-4xl font-bold text-white shadow-xl">
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.full_name || "Avatar"} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-purple-800 text-lg shadow-lg ring-4 ring-white">
                  {user.level}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="font-heading text-3xl font-bold text-white mb-2">
                  {user.full_name || "Player"}
                </h1>
                <p className="font-heading text-lg text-white/90 mb-1">
                  @{user.username}
                </p>
                {user.email && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-white/80">
                    <Mail className="h-4 w-4" />
                    <span className="font-heading text-sm">{user.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-white/80">
                  <Calendar className="h-4 w-4" />
                  <span className="font-heading text-sm">Joined {joinDate}</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-col gap-3 w-full sm:w-auto">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Zap className="h-5 w-5 text-yellow-300" />
                    <span className="font-heading text-2xl font-bold text-white">
                      {user.total_xp.toLocaleString()}
                    </span>
                  </div>
                  <p className="font-heading text-xs text-white/80">Total XP</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <TrendingUp className="h-5 w-5 text-green-300" />
                    <span className="font-heading text-2xl font-bold text-white">
                      {user.rating}
                    </span>
                  </div>
                  <p className="font-heading text-xs text-white/80">Rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Level Card */}
          <div className="overflow-hidden rounded-2xl border-2 border-yellow-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-white" />
                <h3 className="font-heading text-lg font-bold text-white">Level</h3>
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="text-4xl font-bold text-card-foreground mb-1">
                {user.level}
              </div>
              <p className="font-heading text-sm text-muted-foreground">Current Level</p>
            </div>
          </div>

          {/* XP Card */}
          <div className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-blue-400 to-cyan-500 px-4 py-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-white" />
                <h3 className="font-heading text-lg font-bold text-white">Experience</h3>
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="text-4xl font-bold text-card-foreground mb-1">
                {user.total_xp.toLocaleString()}
              </div>
              <p className="font-heading text-sm text-muted-foreground">Total XP</p>
            </div>
          </div>

          {/* Rating Card */}
          <div className="overflow-hidden rounded-2xl border-2 border-green-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-white" />
                <h3 className="font-heading text-lg font-bold text-white">Rating</h3>
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="text-4xl font-bold text-card-foreground mb-1">
                {user.rating}
              </div>
              <p className="font-heading text-sm text-muted-foreground">Chess Rating</p>
            </div>
          </div>

          {/* Status Card */}
          <div className="overflow-hidden rounded-2xl border-2 border-purple-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-purple-400 to-indigo-500 px-4 py-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-white" />
                <h3 className="font-heading text-lg font-bold text-white">Status</h3>
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-card-foreground mb-1">
                {user.is_active ? "🟢 Active" : "⚫ Inactive"}
              </div>
              <p className="font-heading text-sm text-muted-foreground">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-indigo-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-indigo-400 to-blue-500 px-5 py-4">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-white" />
              <h3 className="font-heading text-2xl font-bold text-white">
                {"Account Information 📋"}
              </h3>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border-2 border-border bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <User className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold text-muted-foreground">Username</p>
                    <p className="font-heading text-base font-semibold text-card-foreground">@{user.username}</p>
                  </div>
                </div>
              </div>

              {user.age && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border-2 border-border bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-heading text-sm font-bold text-muted-foreground">Age</p>
                      <p className="font-heading text-base font-semibold text-card-foreground">{user.age} years old</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border-2 border-border bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold text-muted-foreground">Member Since</p>
                    <p className="font-heading text-base font-semibold text-card-foreground">{joinDate}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border-2 border-border bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <Trophy className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold text-muted-foreground">Account Type</p>
                    <p className="font-heading text-base font-semibold text-card-foreground">
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push("/settings")}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-blue-300 bg-blue-50 px-6 py-4 font-heading text-base font-bold text-blue-700 transition-all hover:bg-blue-100 hover:shadow-sm"
          >
            <User className="h-5 w-5" />
            Edit Settings
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-green-300 bg-green-50 px-6 py-4 font-heading text-base font-bold text-green-700 transition-all hover:bg-green-100 hover:shadow-sm"
          >
            <Trophy className="h-5 w-5" />
            Go to Dashboard
          </button>
        </div>
      </section>
    </div>
  )
}
