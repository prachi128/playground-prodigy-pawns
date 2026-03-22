"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { coachNav } from "./coach-nav";

interface CoachSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function CoachSidebar({ mobileOpen, onCloseMobile }: CoachSidebarProps) {
  const pathname = usePathname();

  const linkClass = (href: string) => {
    const isActive =
      pathname === href || (href !== "/coach" && pathname?.startsWith(href));
    return `group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
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
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 ease-out lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-16 shrink-0 flex-col justify-center border-b border-white/10 px-4 pt-5 pb-3 lg:h-auto">
          <div className="flex items-start justify-between gap-2">
            <Link
              href="/coach"
              className="min-w-0 flex-1 text-sidebar-foreground no-underline"
              onClick={onCloseMobile}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="select-none text-2xl leading-none text-amber-300/95"
                  aria-hidden
                >
                  ♞
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-lg font-bold leading-tight tracking-tight">
                    Prodigy Pawns
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/55">
                    Coach console
                  </p>
                </div>
              </div>
            </Link>
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

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 pb-6 scrollbar-hide">
          {coachNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/coach" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(item.href)}
                onClick={onCloseMobile}
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
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
