import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/userApi';

export interface UserSession {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('userToken');
      const savedUser = localStorage.getItem('userInfo');
      
      if (token && savedUser) {
        try {
          const profile = await userApi.getProfile();
          const user = JSON.parse(savedUser);
          setCurrentUser({
            ...user,
            avatar: profile.avatar
          });
          setIsOnline(true);
        } catch (err) {
          console.error('Failed to verify token:', err);
          localStorage.removeItem('userToken');
          localStorage.removeItem('userInfo');
          setIsOnline(false);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
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
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('userInfo', JSON.stringify(session));
      setCurrentUser(session);
      setIsOnline(true);
      window.location.reload();
      return { success: true, message: '注册成功' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : '注册失败' };
    }
  }, []);

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
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('userInfo', JSON.stringify(session));
      setCurrentUser(session);
      setIsOnline(true);
      window.location.reload();
      return { success: true, message: '登录成功' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : '登录失败，请检查用户名和密码' };
    }
  }, []);

  const logout = useCallback(() => {
    userApi.logout();
    localStorage.removeItem('userInfo');
    setCurrentUser(null);
    setIsOnline(false);
    window.location.reload();
  }, []);

  const updateProfile = useCallback(async (updates: { username?: string; email?: string }): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: '请先登录' };
    }

    // 简化实现，实际应该调用 API 更新
    const updatedUser = {
      ...currentUser,
      ...updates
    };
    localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);

    return { success: true, message: '更新成功' };
  }, [currentUser]);

  return {
    currentUser,
    isLoading,
    isOnline,
    isAuthenticated: !!currentUser,
    register,
    login,
    logout,
    updateProfile
  };
}
