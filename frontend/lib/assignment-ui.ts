export function formatAssignmentDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAssignmentDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isAssignmentOverdue(due: string | null): boolean {
  if (!due) return false;
  return new Date(due) < new Date();
}

export function isAssignmentDueSoon(due: string | null): boolean {
  if (!due) return false;
  const t = new Date(due).getTime();
  if (t < Date.now()) return false;
  const days = (t - Date.now()) / 86_400_000;
  return days <= 3;
}
