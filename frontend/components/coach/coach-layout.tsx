"use client";

import { useState } from "react";
import { CoachHeader } from "./coach-header";
import { CoachSidebar } from "./coach-sidebar";

interface CoachLayoutProps {
  children: React.ReactNode;
}

export function CoachLayout({ children }: CoachLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div data-coach-shell className="flex min-h-screen bg-background">
      <CoachSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:pl-0">
        <CoachHeader onMenuClick={() => setMobileSidebarOpen(true)} />
        <div className="coach-main min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 xl:px-12">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
