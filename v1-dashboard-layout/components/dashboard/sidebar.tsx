"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Gamepad2,
  Puzzle,
  GraduationCap,
  Swords,
  TrendingUp,
  Settings,
  Flame,
  Star,
  X,
  Map,
  Zap,
  Users,
  Users2,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const navItems = [
  { label: "Home", icon: Gamepad2, href: "/", active: true, color: "text-yellow-400", badge: null, progress: null },
  { label: "Adventure", icon: Map, href: "/adventure", active: false, color: "text-amber-400", badge: null, progress: null },
  { label: "Play", icon: Swords, href: "/play", active: false, color: "text-orange-400", badge: null, progress: null },
  { label: "Puzzles", icon: Puzzle, href: "/puzzles", active: false, color: "text-cyan-400", badge: "3 new", progress: 64 },
  { label: "Learn", icon: GraduationCap, href: "/learn", active: false, color: "text-pink-400", badge: "1 new", progress: 45 },
  { label: "Progress", icon: TrendingUp, href: "/progress", active: false, color: "text-emerald-300", badge: null, progress: 87 },
  { label: "Friends", icon: Users, href: "/friends", active: false, color: "text-blue-400", badge: "2 online", progress: null },
  { label: "Class", icon: Users2, href: "/class", active: false, color: "text-purple-400", badge: null, progress: null },
  { label: "Settings", icon: Settings, href: "/settings", active: false, color: "text-slate-400", badge: null, progress: null },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function Sidebar({ isOpen, onClose, collapsed: externalCollapsed, onCollapsedChange }: SidebarProps) {
  const router = useRouter()
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

  const handleQuickPlay = useCallback(() => {
    router.push("/play")
  }, [router])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const handleQuickPlayKey = (e: KeyboardEvent) => {
      if ((e.key === "q" || e.key === "Q") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only trigger if not typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return
        }
        e.preventDefault()
        handleQuickPlay()
      }
    }
    document.addEventListener("keydown", handleEscape)
    document.addEventListener("keydown", handleQuickPlayKey)
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("keydown", handleQuickPlayKey)
    }
  }, [onClose, handleQuickPlay])

  const sidebarWidth = collapsed ? "w-16" : "w-60"

  return (
    <TooltipProvider>
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
        {/* Collapse toggle button */}
        <button
          onClick={toggleCollapse}
          className="absolute right-2 top-3 z-10 rounded-full p-1.5 bg-white/10 text-sidebar-foreground/60 transition-all duration-150 hover:bg-white/20 hover:text-sidebar-foreground lg:block"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>

        {/* Close button (mobile) */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo with mascot knight */}
        <div className={`flex flex-col items-center gap-1 px-4 pt-5 pb-2 ${collapsed ? "px-2" : ""}`}>
          {/* Bouncing mascot knight */}
          <div className="text-[40px] leading-none" role="img" aria-label="Chess knight mascot">
            {"♞"}
          </div>
          {!collapsed && (
            <h1 className="font-heading text-2xl font-bold text-sidebar-foreground">
              Prodigy Pawns
            </h1>
          )}
        </div>

        {/* Player Card with XP bar */}
        {!collapsed && (
          <div className="px-4 py-2">
            <div className="overflow-hidden rounded-xl bg-white/5 p-3 mx-3">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-accent">
                  <img
                    src="/images/kid-avatar.jpg"
                    alt="Player avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
                {/* Name + Rating stacked */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-base font-bold leading-tight text-sidebar-foreground">
                    Alex
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-heading text-lg font-bold leading-tight text-yellow-400">1842</span>
                  </div>
                </div>
                {/* Streak badge */}
                <div className="flex shrink-0 flex-col items-center rounded-xl bg-orange-500/20 px-2 py-1.5">
                  <Flame className="h-5 w-5 animate-flame text-orange-400" />
                  <span className="font-heading text-sm font-bold text-orange-400">7</span>
                </div>
              </div>

              {/* XP progress bar at bottom */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-sidebar-foreground/70">
                    <Zap className="h-3 w-3 text-amber-400" />
                    Knight 4
                  </span>
                  <span className="text-amber-400">640 / 1000 XP</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-900">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500 ease-out"
                    style={{ width: "64%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed avatar only */}
        {collapsed && (
          <div className="px-2 py-2 flex justify-center">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-accent">
              <img
                src="/images/kid-avatar.jpg"
                alt="Player avatar"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Quick Play button */}
        {!collapsed && (
          <div className="px-3 pb-3">
            <button
              onClick={handleQuickPlay}
              className="group relative w-full h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-3 py-4 font-heading font-bold text-lg text-white shadow-xl transition-all duration-150 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/70 active:scale-95 animate-quick-play-pulse cursor-pointer flex items-center justify-center"
              aria-label="Quick Play (Press Q)"
            >
              <span className="flex items-center gap-2">
                Quick Play
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold bg-white/20 rounded-md backdrop-blur-sm">
                  Q
                </span>
              </span>
            </button>
          </div>
        )}

        {/* Collapsed Quick Play icon */}
        {collapsed && (
          <div className="px-2 pb-3 flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleQuickPlay}
                  className="group relative h-14 w-14 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-xl transition-all duration-150 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/70 active:scale-95 animate-quick-play-pulse cursor-pointer"
                  aria-label="Quick Play (Press Q)"
                >
                  <Swords className="h-7 w-7 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover text-popover-foreground">
                <div className="font-semibold">Quick Play</div>
                <div className="text-xs text-muted-foreground mt-0.5">Press Q</div>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 scrollbar-hide">
          <ul className="flex flex-col gap-2" role="list">
            {navItems.map((item) => {
              const Icon = item.icon
              const menuItem = (
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault()
                    router.push(item.href)
                  }}
                  className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-base transition-all duration-150 cursor-pointer ${
                    collapsed ? "justify-center px-3" : ""
                  } ${
                    item.active
                      ? "bg-white/15 text-white font-semibold shadow-md scale-[1.02]"
                      : "text-sidebar-foreground/70 hover:bg-white/8 hover:text-sidebar-foreground/90 hover:translate-x-1"
                  }`}
                  aria-current={item.active ? "page" : undefined}
                >
                  {/* Active left border - 4px gold accent bar */}
                  {item.active && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FCD34D] rounded-r" />
                  )}
                  
                  <Icon
                    className={`h-7 w-7 shrink-0 transition-all duration-150 ${
                      item.active ? "text-yellow-400" : item.color
                    } ${!item.active ? "group-hover:opacity-90" : ""}`}
                  />
                  
                  {!collapsed && (
                    <div className="flex-1 text-left min-w-0">
                      <div className="leading-tight truncate">{item.label}</div>
                      {item.badge && (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold text-white bg-orange-500 rounded-full">
                            {item.badge}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress indicator */}
                  {!collapsed && item.progress !== null && (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="h-1 w-10 overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300 rounded-full"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-white/60">{item.progress}%</span>
                    </div>
                  )}
                </a>
              )

              if (collapsed) {
                return (
                  <li key={item.label}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {menuItem}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-popover text-popover-foreground">
                        <div className="font-semibold">{item.label}</div>
                        {item.badge && (
                          <div className="text-xs text-muted-foreground mt-0.5">{item.badge}</div>
                        )}
                        {item.progress !== null && (
                          <div className="text-xs text-muted-foreground mt-0.5">{item.progress}%</div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                )
              }

              return <li key={item.label}>{menuItem}</li>
            })}
          </ul>
        </nav>

        {/* Log Out button */}
        <div className={`border-t border-white/10 bg-emerald-900/30 p-3 ${collapsed ? "px-2" : ""}`}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="w-full rounded-lg px-2 py-2 text-sm font-bold text-red-400 transition-all duration-150 hover:bg-red-500/20 hover:text-red-300 cursor-pointer flex items-center justify-center"
                  aria-label="Log Out"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover text-popover-foreground">
                Log Out
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              className="w-full rounded-lg px-4 py-2 text-sm font-bold text-red-400 transition-all duration-150 hover:bg-red-500/20 hover:text-red-300 cursor-pointer flex items-center gap-3 justify-center"
              aria-label="Log Out"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}