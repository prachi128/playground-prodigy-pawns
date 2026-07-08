/** Coach console URL for a student profile (username-based). */
export function coachStudentProfilePath(username: string): string {
  return `/coach/students/${encodeURIComponent(username)}`;
}

/** Printable progress report URL for a student. */
export function coachStudentReportPath(username: string): string {
  return `/coach/students/${encodeURIComponent(username)}/report`;
}

/** API path segment for /api/coach/students/{ref}/… */
export function coachStudentApiRef(username: string): string {
  return encodeURIComponent(username);
}
