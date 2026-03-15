"use client";

import { CoachHeader } from "./coach-header";

interface CoachLayoutProps {
  children: React.ReactNode;
}

export function CoachLayout({ children }: CoachLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50">
      <CoachHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 xl:px-12">
        {children}
      </div>
    </div>
  );
}
