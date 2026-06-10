/** Coach console URL for a coach activity profile (username-based). */
export function coachCoachProfilePath(username: string): string {
  return `/coach/coaches/${encodeURIComponent(username)}`;
}

/** API path segment for /api/admin/coaches/{ref}/activity */
export function coachCoachApiRef(username: string): string {
  return encodeURIComponent(username);
}
