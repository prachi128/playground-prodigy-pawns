"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Menu,
  Bell,
  Flame,
  Star,
  Zap,
  Trophy,
  BookOpen,
  Swords,
  X,
  Info,
  CheckCheck,
  Settings,
} from "lucide-react"
import { useAuthStore } from "@/lib/store"
import { useRouter } from "next/navigation"

type NotificationCategory = "coach" | "achievement" | "system"

interface Notification {
  id: number
  category: NotificationCategory
  icon: React.ReactNode
  title: string
  message: string
  time: string
  dateGroup: "today" | "yesterday" | "this_week"
  read: boolean
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, category: "achievement", icon: <Trophy className="h-5 w-5 text-amber-500" />, title: "Puzzle Pro Unlocked!", message: "You solved 100 puzzles -- amazing work!", time: "2 min ago", dateGroup: "today", read: false },
  { id: 2, category: "coach", icon: <Swords className="h-5 w-5 text-emerald-500" />, title: "Coach Alex says...", message: "Great job on Knight forks! Watch the Rook Endgames video next.", time: "15 min ago", dateGroup: "today", read: false },
  { id: 3, category: "system", icon: <BookOpen className="h-5 w-5 text-blue-500" />, title: "New Lesson Available", message: "Advanced Tactics: The Isolated Queen Pawn is ready for you.", time: "1 hour ago", dateGroup: "today", read: false },
]

const TABS = [
  { key: "all" as const, label: "All" },
  { key: "coach" as const, label: "Coach" },
  { key: "achievement" as const, label: "Achievements" },
] as const

type TabKey = (typeof TABS)[number]["key"]

const DATE_GROUP_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
}

