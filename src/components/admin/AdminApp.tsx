import { useState, useEffect } from 'react';
import { ConfigProvider } from 'antd';
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

export function AdminApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [adminInfo, setAdminInfo] = useState<AdminLoginResponse | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [api, setApi] = useState<AdminApi | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const savedToken = localStorage.getItem(ADMIN_STORAGE_KEY);
    const savedAdminInfo = localStorage.getItem(ADMIN_INFO_KEY);
    
    if (savedToken && savedAdminInfo) {
      setToken(savedToken);
      setAdminInfo(JSON.parse(savedAdminInfo));
      setIsLoggedIn(true);
    }
  }, []);

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
    localStorage.setItem(ADMIN_STORAGE_KEY, newToken);
    localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(adminLoginResponse));
  };

  const handleLogout = () => {
    setToken(null);
    setAdminInfo(null);
    setIsLoggedIn(false);
    setCurrentPage('dashboard');
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_INFO_KEY);
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
      </ConfigProvider>
    );
}
