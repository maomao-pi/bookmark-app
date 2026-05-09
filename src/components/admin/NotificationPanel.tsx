import { useMemo } from 'react';
import { Badge, Spin, Empty, Button } from 'antd';
import {
  UserAddOutlined,
  BookOutlined,
  FileTextOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { NotificationItem } from '../../types/admin';
import './NotificationPanel.css';

interface NotificationPanelProps {
  notifications: NotificationItem[];
  loading: boolean;
  refreshing: boolean;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: NotificationItem) => void;
  onRefresh: () => void;
}

function getNotificationIcon(type: NotificationItem['type']) {
  switch (type) {
    case 'user_register':
      return <UserAddOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
    case 'new_bookmark':
      return <BookOutlined style={{ color: '#1890ff', fontSize: 16 }} />;
    case 'new_article':
      return <FileTextOutlined style={{ color: '#722ed1', fontSize: 16 }} />;
    case 'system_alert':
      return <AlertOutlined style={{ color: '#faad14', fontSize: 16 }} />;
    default:
      return <FileTextOutlined style={{ color: '#8c8c8c', fontSize: 16 }} />;
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function NotificationPanel({
  notifications,
  loading,
  refreshing,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  onRefresh,
}: NotificationPanelProps) {
  const hasUnread = useMemo(() => notifications.some(n => !n.isRead), [notifications]);
  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  return (
    <div className="notification-panel">
      <div className="notification-header">
        <div className="notification-header-left">
          <span className="notification-title">通知</span>
          {unreadCount > 0 && (
            <Badge count={unreadCount} size="small" style={{ marginLeft: 6 }} />
          )}
        </div>
        <div className="notification-header-right">
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={onRefresh}
            className="notification-refresh-btn"
          />
          {hasUnread && (
            <Button type="link" size="small" onClick={onMarkAllAsRead} className="notification-mark-all-btn">
              全部已读
            </Button>
          )}
        </div>
      </div>

      <div className="notification-body">
        {loading ? (
          <div className="notification-loading">
            <Spin size="small" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知" className="notification-empty" />
        ) : (
          <div className="notification-list">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                onClick={() => onNotificationClick(notification)}
              >
                <div className="notification-item-icon">{getNotificationIcon(notification.type)}</div>
                <div className="notification-item-content">
                  <div className="notification-item-header">
                    <span className="notification-item-title">{notification.title}</span>
                    {!notification.isRead && <span className="notification-unread-dot" />}
                  </div>
                  <div className="notification-item-text">{notification.content}</div>
                  <div className="notification-item-time">
                    <ClockCircleOutlined style={{ fontSize: 10, marginRight: 3 }} />
                    {formatTime(notification.createdAt)}
                  </div>
                </div>
                {!notification.isRead && (
                  <div className="notification-item-action" onClick={e => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}>
                    <CheckCircleOutlined title="标记已读" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
