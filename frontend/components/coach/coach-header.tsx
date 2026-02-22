"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import {
  LayoutDashboard,
  Puzzle,
  PlusCircle,
  Users,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const coachNav = [
  { label: "Dashboard", href: "/coach", icon: LayoutDashboard },
  { label: "Students", href: "/coach/students", icon: Users },
  { label: "Puzzles", href: "/coach/puzzles", icon: Puzzle },
  { label: "Create Puzzle", href: "/coach/puzzles/create", icon: PlusCircle },
];

export function CoachHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.full_name?.split(" ")[0] ?? "Coach";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileNavOpen(false);
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 rounded-b-2xl bg-gradient-to-r from-primary-500 to-purple-600 px-4 shadow-lg sm:px-6 lg:px-8">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMobileNavOpen((o) => !o)}
            className="rounded-xl p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <Link
            href="/coach"
            className="flex items-center gap-2 text-white no-underline"
          >
            <span className="text-2xl" role="img" aria-hidden>👨‍🏫</span>
            <span className="text-xl font-bold">Coach Dashboard</span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 lg:flex">
            {coachNav.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/coach" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                    isActive
                      ? "bg-white/20 text-white shadow-md"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="relative flex items-center" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl py-2 pl-2 pr-2 text-left transition-colors hover:bg-white/10 lg:pl-3 lg:pr-2"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-sm font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden max-w-[120px] truncate text-sm font-bold text-white lg:block">
              {displayName}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-white/80 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 overflow-hidden rounded-2xl border-2 border-purple-200 bg-white py-1 shadow-xl">
              <div className="border-b-2 border-gray-100 px-3 py-2">
                <p className="truncate text-sm font-bold text-gray-800">{user?.full_name ?? displayName}</p>
                <p className="truncate text-xs text-gray-500">{user?.email ?? ""}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {mobileNavOpen && (
        <div className="border-t-2 border-white/20 bg-white/5 px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {coachNav.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/coach" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
