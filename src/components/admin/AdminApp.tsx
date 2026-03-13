import { useState, useEffect, useCallback, useRef } from 'react';
import { ConfigProvider, Modal } from 'antd';
import { AdminLayout } from './AdminLayout';
import { AdminLogin } from './AdminLogin';
import { Dashboard } from './Dashboard';
import { UserManagement } from './UserManagement';
import { BookmarkManagement } from './BookmarkManagement';
import { DiscoverManagement } from './DiscoverManagement';
import { CategoryManagement } from './CategoryManagement';
import { ContentManagement } from './ContentManagement';
import { SystemSettings } from './SystemSettings';
import { OperationLogs } from './OperationLogs';
import { AdminManagement } from './AdminManagement';
import { AdminApi } from '../../services/adminApi';
import type { AdminLoginResponse } from '../../types/admin';

const ADMIN_STORAGE_KEY = 'adminToken';
const ADMIN_INFO_KEY = 'adminInfo';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const SESSION_TIMEOUT = 300000;
const WARNING_TIME = 30000;

export function AdminApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [adminInfo, setAdminInfo] = useState<AdminLoginResponse | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [api, setApi] = useState<AdminApi | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  
  const timeoutRef = useRef<number | null>(null);
  const warningRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      window.clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const handleSessionTimeout = useCallback(() => {
    clearTimers();
    setShowTimeoutWarning(false);
    setToken(null);
    setAdminInfo(null);
    setIsLoggedIn(false);
    setCurrentPage('dashboard');
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_INFO_KEY);
    setApi(null);
    Modal.warning({
      title: '登录已过期',
      content: '由于长时间未操作，您已自动退出登录。请重新登录。',
      okText: '确定',
    });
  }, [clearTimers]);

  const resetSessionTimer = useCallback(() => {
    clearTimers();
    lastActivityRef.current = Date.now();
    setShowTimeoutWarning(false);

    warningRef.current = window.setTimeout(() => {
      setShowTimeoutWarning(true);
    }, SESSION_TIMEOUT - WARNING_TIME);

    timeoutRef.current = window.setTimeout(() => {
      handleSessionTimeout();
    }, SESSION_TIMEOUT);
  }, [clearTimers, handleSessionTimeout]);

  useEffect(() => {
    const savedToken = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    const savedAdminInfo = sessionStorage.getItem(ADMIN_INFO_KEY);
    
    if (savedToken && savedAdminInfo) {
      setToken(savedToken);
      setAdminInfo(JSON.parse(savedAdminInfo));
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    resetSessionTimer();

    const handleUserActivity = () => {
      if (isLoggedIn) {
        resetSessionTimer();
      }
    };

    const activityEvents = ['mousedown', 'scroll', 'keydown', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      clearTimers();
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isLoggedIn, resetSessionTimer, clearTimers]);

  useEffect(() => {
    if (token) {
      const adminApi = new AdminApi({ baseUrl: API_BASE_URL, token });
      setApi(adminApi);
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string, adminData: { username: string; avatar?: string; role: string; permissions?: string[] }) => {
    const adminLoginResponse: AdminLoginResponse = {
      token: newToken,
      username: adminData.username,
      avatar: adminData.avatar,
      role: adminData.role as 'super_admin' | 'admin',
      permissions: adminData.permissions,
    };
    setToken(newToken);
    setAdminInfo(adminLoginResponse);
    setPermissions(adminData.permissions || []);
    setIsLoggedIn(true);
    sessionStorage.setItem(ADMIN_STORAGE_KEY, newToken);
    sessionStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(adminLoginResponse));
  };

  const handleLogout = () => {
    clearTimers();
    setShowTimeoutWarning(false);
    setToken(null);
    setAdminInfo(null);
    setIsLoggedIn(false);
    setCurrentPage('dashboard');
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_INFO_KEY);
    setApi(null);
  };

  const handleCollapse = (collapsed: boolean) => {
    setCollapsed(collapsed);
  };

  const renderPage = () => {
    if (!api) return <Dashboard api={null} />;
    
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard api={api} />;
      case 'users':
        return <UserManagement api={api} />;
      case 'bookmarks':
        return <BookmarkManagement api={api} />;
      case 'discover':
        return <DiscoverManagement api={api} />;
      case 'categories':
        return <CategoryManagement api={api} />;
      case 'articles':
        return <ContentManagement api={api} />;
      case 'logs':
        return <OperationLogs api={api} />;
      case 'settings':
        return <SystemSettings api={api} />;
      case 'admins':
        return <AdminManagement api={api} currentAdminRole={adminInfo?.role} />;
      default:
        return <Dashboard api={api} />;
    }
  };

  if (!isLoggedIn) {
    return (
      <ConfigProvider>
        <AdminLogin baseUrl={API_BASE_URL} onLoginSuccess={handleLoginSuccess} />
      </ConfigProvider>
    );
  }

    return (
      <ConfigProvider>
        <AdminLayout
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          adminInfo={adminInfo}
          onLogout={handleLogout}
          collapsed={collapsed}
          onCollapse={handleCollapse}
          permissions={permissions}
          isSuperAdmin={adminInfo?.role === 'super_admin'}
        >
          {renderPage()}
        </AdminLayout>
        <Modal
          open={showTimeoutWarning}
          title="即将自动退出登录"
          okText="保持登录"
          cancelText="立即退出"
          onOk={() => {
            resetSessionTimer();
          }}
          onCancel={() => {
            handleLogout();
          }}
          closable={false}
          maskClosable={false}
        >
          <p>您长时间未操作，即将在30秒后自动退出登录。</p>
          <p>移动鼠标或点击任意位置以保持登录状态。</p>
        </Modal>
      </ConfigProvider>
    );
}
