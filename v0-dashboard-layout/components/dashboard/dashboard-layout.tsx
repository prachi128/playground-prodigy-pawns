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

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const { trigger: coachTrigger } = useCoachPrompts()

  // Listen for sidebar collapse state changes
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setSidebarCollapsed(saved === "true")
    }

    const handleStorageChange = () => {
      const current = localStorage.getItem("sidebar-collapsed")
      setSidebarCollapsed(current === "true")
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

      <div className={`flex flex-1 flex-col transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-60"}`}>
        <MemoizedHeader
          onMenuClick={handleMenuClick}
          theme={theme}
          onThemeToggle={handleToggleTheme}
        />

        <main className="content-green flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Onboarding System */}
      <MemoizedWelcomeModal />
      {coachTrigger && <MemoizedCoachGuidance trigger={coachTrigger} />}
    </div>
  )
}
