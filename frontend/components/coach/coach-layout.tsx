"use client";

import { useCallback, useEffect, useState } from "react";
import { CoachSidebar } from "./coach-sidebar";

const COACH_SIDEBAR_COLLAPSED_KEY = "coach-sidebar-collapsed";

interface CoachLayoutProps {
  children: React.ReactNode;
}

export function CoachLayout({ children }: CoachLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem(COACH_SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

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

  const mainPadLg = sidebarCollapsed ? "lg:pl-16" : "lg:pl-64";

  return (
    <div data-coach-shell className="relative min-h-screen bg-background">
      <CoachSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />

      {/* Offset for fixed sidebar on lg+; main column scrolls independently */}
      <div
        className={`flex min-h-screen min-w-0 flex-col transition-[padding] duration-200 ease-out ${mainPadLg}`}
      >
        <div className="coach-main min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 xl:px-12">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
