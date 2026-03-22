"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { getAvatarDisplayUrl, isDefaultOrEmptyAvatar, usernameInitial } from "@/lib/avatar";
import { ChevronDown, LayoutDashboard, LogOut, Menu, Settings } from "lucide-react";

interface CoachHeaderProps {
  onMenuClick: () => void;
}

export function CoachHeader({ onMenuClick }: CoachHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.full_name?.split(" ")[0] ?? "Coach";
  const avatarSrc = getAvatarDisplayUrl(user?.avatar_url);
  const showAvatarImage =
    Boolean(avatarSrc) &&
    !isDefaultOrEmptyAvatar(user?.avatar_url) &&
    !avatarLoadFailed;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatar_url]);

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
    await logout();
    router.push("/login");
  };

  return (
    <header className="coach-header-bar sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2.5 text-sidebar-foreground/85 transition-colors hover:bg-white/10 hover:text-sidebar-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link
          href="/coach"
          className="hidden min-w-0 items-center gap-2.5 text-sidebar-foreground no-underline sm:flex"
        >
          <LayoutDashboard className="h-5 w-5 shrink-0 text-amber-300/90" aria-hidden />
          <div className="min-w-0">
            <span className="font-heading block truncate text-lg font-bold leading-tight tracking-tight">
              Coach dashboard
            </span>
            <span className="mt-0.5 block text-[11px] font-medium text-sidebar-foreground/65">
              Instruction &amp; analytics
            </span>
          </div>
        </Link>
      </div>

      <div className="relative flex items-center" ref={userMenuRef}>
        <button
          type="button"
          onClick={() => setUserMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-xl py-2 pl-2 pr-2 text-left transition-colors hover:bg-white/10 lg:pl-3"
          aria-expanded={userMenuOpen}
          aria-haspopup="true"
        >
          <div className="sidebar-avatar relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#FCD34D] bg-white/10 text-sm font-bold text-sidebar-foreground">
            {showAvatarImage && avatarSrc.startsWith("/") ? (
              <Image
                src={avatarSrc}
                alt=""
                width={36}
                height={36}
                className="h-full w-full object-cover"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : showAvatarImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- uploaded avatar on API host
              <img
                src={avatarSrc}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              usernameInitial(user?.username)
            )}
          </div>
          <span className="hidden max-w-[140px] truncate text-sm font-semibold text-sidebar-foreground lg:block">
            {displayName}
          </span>
          <ChevronDown
            className={`hidden h-4 w-4 text-sidebar-foreground/60 transition-transform lg:block ${userMenuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {userMenuOpen && (
          <div className="animate-dropdown-slide absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-xl">
            <div className="border-b border-border px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-card-foreground">
                {user?.full_name ?? displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
            </div>
            <Link
              href="/coach/settings"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-card-foreground transition-colors hover:bg-muted/80"
              onClick={() => setUserMenuOpen(false)}
            >
              <Settings className="h-4 w-4 shrink-0" />
              Settings
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
