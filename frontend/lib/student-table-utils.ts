export const STUDENT_PAGE_SIZE = 10;

export const STUDENT_SKILL_ORDER: Record<string, number> = {
  Unrated: 0,
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4,
};

export interface StudentListRow {
  id: number;
  username: string;
  full_name: string;
  email: string;
  age?: number | null;
  internal_rating?: number;
  online_rating?: number | null;
  rating?: number;
  batch_names?: string[];
  skill_level?: string;
  attendance_pct?: number | null;
  is_active?: boolean;
  coach_id?: number | null;
  coach_username?: string | null;
  coach_full_name?: string | null;
  is_unassigned?: boolean;
}

export function studentDisplayName(s: StudentListRow): string {
  return s.full_name?.trim() || s.username;
}

export function isStudentListRowActive(s: StudentListRow): boolean {
  return s.is_active !== false;
}

export function studentAppRating(s: StudentListRow): number | null {
  const value = s.internal_rating ?? s.rating;
  return value != null ? value : null;
}

export function studentRatingSortKey(s: StudentListRow): number {
  return studentAppRating(s) ?? 0;
}

export function attendanceTextClass(pct: number | null | undefined): string {
  if (pct == null) return 'text-muted-foreground';
  if (pct >= 80) return 'coach-text-success';
  if (pct >= 50) return 'coach-text-warning';
  return 'coach-text-danger';
}

export function skillLevelClass(level: string | undefined): string {
  switch (level) {
    case 'Expert':
      return 'coach-text-accent';
    case 'Advanced':
      return 'coach-text-link';
    case 'Intermediate':
      return 'coach-text-success';
    case 'Beginner':
      return 'coach-text-warning';
    default:
      return 'text-muted-foreground';
  }
}

export type StudentSortCol =
  | 'name'
  | 'username'
  | 'age'
  | 'rating'
  | 'batch'
  | 'skill_level'
  | 'attendance_pct';
