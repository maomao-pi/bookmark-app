/** 解析用户 permissions JSON，返回已启用的菜单 key 列表 */
export function parseEnabledAdminMenus(permissions?: string | null): string[] {
  if (!permissions) return [];
  try {
    const parsed = JSON.parse(permissions) as { menus?: Record<string, boolean> };
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
    if (parsed?.menus && typeof parsed.menus === 'object') {
      return Object.entries(parsed.menus)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([key]) => key);
    }
  } catch {
    // ignore
  }
  return [];
}

/** 是否可通过用户端 Token 免登进入管理后台 */
export function canAccessAdminBackend(user: {
  role?: string | null;
  permissions?: string | null;
} | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return parseEnabledAdminMenus(user.permissions).length > 0;
}

/** 打开管理后台系统登录页（admin 表账号：super_admin / admin） */
export function openSystemAdminLogin() {
  window.open('/admin.html', '_blank', 'noopener,noreferrer');
}

/** 已登录用户端且有权时，携带 userToken 免登进入管理后台 */
export function openAdminPanelAsUser() {
  const token = localStorage.getItem('userToken');
  if (!token) {
    openSystemAdminLogin();
    return;
  }
  window.open(`/admin.html?userToken=${encodeURIComponent(token)}`, '_blank', 'noopener,noreferrer');
}
