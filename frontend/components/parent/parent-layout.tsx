"use client";

import { useState } from "react";
import { ParentSidebar } from "./parent-sidebar";
import { ParentHeader } from "./parent-header";

interface ParentLayoutProps {
  children: React.ReactNode;
}

export function ParentLayout({ children }: ParentLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50">
      <ParentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <ParentHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
