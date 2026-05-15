const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/** 将后端返回的相对路径（如 /uploads/icons/xxx.png）转为可访问的完整 URL */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}
