"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, Settings, Shield, X } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import {
  adminNav,
  ADMIN_NAV_SECTION_LABELS,
  ADMIN_NAV_SECTIONS,
} from "./admin-nav";
import { WorkspaceToggle } from "@/components/staff/workspace-toggle";

const ADMIN_SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

interface AdminSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function AdminSidebar({
  mobileOpen,
  onCloseMobile,
  collapsed = false,
  onToggleCollapsed,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const isNavActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const linkClass = (href: string, isCollapsedDesktop: boolean) => {
    const isActive = isNavActive(href);
    return `group relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150 ${
      isCollapsedDesktop ? "md:justify-center md:px-2" : ""
    } ${
      isActive
        ? "bg-white/[0.08] font-medium text-sidebar-foreground coach-nav-active"
        : "font-normal text-sidebar-foreground/65 hover:bg-white/[0.05] hover:text-sidebar-foreground/90"
    }`;
  };

  const navigateTo = (href: string) => {
    onCloseMobile();
    if (isNavActive(href) && pathname === href) return;
    router.push(href);
  };

  const renderNavLink = (item: (typeof adminNav)[number]) => {
    const Icon = item.icon;
    const isActive = isNavActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        className={linkClass(item.href, collapsed)}
        onClick={(event) => {
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          ) {
            onCloseMobile();
            return;
          }
          event.preventDefault();
          navigateTo(item.href);
        }}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? "page" : undefined}
      >
        {isActive && (
          <span
            className="coach-nav-indicator absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full bg-sidebar-foreground/80"
            aria-hidden
          />
        )}
        <Icon
          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
            isActive
              ? "text-sidebar-foreground"
              : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/75"
          }`}
        />
        <span className={collapsed ? "truncate md:sr-only" : "truncate"}>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] md:hidden"
          aria-label="Close menu"
          onClick={onCloseMobile}
        />
      )}

      <aside
        data-admin-sidebar
        data-coach-sidebar
        data-collapsed={collapsed ? "true" : "false"}
        className={`coach-sidebar-panel fixed inset-y-0 left-0 z-50 flex h-screen w-[11.5rem] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-[hsl(224_28%_12%)] text-sidebar-foreground transition-[transform,width] duration-200 ease-out ${
          collapsed ? "md:w-[3.25rem]" : "md:w-[11.5rem]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div
          className={`flex shrink-0 flex-col justify-center border-b border-white/[0.06] px-3 py-3.5 ${
            collapsed ? "md:px-2 md:py-3" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <Link
              href="/admin"
              className={`min-w-0 text-sidebar-foreground no-underline ${collapsed ? "md:min-w-0 md:flex-1" : "flex-1"}`}
              onClick={onCloseMobile}
            >
              <div className={`flex items-center gap-2 ${collapsed ? "md:justify-center" : ""}`}>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-sm text-amber-200/90"
                  aria-hidden
                >
                  <Shield className="h-3.5 w-3.5" />
                </span>
                <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
                  <p className="font-heading text-[13px] font-semibold leading-tight tracking-tight text-sidebar-foreground">
                    Torus Chess
                  </p>
                  <p className="text-[10px] font-medium tracking-wide text-amber-200/55">Admin</p>
                </div>
              </div>
            </Link>
            <div className="flex shrink-0 items-center">
              {onToggleCollapsed && (
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  className="hidden rounded-md p-1.5 text-sidebar-foreground/55 transition-colors hover:bg-white/[0.06] hover:text-sidebar-foreground md:inline-flex"
                  aria-expanded={!collapsed}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                  ) : (
                    <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                </button>
              )}
              <button
                type="button"
                className="rounded-md p-1.5 text-sidebar-foreground/55 transition-colors hover:bg-white/[0.06] hover:text-sidebar-foreground md:hidden"
                aria-label="Close sidebar"
                onClick={onCloseMobile}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 py-2.5 pb-2 scrollbar-hide">
          <WorkspaceToggle mode="admin" collapsed={collapsed} onNavigate={onCloseMobile} />

          {ADMIN_NAV_SECTIONS.map((section, sectionIdx) => {
            const sectionItems = adminNav.filter((item) => item.section === section);
            if (sectionItems.length === 0) return null;
            return (
              <div key={section} className={sectionIdx > 0 ? "mt-2.5" : ""}>
                {!collapsed ? (
                  <p className="mb-1 px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/38">
                    {ADMIN_NAV_SECTION_LABELS[section]}
                  </p>
                ) : (
                  <>
                    <p className="mb-1 px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/38 md:hidden">
                      {ADMIN_NAV_SECTION_LABELS[section]}
                    </p>
                    <p
                      className="mb-1 hidden px-1 text-center text-[9px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/38 md:block"
                      title={ADMIN_NAV_SECTION_LABELS[section]}
                    >
                      {ADMIN_NAV_SECTION_LABELS[section].slice(0, 3)}
                    </p>
                  </>
                )}
                <div className="space-y-0.5">{sectionItems.map(renderNavLink)}</div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] px-2 py-2">
          <Link
            href="/coach/settings"
            className={linkClass("/coach/settings", collapsed)}
            onClick={onCloseMobile}
            title={collapsed ? "Settings" : undefined}
            aria-current={pathname === "/coach/settings" ? "page" : undefined}
          >
            <Settings className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/55" />
            <span className={collapsed ? "truncate md:sr-only" : "truncate"}>Settings</span>
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              window.location.href = "/login";
            }}
            className={`group mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-normal text-sidebar-foreground/55 transition-colors hover:bg-white/[0.05] hover:text-red-300/90 ${
              collapsed ? "md:justify-center md:px-2" : ""
            }`}
            title={collapsed ? "Log out" : undefined}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={collapsed ? "truncate md:sr-only" : "truncate"}>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export { ADMIN_SIDEBAR_COLLAPSED_KEY };
