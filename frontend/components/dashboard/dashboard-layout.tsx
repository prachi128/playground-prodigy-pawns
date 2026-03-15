"use client"

import { useState, useCallback, memo, useEffect } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { WelcomeModal } from "@/components/onboarding/welcome-modal"
import { CoachGuidance, useCoachPrompts } from "@/components/onboarding/coach-guidance"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const MemoizedSidebar = memo(Sidebar)
const MemoizedHeader = memo(Header)
const MemoizedWelcomeModal = memo(WelcomeModal)
const MemoizedCoachGuidance = memo(CoachGuidance)

function getInitialSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false
  const saved = localStorage.getItem("sidebar-collapsed")
  if (saved !== null) return saved === "true"
  return window.innerWidth < 1024
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => getInitialSidebarCollapsed())
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const { trigger: coachTrigger } = useCoachPrompts()

  // Listen for sidebar collapse state changes (match sidebar: collapsed on mobile/tablet, expanded on desktop when no saved value)
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setSidebarCollapsed(saved === "true")
    } else {
      setSidebarCollapsed(typeof window !== "undefined" && window.innerWidth < 1024)
    }

    const handleStorageChange = () => {
      const current = localStorage.getItem("sidebar-collapsed")
      setSidebarCollapsed(current !== null ? current === "true" : (typeof window !== "undefined" && window.innerWidth < 1024))
    }

    window.addEventListener("storage", handleStorageChange)
    // Custom event for same-tab updates
    window.addEventListener("sidebar-toggle", handleStorageChange as EventListener)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("sidebar-toggle", handleStorageChange as EventListener)
    }
  }, [])

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }, [])

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <MemoizedSidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />

      <div className={`flex min-w-0 flex-1 flex-col overflow-x-hidden transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-60"}`}>
        <MemoizedHeader
          onMenuClick={handleMenuClick}
          theme={theme}
          onThemeToggle={handleToggleTheme}
        />

        <main className="content-green min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Onboarding System */}
      <MemoizedWelcomeModal />
      {coachTrigger && <MemoizedCoachGuidance trigger={coachTrigger} />}
    </div>
  )
}
