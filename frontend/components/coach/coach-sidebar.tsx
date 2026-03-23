"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, Settings, Shield, X } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { coachNav } from "./coach-nav";

interface CoachSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  /** Desktop (lg+): icon rail when true */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function CoachSidebar({
  mobileOpen,
  onCloseMobile,
  collapsed = false,
  onToggleCollapsed,
}: CoachSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [adminOpen, setAdminOpen] = useState(true);
  const navItems = coachNav.filter(
    (item) => !item.adminOnly || user?.role === "admin",
  );
  const mainNavItems = navItems.filter((item) => !item.adminOnly);
  const adminNavItems = navItems.filter((item) => item.adminOnly);

  const linkClass = (href: string, isCollapsedDesktop: boolean) => {
    const isActive =
      pathname === href || (href !== "/coach" && pathname?.startsWith(href));
    return `group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
      isCollapsedDesktop ? "lg:justify-center lg:px-2" : ""
    } ${
      isActive
        ? "bg-white/15 font-semibold text-sidebar-foreground shadow-md"
        : "text-sidebar-foreground/70 hover:bg-white/8 hover:text-sidebar-foreground/90"
    }`;
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={onCloseMobile}
        />
      )}

      <aside
        data-sidebar
        data-collapsed={collapsed ? "true" : "false"}
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-[transform,width] duration-200 ease-out lg:shadow-none ${
          collapsed ? "lg:w-16" : "lg:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div
          className={`flex h-16 shrink-0 flex-col justify-center border-b border-white/10 px-4 pt-5 pb-3 lg:h-auto ${
            collapsed ? "lg:px-2 lg:py-2.5 lg:pt-2.5 lg:pb-2.5" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <Link
              href="/coach"
              className={`min-w-0 text-sidebar-foreground no-underline ${collapsed ? "lg:min-w-0 lg:flex-1" : "flex-1"}`}
              onClick={onCloseMobile}
            >
              <div
                className={`flex items-center gap-2.5 ${collapsed ? "lg:justify-start" : ""}`}
              >
                <span
                  className="select-none text-2xl leading-none text-amber-300/95"
                  aria-hidden
                >
                  ♞
                </span>
                <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
                  <p className="font-heading text-lg font-bold leading-tight tracking-tight">
                    Prodigy Pawns
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/55">
                    Coach console
                  </p>
                </div>
              </div>
            </Link>
            <div className="flex shrink-0 items-center">
              {onToggleCollapsed && (
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  className="hidden rounded-lg p-2 text-sidebar-foreground/75 transition-colors hover:bg-white/10 hover:text-sidebar-foreground lg:inline-flex"
                  aria-expanded={!collapsed}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? (
                    <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
                  ) : (
                    <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
                  )}
                </button>
              )}
              <button
                type="button"
                className="rounded-lg p-2 text-sidebar-foreground/60 transition-colors hover:bg-white/10 hover:text-sidebar-foreground lg:hidden"
                aria-label="Close sidebar"
                onClick={onCloseMobile}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 py-3 pb-2 scrollbar-hide">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/coach" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(item.href, collapsed)}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-r bg-[#FCD34D]"
                    aria-hidden
                  />
                )}
                <Icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    isActive ? "text-amber-300" : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground/80"
                  }`}
                />
                <span className={collapsed ? "truncate lg:sr-only" : "truncate"}>{item.label}</span>
              </Link>
            );
          })}

          {adminNavItems.length > 0 && (
            <div className="mt-2 border-t border-white/10 pt-2">
              <button
                type="button"
                onClick={() => setAdminOpen((o) => !o)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/70 transition-colors hover:bg-white/8 hover:text-sidebar-foreground/90 ${
                  collapsed ? "lg:justify-center lg:px-2" : ""
                }`}
                aria-expanded={adminOpen}
                title={collapsed ? "Admin Only" : undefined}
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span className={collapsed ? "truncate lg:sr-only" : "truncate"}>Admin Only</span>
                <ChevronRight
                  className={`ml-auto h-4 w-4 shrink-0 transition-transform ${
                    adminOpen ? "rotate-90" : ""
                  } ${collapsed ? "lg:hidden" : ""}`}
                />
              </button>

              {adminOpen && (
                <div className="mt-1 space-y-1">
                  {adminNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/coach" && pathname?.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={linkClass(item.href, collapsed)}
                        onClick={onCloseMobile}
                        title={collapsed ? item.label : undefined}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-0 bottom-0 w-1 rounded-r bg-[#FCD34D]"
                            aria-hidden
                          />
                        )}
                        <Icon
                          className={`h-5 w-5 shrink-0 transition-colors ${
                            isActive ? "text-amber-300" : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground/80"
                          }`}
                        />
                        <span className={collapsed ? "truncate lg:sr-only" : "truncate"}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="border-t border-white/10 px-3 py-2">
          <Link
            href="/coach/settings"
            className={linkClass("/coach/settings", collapsed)}
            onClick={onCloseMobile}
            title={collapsed ? "Settings" : undefined}
            aria-current={pathname === "/coach/settings" ? "page" : undefined}
          >
            <Settings className="h-5 w-5 shrink-0 text-sidebar-foreground/70" />
            <span className={collapsed ? "truncate lg:sr-only" : "truncate"}>Settings</span>
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              window.location.href = "/login";
            }}
            className={`group mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 transition-all duration-150 hover:bg-white/8 ${
              collapsed ? "lg:justify-center lg:px-2" : ""
            }`}
            title={collapsed ? "Log out" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0 text-red-400" />
            <span className={collapsed ? "truncate lg:sr-only" : "truncate"}>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
