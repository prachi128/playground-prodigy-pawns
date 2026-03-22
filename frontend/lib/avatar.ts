/** First letter of username (uppercase), or "?" if missing — use when no avatar image. */
export function usernameInitial(username: string | null | undefined): string {
  const u = (username ?? '').trim();
  if (!u) return '?';
  return u.charAt(0).toUpperCase();
}

/** Resolve avatar URL for <img src>: absolute API URLs, or site-relative paths from /public. */

export function getAvatarDisplayUrl(avatarUrl: string | null | undefined): string {
  const u = (avatarUrl ?? '').trim();
  if (!u) return '';
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
  const n = String(i + 1).padStart(2, '0');
  return `/avatars/avatar-${n}.jpg`;
});
