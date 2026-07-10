"use client";

import { useRouter } from "next/navigation";
import type { WorkspaceMode } from "@/lib/workspace-mode";
import { homePathForMode } from "@/lib/workspace-mode";

interface WorkspaceToggleProps {
  mode: WorkspaceMode;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function WorkspaceToggle({ mode, collapsed = false, onNavigate }: WorkspaceToggleProps) {
  const router = useRouter();

  const switchTo = (target: WorkspaceMode) => {
    if (target === mode) return;
    onNavigate?.();
    router.push(homePathForMode(target));
  };

  return (
    <div
      className={`mb-2 rounded-lg border border-white/[0.08] bg-white/[0.04] p-0.5 ${
        collapsed ? "md:mx-1" : ""
      }`}
      role="group"
      aria-label="Workspace"
    >
      <div className={`flex gap-0.5 ${collapsed ? "md:flex-col" : ""}`}>
        {(["coach", "admin"] as const).map((key) => {
          const active = mode === key;
          const label = key === "coach" ? "Coach" : "Admin";
          return (
            <button
              key={key}
              type="button"
              onClick={() => switchTo(key)}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                collapsed ? "md:px-1.5 md:py-2" : ""
              } ${
                active
                  ? "bg-white/[0.12] text-sidebar-foreground"
                  : "text-sidebar-foreground/55 hover:bg-white/[0.06] hover:text-sidebar-foreground/85"
              }`}
              aria-pressed={active}
              title={collapsed ? label : undefined}
            >
              <span className={collapsed ? "md:sr-only" : ""}>{label}</span>
              <span className={collapsed ? "hidden md:inline" : "hidden"} aria-hidden>
                {label.slice(0, 1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