interface HeaderProps {
  onMenuClick: () => void
  theme: "light" | "dark"
  onThemeToggle: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const [isOpen, setIsOpen] = useState(false)
  const [isWiggling, setIsWiggling] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [swipingId, setSwipingId] = useState<number | null>(null)
  const [swipeX, setSwipeX] = useState(0)
  const touchStartX = useRef(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length
  const filteredNotifications = notifications.filter((n) => activeTab === "all" || n.category === activeTab)
  const grouped = filteredNotifications.reduce(
    (acc, n) => {
      if (!acc[n.dateGroup]) acc[n.dateGroup] = []
      acc[n.dateGroup].push(n)
      return acc
    },
    {} as Record<string, Notification[]>,
  )
  const dateOrder: Array<"today" | "yesterday" | "this_week"> = ["today", "yesterday", "this_week"]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false)
    }
    if (isOpen) document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen])

  const handleBellClick = useCallback(() => {
    setIsWiggling(true)
    setIsOpen((prev) => !prev)
    setTimeout(() => setIsWiggling(false), 600)
  }, [])

  function markAsRead(id: number) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function dismissNotification(id: number) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setSwipingId(null)
    setSwipeX(0)
  }

  function handleTouchStart(id: number, e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    setSwipingId(id)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (swipingId === null) return
    const delta = touchStartX.current - e.touches[0].clientX
    setSwipeX(Math.max(0, Math.min(delta, 120)))
  }

  function handleTouchEnd() {
    if (swipingId === null) return
    if (swipeX > 80) dismissNotification(swipingId)
    else { setSwipingId(null); setSwipeX(0) }
  }

  const displayName = user?.full_name?.split(" ")[0] ?? "Player"
  const totalXP = user?.total_xp ?? 0

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-gradient-to-r from-emerald-600 to-green-500 px-4 shadow-md lg:px-6">
      <button onClick={onMenuClick} className="rounded-xl p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white lg:hidden" aria-label="Open sidebar">
        <Menu className="h-6 w-6" />
      </button>

      <div className="flex items-center gap-2">
        <span className="animate-mascot-bounce text-2xl" role="img" aria-label="wave">👋</span>
        <h2 className="hidden font-heading text-xl font-bold text-white sm:block">
          Hey {displayName}! Let&apos;s play!
        </h2>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 transition-transform hover:scale-105">
          <Zap className="h-4 w-4 text-amber-300" />
          <span className="hidden font-heading text-sm font-bold text-white sm:inline">{totalXP} XP</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 transition-transform hover:scale-105">
          <Flame className="h-5 w-5 animate-flame text-orange-300" />
          <span className="hidden font-heading text-sm font-bold text-white sm:inline">0</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 transition-transform hover:scale-105">
          <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
          <span className="hidden font-heading text-sm font-bold text-white sm:inline">0</span>
        </div>

        <button
          onClick={() => router.push("/settings")}
          className="rounded-xl p-2.5 text-white/80 transition-all hover:scale-110 hover:bg-white/10 hover:text-white"
          aria-label="Settings"
        >
          <Settings className="h-6 w-6" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button onClick={handleBellClick} className="relative rounded-xl p-2.5 text-white/80 transition-all hover:scale-110 hover:bg-white/10 hover:text-white" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`} aria-expanded={isOpen} aria-haspopup="true">
            <Bell className={`h-6 w-6 ${isWiggling ? "animate-bell-wiggle" : ""}`} />
            {unreadCount > 0 && (
              <span className="animate-badge-pulse absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-emerald-600">{unreadCount}</span>
            )}
          </button>

          {isOpen && (
            <div className="animate-dropdown-slide absolute right-0 top-full mt-2 w-[calc(100vw-20px)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:w-[400px]" style={{ zIndex: 50 }}>
              <div className="flex items-center justify-between border-b border-border bg-emerald-50 px-4 py-3">
                <h3 className="font-heading text-lg font-bold text-foreground">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"> <CheckCheck className="h-3.5 w-3.5" /> Mark all read </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close notifications">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex border-b border-border bg-card">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.key
                  const tabCount = tab.key === "all" ? notifications.filter((n) => !n.read).length : notifications.filter((n) => n.category === tab.key && !n.read).length
                  return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`relative flex-1 px-3 py-2.5 text-center text-sm font-medium transition-colors ${isActive ? "font-bold text-blue-600" : "text-muted-foreground hover:text-foreground"}`}>
                      {tab.label}
                      {tabCount > 0 && <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-bold text-red-600">{tabCount}</span>}
                      {isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-blue-600" />}
                    </button>
                  )
                })}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <Bell className="h-7 w-7 text-muted-foreground/40" />
                    </div>
                    <p className="font-heading text-base font-bold text-foreground">You&apos;re all caught up! 🎉</p>
                    <p className="text-sm text-muted-foreground">Check back later for updates</p>
                  </div>
                ) : (
                  dateOrder.map((group) => {
                    const items = grouped[group]
                    if (!items || items.length === 0) return null
                    return (
                      <div key={group}>
                        <div className="sticky top-0 z-10 bg-muted/60 px-4 py-1.5 backdrop-blur-sm">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{DATE_GROUP_LABELS[group]}</p>
                        </div>
                        {items.map((notification) => {
                          const isSwiping = swipingId === notification.id
                          return (
                            <div key={notification.id} className="relative overflow-hidden" onTouchStart={(e) => handleTouchStart(notification.id, e)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                              <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-red-500 text-sm font-bold text-white">Dismiss</div>
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className={`relative flex w-full items-start gap-3 px-4 py-3 text-left transition-all hover:bg-emerald-50/60 ${!notification.read ? "bg-blue-50/50" : "bg-card"}`}
                                style={{ transform: isSwiping ? `translateX(-${swipeX}px)` : "translateX(0)", transition: isSwiping ? "none" : "transform 0.2s ease-out" }}
                              >
                                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${notification.category === "coach" ? "bg-emerald-100" : notification.category === "achievement" ? "bg-amber-100" : "bg-blue-100"}`}>
                                  {notification.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className={`truncate text-sm ${!notification.read ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>{notification.title}</p>
                                    {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                                  </div>
                                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                                  <p className="mt-1 text-[10px] font-medium text-muted-foreground/50">{notification.time}</p>
                                </div>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                )}
              </div>
              <div className="border-t border-border bg-card px-4 py-3 text-center">
                <button className="font-heading text-sm font-bold text-emerald-600 transition-colors hover:text-emerald-700">View All Notifications</button>
              </div>
            </div>
          )}
        </div>

        <div className="h-10 w-10 overflow-hidden rounded-full ring-3 ring-white/30 transition-transform hover:scale-105">
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
