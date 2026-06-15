const STUDENT_PLACEHOLDER_DOMAIN = '@students.prodigypawns.internal';

export function displayUserEmail(email?: string | null): string | null {
  if (!email) return null;
  if (email.toLowerCase().endsWith(STUDENT_PLACEHOLDER_DOMAIN)) return null;
  return email;
}
