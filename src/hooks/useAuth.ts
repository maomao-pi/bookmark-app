import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/userApi';
import { logger } from '../utils/logger';

export interface UserSession {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  nickname?: string | null;
  role?: string;
  permissions?: string | null;
  createdAt: string;
}

function parseStoredUser(raw: string | null): UserSession | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /未登录|401|过期|无效|Unauthorized|用户名或密码/i.test(msg);
}

function buildSessionFromProfile(
  profile: {
    id: number;
    username: string;
    email: string;
    avatar?: string;
    nickname?: string;
    role?: string;
    permissions?: string;
  },
  base?: UserSession | null,
): UserSession {
  return {
    id: String(profile.id),
    username: profile.username,
    email: profile.email ?? base?.email ?? '',
    avatar: profile.avatar ?? base?.avatar ?? null,
    nickname: profile.nickname ?? base?.nickname ?? null,
    role: profile.role ?? base?.role,
    permissions: profile.permissions ?? base?.permissions ?? null,
    createdAt: base?.createdAt ?? new Date().toISOString(),
  };
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('userToken');
      const cached = parseStoredUser(localStorage.getItem('userInfo'));

      if (!token) {
        setIsLoading(false);
        return;
      }

      // 先用本地缓存恢复登录态，避免 profile 请求失败时 UI 闪退为未登录
      if (cached) {
        setCurrentUser(cached);
        setIsOnline(true);
      }

      try {
        const profile = await userApi.getProfile();
        const session = buildSessionFromProfile(profile, cached);
        localStorage.setItem('userInfo', JSON.stringify(session));
        setCurrentUser(session);
        setIsOnline(true);
      } catch (err) {
        logger.error('useAuth.checkAuth', err);
        if (isAuthError(err)) {
          localStorage.removeItem('userToken');
          localStorage.removeItem('userInfo');
          setCurrentUser(null);
          setIsOnline(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const persistSession = useCallback((session: UserSession) => {
    localStorage.setItem('userInfo', JSON.stringify(session));
    setCurrentUser(session);
    setIsOnline(true);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string, nickname: string, phone: string): Promise<{ success: boolean; message: string }> => {
    if (!username || !email || !password || !nickname || !phone) {
      return { success: false, message: '请填写所有必填项' };
    }

    if (password.length < 6) {
      return { success: false, message: '密码长度至少为6位' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, message: '请输入有效的邮箱地址' };
    }

    try {
      const result = await userApi.register({ username, email, password, nickname, phone });
      const session: UserSession = {
        id: String(result.user.id),
        username: result.user.username,
        email: result.user.email,
        avatar: result.user.avatar,
        nickname: result.user.nickname ?? nickname,
        role: result.user.role,
        permissions: result.user.permissions ?? null,
        createdAt: new Date().toISOString(),
      };
      persistSession(session);
      window.location.reload();
      return { success: true, message: '注册成功' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : '注册失败' };
    }
  }, [persistSession]);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    if (!username || !password) {
      return { success: false, message: '请填写用户名和密码' };
    }

    try {
      const result = await userApi.login({ username, password });
      const session: UserSession = {
        id: String(result.user.id),
        username: result.user.username,
        email: result.user.email,
        avatar: result.user.avatar,
        nickname: result.user.nickname ?? null,
        role: result.user.role,
        permissions: result.user.permissions ?? null,
        createdAt: new Date().toISOString(),
      };
      persistSession(session);
      window.location.reload();
      return { success: true, message: '登录成功' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : '登录失败，请检查用户名和密码' };
    }
  }, [persistSession]);

  const logout = useCallback(() => {
    userApi.logout();
    localStorage.removeItem('userInfo');
    setCurrentUser(null);
    setIsOnline(false);
    window.location.reload();
  }, []);

  const patchSession = useCallback((updates: Partial<UserSession>) => {
    setCurrentUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      localStorage.setItem('userInfo', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateProfile = useCallback(async (updates: { username?: string; email?: string }): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: '请先登录' };
    }

    try {
      await userApi.updateExtendedProfile({
        nickname: updates.username,
      });
      const updatedUser = {
        ...currentUser,
        ...updates
      };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      return { success: true, message: '更新成功' };
    } catch (err) {
      logger.error('useAuth.updateProfile', err);
      return { success: false, message: err instanceof Error ? err.message : '更新失败' };
    }
  }, [currentUser]);

  return {
    currentUser,
    isLoading,
    isOnline,
    isAuthenticated: !!currentUser,
    register,
    login,
    logout,
    updateProfile,
    patchSession,
  };
}
