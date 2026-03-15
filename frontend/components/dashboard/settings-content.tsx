"use client"

import { useState } from "react"
import {
  User,
  Bell,
  Shield,
  Palette,
  Trash2,
  LogOut,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  Edit2,
  Check,
  X,
} from "lucide-react"
import { useAuthStore } from "@/lib/store"
import { useRouter } from "next/navigation"

export function SettingsContent() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    gameInvites: true,
    achievements: true,
    weeklyReport: false,
  })

  const [privacy, setPrivacy] = useState({
    profileVisibility: "public",
    showEmail: false,
    showRating: true,
    allowFriendRequests: true,
  })

  const [preferences, setPreferences] = useState({
    theme: "light",
    language: "en",
    soundEnabled: true,
    animationsEnabled: true,
  })

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    fullName: user?.full_name ?? "",
    email: user?.email ?? "",
  })

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const handleSaveProfile = () => {
    // TODO: Implement API call to update profile
    setIsEditingProfile(false)
  }

  return (
    <div className="mx-auto max-w-4xl pt-6">
      {/* Mascot Speech Bubble */}
      <section className="mb-5">
        <div className="flex items-start gap-3">
          <div className="animate-mascot-bounce shrink-0 text-5xl">{"♞"}</div>
          <div className="relative flex-1">
            <div className="absolute -left-2 top-4 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-white" />
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="font-heading text-lg font-bold text-card-foreground">
                {"Customize your experience! ⚙️"}
              </p>
              <p className="mt-0.5 font-heading text-sm font-semibold text-muted-foreground">
                {"Manage your account settings and preferences here."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Settings */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-blue-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-blue-400 to-cyan-500 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-6 w-6 text-white" />
                <h3 className="font-heading text-2xl font-bold text-white">
                  {"Profile Settings 👤"}
                </h3>
              </div>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 font-heading text-sm font-semibold text-white transition-all hover:bg-white/30"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
              )}
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-heading text-sm font-bold text-card-foreground">
                  Full Name
                </label>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    className="w-full rounded-xl border-2 border-border bg-white px-4 py-2.5 font-heading text-base font-semibold text-card-foreground focus:border-blue-400 focus:outline-none"
                  />
                ) : (
                  <div className="rounded-xl border-2 border-border bg-muted/50 px-4 py-2.5 font-heading text-base font-semibold text-card-foreground">
                    {user?.full_name ?? "Not set"}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block font-heading text-sm font-bold text-card-foreground">
                  Email
                </label>
                {isEditingProfile ? (
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full rounded-xl border-2 border-border bg-white px-4 py-2.5 font-heading text-base font-semibold text-card-foreground focus:border-blue-400 focus:outline-none"
                  />
                ) : (
                  <div className="rounded-xl border-2 border-border bg-muted/50 px-4 py-2.5 font-heading text-base font-semibold text-card-foreground">
                    {user?.email ?? "Not set"}
                  </div>
                )}
              </div>

              {isEditingProfile && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-400 to-cyan-500 px-4 py-2 font-heading text-sm font-bold text-white transition-all hover:shadow-md"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingProfile(false)
                      setProfileData({
                        fullName: user?.full_name ?? "",
                        email: user?.email ?? "",
                      })
                    }}
                    className="flex items-center gap-2 rounded-xl border-2 border-border bg-white px-4 py-2 font-heading text-sm font-bold text-card-foreground transition-all hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-orange-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-orange-400 to-pink-500 px-5 py-4">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-white" />
              <h3 className="font-heading text-2xl font-bold text-white">
                {"Notifications 🔔"}
              </h3>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {[
                { key: "email", label: "Email Notifications", icon: Mail },
                { key: "push", label: "Push Notifications", icon: Bell },
                { key: "gameInvites", label: "Game Invites", icon: User },
                { key: "achievements", label: "Achievement Alerts", icon: Check },
                { key: "weeklyReport", label: "Weekly Progress Report", icon: Mail },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl border-2 border-border bg-white p-4 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                        <Icon className="h-5 w-5 text-orange-600" />
                      </div>
                      <span className="font-heading text-base font-bold text-card-foreground">
                        {item.label}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setNotifications({
                          ...notifications,
                          [item.key]: !notifications[item.key as keyof typeof notifications],
                        })
                      }
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        notifications[item.key as keyof typeof notifications]
                          ? "bg-gradient-to-r from-orange-400 to-pink-500"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          notifications[item.key as keyof typeof notifications]
                            ? "translate-x-5"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Settings */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-purple-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-purple-400 to-indigo-500 px-5 py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-white" />
              <h3 className="font-heading text-2xl font-bold text-white">
                {"Privacy & Security 🔒"}
              </h3>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-heading text-sm font-bold text-card-foreground">
                  Profile Visibility
                </label>
                <select
                  value={privacy.profileVisibility}
                  onChange={(e) =>
                    setPrivacy({ ...privacy, profileVisibility: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-border bg-white px-4 py-2.5 font-heading text-base font-semibold text-card-foreground focus:border-purple-400 focus:outline-none"
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends Only</option>
                  <option value="private">Private</option>
                </select>
              </div>

              {[
                { key: "showEmail", label: "Show Email Address", icon: Mail },
                { key: "showRating", label: "Show Rating", icon: Eye },
                { key: "allowFriendRequests", label: "Allow Friend Requests", icon: User },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl border-2 border-border bg-white p-4 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                        <Icon className="h-5 w-5 text-purple-600" />
                      </div>
                      <span className="font-heading text-base font-bold text-card-foreground">
                        {item.label}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setPrivacy({
                          ...privacy,
                          [item.key]: !privacy[item.key as keyof typeof privacy],
                        })
                      }
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        privacy[item.key as keyof typeof privacy]
                          ? "bg-gradient-to-r from-purple-400 to-indigo-500"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          privacy[item.key as keyof typeof privacy]
                            ? "translate-x-5"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border-2 border-emerald-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-emerald-400 to-green-500 px-5 py-4">
            <div className="flex items-center gap-3">
              <Palette className="h-6 w-6 text-white" />
              <h3 className="font-heading text-2xl font-bold text-white">
                {"Preferences 🎨"}
              </h3>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-heading text-sm font-bold text-card-foreground">
                  Theme
                </label>
                <select
                  value={preferences.theme}
                  onChange={(e) =>
                    setPreferences({ ...preferences, theme: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-border bg-white px-4 py-2.5 font-heading text-base font-semibold text-card-foreground focus:border-emerald-400 focus:outline-none"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-heading text-sm font-bold text-card-foreground">
                  Language
                </label>
                <select
                  value={preferences.language}
                  onChange={(e) =>
                    setPreferences({ ...preferences, language: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-border bg-white px-4 py-2.5 font-heading text-base font-semibold text-card-foreground focus:border-emerald-400 focus:outline-none"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>

              {[
                { key: "soundEnabled", label: "Sound Effects", icon: Bell },
                { key: "animationsEnabled", label: "Animations", icon: Palette },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl border-2 border-border bg-white p-4 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                        <Icon className="h-5 w-5 text-emerald-600" />
                      </div>
                      <span className="font-heading text-base font-bold text-card-foreground">
                        {item.label}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setPreferences({
                          ...preferences,
                          [item.key]: !preferences[item.key as keyof typeof preferences],
                        })
                      }
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        preferences[item.key as keyof typeof preferences]
                          ? "bg-gradient-to-r from-emerald-400 to-green-500"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          preferences[item.key as keyof typeof preferences]
                            ? "translate-x-5"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <div className="overflow-hidden rounded-3xl border-2 border-red-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-red-400 to-rose-500 px-5 py-4">
            <div className="flex items-center gap-3">
              <Trash2 className="h-6 w-6 text-white" />
              <h3 className="font-heading text-2xl font-bold text-white">
                {"Danger Zone ⚠️"}
              </h3>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 font-heading text-base font-bold text-red-700 transition-all hover:bg-red-100 hover:shadow-sm"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
              <button
                className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-red-400 bg-red-100 px-4 py-3 font-heading text-base font-bold text-red-800 transition-all hover:bg-red-200 hover:shadow-sm"
              >
                <Trash2 className="h-5 w-5" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
