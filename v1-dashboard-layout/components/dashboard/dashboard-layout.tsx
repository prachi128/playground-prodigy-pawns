"use client"

import { useState, useCallback, memo } from "react"
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed")
      if (saved !== null) {
        return saved === "true"
      }
      return window.innerWidth >= 768 && window.innerWidth < 1024
    }
    return false
  })
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const { trigger: coachTrigger } = useCoachPrompts()

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }, [])

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  const handleCollapsedChange = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
  }, [])

  const sidebarPadding = sidebarCollapsed ? "lg:pl-16" : "lg:pl-60"

  return (
    <div className="flex min-h-screen bg-background">
      <MemoizedSidebar 
        isOpen={sidebarOpen} 
        onClose={handleCloseSidebar}
        collapsed={sidebarCollapsed}
        onCollapsedChange={handleCollapsedChange}
      />

      <div className={`flex flex-1 flex-col transition-all duration-300 ${sidebarPadding}`}>
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
