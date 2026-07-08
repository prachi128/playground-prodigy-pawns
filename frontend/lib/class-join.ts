/** Whether in-app join (and auto-present) is allowed for a class session. */
export function canJoinClassSession(
  dateIso: string,
  durationMinutes: number,
  joinWindowBeforeMinutes = 15,
): boolean {
  const start = new Date(dateIso);
  if (Number.isNaN(start.getTime())) return false;
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const windowStart = new Date(start.getTime() - joinWindowBeforeMinutes * 60_000);
  const now = new Date();
  return now >= windowStart && now <= end;
}
