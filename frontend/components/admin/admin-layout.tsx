"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { useCoachTheme } from "@/contexts/coach-theme-context";
import { cn } from "@/lib/utils";
import { AdminSidebar, ADMIN_SIDEBAR_COLLAPSED_KEY } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { theme } = useCoachTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const mainPadMd = sidebarCollapsed ? "md:pl-[3.25rem]" : "md:pl-[11.5rem]";

  return (
    <div
      data-admin-shell
      data-coach-shell
      data-coach-theme={theme}
      className="coach-fonts relative min-h-screen bg-background text-foreground antialiased"
    >
      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />

      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col bg-background transition-[padding] duration-200 ease-out",
          mainPadMd,
        )}
      >
        <AdminHeader onMenuClick={() => setMobileSidebarOpen(true)} />
        <div className="coach-main min-h-0 flex-1 overflow-y-auto bg-background">
          <div
            key={pathname}
            className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
