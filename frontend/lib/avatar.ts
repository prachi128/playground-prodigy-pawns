/** First letter of username (uppercase), or "?" if missing — use when no avatar image. */
export function usernameInitial(username: string | null | undefined): string {
  const u = (username ?? '').trim();
  if (!u) return '?';
  return u.charAt(0).toUpperCase();
}

/** First letter of full name, else username initial. */
export function personInitial(
  fullName: string | null | undefined,
  username?: string | null | undefined
): string {
  const name = (fullName ?? '').trim();
  if (name) return name.charAt(0).toUpperCase();
  return usernameInitial(username);
}

/** Resolve avatar URL for <img src>: absolute API URLs, or site-relative paths from /public. */

export function getAvatarDisplayUrl(avatarUrl: string | null | undefined): string {
  const u = (avatarUrl ?? '').trim();
  if (!u) return '';
  const legacyKidMatch = u.match(/^\/avatars\/kid-0([1-9])\.png$/);
  if (legacyKidMatch) return `/avatars/kid-${legacyKidMatch[1]}.png`;
  const legacyJpgMatch = u.match(/^\/avatars\/avatar-0?([1-9]|1[0-2])\.jpg$/);
  if (legacyJpgMatch) return `/avatars/kid-${legacyJpgMatch[1]}.png`;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return u;
  return u;
}

export function isDefaultOrEmptyAvatar(avatarUrl: string | null | undefined): boolean {
  const u = (avatarUrl ?? '').trim();
  if (!u) return true;
  if (u.includes('/avatars/default')) return true;
  return false;
}

/** Preset images in /public/avatars (Next.js serves at /avatars/...). */
export const PRESET_AVATAR_PATHS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  return `/avatars/kid-${n}.png`;
});
