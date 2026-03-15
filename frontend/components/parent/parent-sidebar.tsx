"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CreditCard,
  Users,
  X,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { authAPI } from "@/lib/api";
import toast from "react-hot-toast";

const navItems = [
  { label: "Home", icon: LayoutDashboard, href: "/parent", color: "text-yellow-400" },
  { label: "Classes", icon: Calendar, href: "/parent/classes", color: "text-cyan-400" },
  { label: "Payments", icon: CreditCard, href: "/parent/payments", color: "text-emerald-400" },
  { label: "Children", icon: Users, href: "/parent/children", color: "text-pink-400" },
];

interface ParentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ParentSidebar({ isOpen, onClose }: ParentSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {}
    logout();
    router.push("/login");
    toast.success("Logged out successfully");
  }, [logout, router]);

  const handleNav = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "#1a4a3a" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <span className="text-white font-bold text-lg">Prodigy Pawns</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white/70 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-white font-semibold text-sm truncate">
            {user?.full_name || "Parent"}
          </p>
          <p className="text-white/50 text-xs">Parent Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/parent" && pathname.startsWith(item.href));
            return (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-white/15 text-white shadow-lg"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? item.color : "text-white/50"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
