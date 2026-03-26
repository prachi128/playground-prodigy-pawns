"use client";

import { useState } from "react";
import { ParentSidebar } from "./parent-sidebar";
import { Menu } from "lucide-react";

interface ParentLayoutProps {
  children: React.ReactNode;
}

export function ParentLayout({ children }: ParentLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div data-parent-shell className="relative min-h-screen bg-background">
      <ParentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <div className="parent-main min-h-0 flex-1 overflow-y-auto">
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-4 top-4 z-30 rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition hover:bg-gray-50 lg:hidden"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 xl:px-12">{children}</main>
        </div>
      </div>
    </div>
  );
}
