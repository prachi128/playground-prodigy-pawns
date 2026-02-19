"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Gamepad2,
  Puzzle,
  GraduationCap,
  Swords,
  TrendingUp,
  Flame,
  Star,
  X,
  Map,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react"
import { useAuthStore } from "@/lib/store"

const navItems = [
  { label: "Home", icon: Gamepad2, href: "/dashboard", color: "text-yellow-400", badge: null, progress: null },
  { label: "Adventure", icon: Map, href: "/adventure", color: "text-amber-400", badge: null, progress: null },
  { label: "Play", icon: Swords, href: "/play", color: "text-orange-400", badge: null, progress: null },
  { label: "Puzzles", icon: Puzzle, href: "/puzzles", color: "text-cyan-400", badge: "3 new", progress: 64 },
  { label: "Learn", icon: GraduationCap, href: "/learn", color: "text-pink-400", badge: "1 new", progress: 45 },
  { label: "Progress", icon: TrendingUp, href: "/progress", color: "text-emerald-300", badge: null, progress: 87 },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function Sidebar({ isOpen, onClose, collapsed: externalCollapsed, onCollapsedChange }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  // Internal collapsed state (mirrors v1 sidebar)
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed")
      if (saved !== null) {
        return saved === "true"
      }
      // Default: collapsed on tablet, expanded on desktop
      return window.innerWidth >= 768 && window.innerWidth < 1024
    }
    return false
  })

  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed

  const toggleCollapse = useCallback(() => {
    const newState = !collapsed
    if (onCollapsedChange) {
      onCollapsedChange(newState)
    } else {
      setInternalCollapsed(newState)
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", String(newState))
    }
  }, [collapsed, onCollapsedChange])


  const handleLogout = useCallback(async () => {
    await logout()
    onClose()
    router.push("/login")
  }, [logout, onClose, router])

  // Keyboard shortcuts: Escape closes sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [onClose])

  const displayName = user?.full_name?.split(" ")[0] ?? "Player"
  const rating = user?.rating ?? 0

  // Use simple level/xp display but keep v1 layout
  const level = user?.level ?? 4
  const currentXP = user?.total_xp ?? 640
  const totalXPNeeded = 1000
  const xpPercent = Math.min(100, Math.round((currentXP / totalXPNeeded) * 100))

  const sidebarWidth = collapsed ? "w-16" : "w-60"

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex ${sidebarWidth} flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Collapse toggle button (matches v1 position) */}
        <button
          onClick={toggleCollapse}
          className="absolute right-2 top-3 z-10 rounded-full bg-white/10 p-1.5 text-sidebar-foreground/60 transition-all duration-150 hover:bg-white/20 hover:text-sidebar-foreground lg:block"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>

        {/* Close button (mobile) */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo with mascot knight (v1 layout) */}
        <div className={`flex flex-col items-center gap-1 px-4 pt-5 pb-2 ${collapsed ? "px-2" : ""}`}>
          <div className="text-[40px] leading-none" role="img" aria-label="Chess knight mascot">
            {"♞"}
          </div>
          {!collapsed && (
            <h1 className="font-heading text-2xl font-bold text-sidebar-foreground">
              Prodigy Pawns
            </h1>
          )}
        </div>

        {/* Player Card with XP bar - expanded */}
        {!collapsed && (
          <div className="px-4 py-2">
            <div className="mx-3 overflow-hidden rounded-xl bg-white/5 p-3">
              <div className="flex items-center gap-3">
                {/* Avatar (use v1 image-based layout) */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-accent">
                  <img
                    src="/images/kid-avatar.jpg"
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Name + Rating stacked */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-base font-bold leading-tight text-sidebar-foreground">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-heading text-lg font-bold leading-tight text-yellow-400">
                      {rating}
                    </span>
                  </div>
                </div>

                {/* Streak badge */}
                <div className="flex shrink-0 flex-col items-center rounded-xl bg-orange-500/20 px-2 py-1.5">
                  <Flame className="h-5 w-5 text-orange-400" />
                  <span className="font-heading text-sm font-bold text-orange-400">
                    7
                  </span>
                </div>
              </div>

              {/* XP progress bar at bottom */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-sidebar-foreground/70">
                    <Zap className="h-3 w-3 text-amber-400" />
                    Level {level}
                  </span>
                  <span className="text-amber-400">
                    {currentXP} / {totalXPNeeded} XP
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-900">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500 ease-out"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed avatar only */}
        {collapsed && (
          <div className="flex justify-center px-2 py-2">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-accent">
              <img
                src="/images/kid-avatar.jpg"
                alt={displayName}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Navigation (v1 layout) */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 scrollbar-hide">
          <ul className="flex flex-col gap-2" role="list">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href))

              const menuItem = (
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault()
                    router.push(item.href)
                  }}
                  className={`group relative flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-base transition-all duration-150 ${
                    collapsed ? "justify-center px-3" : ""
                  } ${
                    isActive
                      ? "scale-[1.02] bg-white/15 font-semibold text-white shadow-md"
                      : "text-sidebar-foreground/70 hover:translate-x-1 hover:bg-white/8 hover:text-sidebar-foreground/90"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* Active left border */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r bg-[#FCD34D]" />
                  )}

                  <Icon
                    className={`h-7 w-7 shrink-0 transition-all duration-150 ${
                      isActive ? "text-yellow-400" : item.color
                    } ${!isActive ? "group-hover:opacity-90" : ""}`}
                  />

                  {!collapsed && (
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate leading-tight">{item.label}</div>
                      {item.badge && (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                            {item.badge}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress indicator */}
                  {!collapsed && item.progress !== null && (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="h-1 w-10 overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-white/60">
                        {item.progress}%
                      </span>
                    </div>
                  )}
                </a>
              )

              return <li key={item.label}>{menuItem}</li>
            })}
          </ul>
        </nav>

        {/* Footer with Log Out (and implicit settings in nav) */}
        <div className={`border-t border-white/10 bg-emerald-900/30 p-3 ${collapsed ? "px-2" : ""}`}>
          {collapsed ? (
            <button
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-red-400 transition-all duration-150 hover:bg-red-500/20 hover:text-red-300"
              aria-label="Log Out"
              title="Log Out"
            >
              <LogOut className="h-5 w-5 shrink-0" />
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg px-4 py-2 text-sm font-bold text-red-400 transition-all duration-150 hover:bg-red-500/20 hover:text-red-300"
              aria-label="Log Out"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
