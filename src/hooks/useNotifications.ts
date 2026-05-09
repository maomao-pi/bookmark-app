import { useState, useEffect, useCallback, useRef } from 'react';
import type { NotificationItem } from '../types/admin';
import type { AdminApi } from '../services/adminApi';

const POLL_INTERVAL = 30000; // 30 seconds

export interface UseNotificationsReturn {
  unreadCount: number;
  notifications: NotificationItem[];
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(api: AdminApi | null): UseNotificationsReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pollTimerRef = useRef<number | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!api) return;
    try {
      const data = await api.getUnreadNotificationCount();
      setUnreadCount(data.count);
    } catch {
      // silently fail on poll
    }
  }, [api]);

  const fetchRecentNotifications = useCallback(async () => {
    if (!api) return;
    try {
      const data = await api.getRecentNotifications(20);
      setNotifications(data);
    } catch {
      // silently fail on poll
    }
  }, [api]);

  const refresh = useCallback(async () => {
    if (!api) return;
    setRefreshing(true);
    try {
      await Promise.all([fetchUnreadCount(), fetchRecentNotifications()]);
    } finally {
      setRefreshing(false);
    }
  }, [api, fetchUnreadCount, fetchRecentNotifications]);

  // Initial load
  useEffect(() => {
    if (!api) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling
  useEffect(() => {
    if (!api) return;
    pollTimerRef.current = window.setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [api, fetchUnreadCount]);

  const markAsRead = useCallback(async (id: number) => {
    if (!api) return;
    await api.markNotificationAsRead(id);
    setUnreadCount(prev => Math.max(0, prev - 1));
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }, [api]);

  const markAllAsRead = useCallback(async () => {
    if (!api) return;
    await api.markAllNotificationsAsRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, [api]);

  return {
    unreadCount,
    notifications,
    loading,
    refreshing,
    refresh,
    markAsRead,
    markAllAsRead,
  };
}
