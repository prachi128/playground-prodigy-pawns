/** Admin console paths for coach activity oversight. */
export function adminCoachesPath(): string {
  return '/admin/coaches';
}

export function adminCoachProfilePath(username: string): string {
  return `/admin/coaches/${encodeURIComponent(username)}`;
}

/** API path segment for /api/admin/coaches/{ref}/activity */
export function adminCoachApiRef(username: string): string {
  return encodeURIComponent(username);
}

/** @deprecated Use adminCoachProfilePath — legacy coach-shell path */
export function coachCoachProfilePath(username: string): string {
  return adminCoachProfilePath(username);
}

/** @deprecated Use adminCoachApiRef */
export function coachCoachApiRef(username: string): string {
  return adminCoachApiRef(username);
}
