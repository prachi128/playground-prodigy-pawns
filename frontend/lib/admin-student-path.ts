/** Admin console URL for a student profile (username-based). */
export function adminStudentProfilePath(username: string): string {
  return `/admin/students/${encodeURIComponent(username)}`;
}

/** Printable progress report from admin context (shared report route). */
export function adminStudentReportPath(username: string): string {
  return `/admin/students/${encodeURIComponent(username)}/report`;
}
