"use client";

import { Menu, Bell } from "lucide-react";
import { useAuthStore } from "@/lib/store";

interface ParentHeaderProps {
  onMenuClick: () => void;
}

export function ParentHeader({ onMenuClick }: ParentHeaderProps) {
  const { user } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">
            Parent Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition">
            <Bell className="w-5 h-5 text-gray-500" />
          </button>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-gray-800">{user?.full_name}</p>
            <p className="text-xs text-gray-500">Parent</p>
          </div>
        </div>
      </div>
    </header>
  );
}
