import { resolveMediaUrl } from './mediaUrl';

const AVATAR_COLORS = [
  '#64748b', '#78716c', '#71717a', '#6b7280', '#737373',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#8b5cf6',
  '#a855f7', '#d946ef', '#f43f5e', '#f97316', '#eab308',
];

export function getAvatarInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  if (/[\u4e00-\u9fff]/.test(trimmed)) {
    return trimmed.slice(0, 1);
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getUserDisplayName(user: { nickname?: string | null; username: string }): string {
  const nickname = user.nickname?.trim();
  return nickname || user.username;
}

export function getUserSubtitle(user: { nickname?: string | null; username: string; email?: string }): string {
  const nickname = user.nickname?.trim();
  if (nickname) return user.username;
  return user.email?.trim() || user.username;
}

export function resolveUserAvatarSrc(avatar?: string | null): string | undefined {
  return resolveMediaUrl(avatar);
}
