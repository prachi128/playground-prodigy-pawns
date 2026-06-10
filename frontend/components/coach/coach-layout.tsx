"use client";

import { useCallback, useState } from "react";
import { useCoachTheme } from "@/contexts/coach-theme-context";
import { cn } from "@/lib/utils";
import { CoachSidebar } from "./coach-sidebar";

const COACH_SIDEBAR_COLLAPSED_KEY = "coach-sidebar-collapsed";

interface CoachLayoutProps {
  children: React.ReactNode;
}

export function CoachLayout({ children }: CoachLayoutProps) {
  const { theme } = useCoachTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(COACH_SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(COACH_SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const mainPadLg = sidebarCollapsed ? "lg:pl-[3.25rem]" : "lg:pl-[11.5rem]";

  return (
    <div
      data-coach-shell
      data-coach-theme={theme}
      className="relative min-h-screen bg-background text-foreground"
    >
      <CoachSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />

      {/* Offset for fixed sidebar on lg+; main column scrolls independently */}
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col bg-background transition-[padding] duration-200 ease-out",
          mainPadLg,
        )}
      >
        <div className="coach-main min-h-0 flex-1 overflow-y-auto bg-background">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
