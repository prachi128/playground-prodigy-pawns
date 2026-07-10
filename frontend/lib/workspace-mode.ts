export type WorkspaceMode = "coach" | "admin";

export function workspaceModeFromPath(pathname: string | null): WorkspaceMode {
  if (pathname?.startsWith("/admin")) return "admin";
  return "coach";
}

export function homePathForMode(mode: WorkspaceMode): string {
  return mode === "admin" ? "/admin" : "/coach";
}

/** Admins always land in coach mode after login. */
export function defaultWorkspaceHomeForRole(role: string | undefined): string {
  if (role === "coach" || role === "admin") return "/coach";
  return "/dashboard";
}
