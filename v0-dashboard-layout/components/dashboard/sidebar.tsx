"use client"

import { useEffect, useState } from "react"
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

const navItems = [
  { label: "Home", icon: Gamepad2, href: "/", active: true, badge: null, progress: null },
  { label: "Adventure", icon: Map, href: "/adventure", active: false, badge: null, progress: null },
  { label: "Play", icon: Swords, href: "/play", active: false, badge: null, progress: null },
  { label: "Puzzles", icon: Puzzle, href: "/puzzles", active: false, badge: "3 new", progress: 64 },
  { label: "Learn", icon: GraduationCap, href: "/learn", active: false, badge: "1 new", progress: 45 },
  { label: "Progress", icon: TrendingUp, href: "/progress", active: false, badge: null, progress: 87 },
  { label: "Friends", icon: Users, href: "/friends", active: false, badge: "2 online", progress: null },
  { label: "Class", icon: Users2, href: "/class", active: false, badge: null, progress: null },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setCollapsed(saved === "true")
    }
  }, [])

  // Save collapsed state to localStorage and notify layout
  const toggleCollapse = () => {
    const newState = !collapsed
    setCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", String(newState))
    // Dispatch custom event to notify layout
    window.dispatchEvent(new Event("sidebar-toggle"))
  }

  // Handle quick play
  const handleQuickPlay = () => {
    router.push("/play")
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "q" || e.key === "Q") {
        handleQuickPlay()
      }
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyPress)
    return () => document.removeEventListener("keydown", handleKeyPress)
  }, [])

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
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-20" : "w-60"}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* HEADER SECTION */}
        <div className={`border-b border-sidebar-border bg-sidebar-accent/30 transition-all duration-300 ${collapsed ? "px-2 py-3" : "px-4 py-3"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className={`flex items-center gap-2 transition-all duration-300 ${collapsed ? "justify-center w-full" : ""}`}>
              {/* Logo - Animated Chess Pawn */}
              <div 
                className={`flex items-center justify-center transition-all duration-300 ${
                  collapsed ? "text-4xl" : "text-3xl"
                }`}
                role="img" 
                aria-label="Chess piece"
              >
                <div className="animate-pawn-float animate-pawn-glow cursor-pointer transition-transform hover:scale-110 active:animate-pawn-wiggle">
                  ♟️
                </div>
              </div>
              {!collapsed && (
                <h1 className="font-heading text-lg font-bold text-sidebar-foreground">
                  Prodigy Pawns
                </h1>
              )}
            </div>
            
            {/* Collapse toggle (desktop only) - KID-FRIENDLY: Large, colorful, animated */}
            <button
              onClick={toggleCollapse}
              className="hidden rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 p-3 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-95 lg:flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronRight className="h-8 w-8" /> : <ChevronLeft className="h-8 w-8" />}
            </button>

            {/* Close button (mobile) */}
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-sidebar-foreground/60 transition-colors hover:bg-white/10 hover:text-sidebar-foreground lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PROFILE SECTION - KID-FRIENDLY: Larger avatar, brighter colors */}
        <div className={`transition-all duration-300 ${collapsed ? "px-2 py-3" : "px-3 py-4"}`}>
          <div className={`overflow-hidden rounded-xl bg-gradient-to-br from-white/10 to-white/5 shadow-lg transition-all duration-300 ${collapsed ? "p-2" : "p-4"}`}>
            <div className="flex items-center gap-3">
              {/* Avatar - Larger for kids */}
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-4 border-yellow-400 shadow-lg">
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 text-2xl font-bold text-white">
                  A
                </div>
              </div>

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-lg font-bold leading-tight text-white">
                    Alex
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-base font-bold text-yellow-400">1842</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="h-5 w-5 text-orange-400" />
                      <span className="text-base font-bold text-orange-400">7</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm font-bold">
                  <span className="flex items-center gap-1.5 text-white/90">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    Knight 4
                  </span>
                  <span className="text-yellow-400">640 / 1000</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-sidebar-border shadow-inner">
                  <div
                    className="animate-xp-fill h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 shadow-md"
                    style={{ width: "64%" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* QUICK PLAY BUTTON - KID-FRIENDLY: Extra large, super bright, animated */}
        <div className={`transition-all duration-300 ${collapsed ? "px-2 py-2" : "px-3 py-3"}`}>
          <button
            onClick={handleQuickPlay}
            className="animate-quick-play-pulse group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 font-heading text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-[0_20px_60px_-15px_rgba(249,115,22,0.6)] active:scale-95"
            aria-label="Quick Play"
            title="Quick Play (Q)"
          >
            <div className={`flex items-center justify-center gap-2.5 transition-all duration-300 ${collapsed ? "py-3" : "h-16 py-4"}`}>
              <Zap className="h-8 w-8 shrink-0 animate-pulse" />
              {!collapsed && <span className="text-xl">Quick Play!</span>}
            </div>
            {!collapsed && (
              <div className="absolute right-3 top-2 rounded-md bg-white/20 px-2 py-0.5 text-xs font-mono text-white">
                Press Q
              </div>
            )}
          </button>
        </div>

        {/* NAVIGATION - KID-FRIENDLY: Larger icons, bigger touch targets, bright colors */}
        <nav className="flex-1 overflow-y-auto">
          <ul className={`flex flex-col transition-all duration-300 ${collapsed ? "px-2 py-2 space-y-2" : "px-3 py-2 space-y-3"}`} role="list">
            {navItems.map((item, index) => {
              const Icon = item.icon
              return (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-xl px-4 py-4 text-base font-semibold transition-all duration-200 ${
                      item.active
                        ? "scale-105 border-l-4 border-yellow-400 bg-gradient-to-r from-green-400/30 to-emerald-400/30 text-white shadow-lg"
                        : "text-sidebar-foreground/70 hover:scale-105 hover:bg-white/10 hover:text-sidebar-foreground/90"
                    }`}
                    aria-current={item.active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`h-10 w-10 shrink-0 transition-all ${item.active ? "scale-110 text-yellow-400" : "text-sidebar-foreground/60 group-hover:scale-110 group-hover:text-sidebar-foreground/90"}`} />

                    {!collapsed && (
                      <>
                        <div className="flex-1">
                          <div className="text-base leading-tight">{item.label}</div>
                          {item.badge && (
                            <div className="mt-1 inline-block rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-md">
                              {item.badge}
                            </div>
                          )}
                        </div>

                        {/* Progress indicator */}
                        {item.progress !== null && (
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="h-2 w-12 overflow-hidden rounded-full bg-white/20">
                              <div
                                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-white/60">{item.progress}%</span>
                          </div>
                        )}
                      </>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* BOTTOM SECTION - KID-FRIENDLY: Larger buttons, clearer icons */}
        <div className={`border-t-2 border-sidebar-border bg-sidebar-accent/30 transition-all duration-300 ${collapsed ? "px-2 py-3" : "px-3 py-4"}`}>
          {/* Settings */}
          <button className="group flex w-full items-center gap-3 rounded-xl px-4 py-4 text-base font-medium text-sidebar-foreground/80 transition-all hover:scale-105 hover:bg-white/15 hover:text-white" title={collapsed ? "Settings" : undefined}>
            <Settings className="h-8 w-8 transition-transform group-hover:rotate-90" />
            {!collapsed && <span>Settings</span>}
          </button>

          {!collapsed && <div className="my-3 border-t-2 border-sidebar-border" />}

          {/* Log Out */}
          <button className="group flex w-full items-center gap-3 rounded-xl px-4 py-4 text-base font-medium text-sidebar-foreground/80 transition-all hover:scale-105 hover:bg-red-500/30 hover:text-red-200" title={collapsed ? "Log Out" : undefined}>
            <LogOut className="h-8 w-8" />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
