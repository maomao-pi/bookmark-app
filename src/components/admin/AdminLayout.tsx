import { Layout, Menu, Avatar, Dropdown, theme, type MenuProps, Badge, Tag } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  BookOutlined,
  FolderOutlined,
  FileTextOutlined,
  SettingOutlined,
  AuditOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
} from '@ant-design/icons';
import type { AdminLoginResponse } from '../../types/admin';

const { Header, Sider, Content } = Layout;

export interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  adminInfo: AdminLoginResponse | null;
  onLogout: () => void;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  permissions?: string[];
  isSuperAdmin?: boolean;
  isMockMode?: boolean;
}

interface MenuItemConfig {
  key: string;
  icon: React.ReactNode;
  label: string;
  permission?: string;
}

const allMenuItems: MenuItemConfig[] = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: 'users', icon: <UserOutlined />, label: '用户管理', permission: 'users' },
  { key: 'bookmarks', icon: <BookOutlined />, label: '收藏管理', permission: 'bookmarks' },
  { key: 'discover', icon: <AuditOutlined />, label: '发现管理', permission: 'discover' },
  { key: 'categories', icon: <FolderOutlined />, label: '分类管理', permission: 'categories' },
  { key: 'articles', icon: <FileTextOutlined />, label: '内容管理', permission: 'articles' },
  { key: 'logs', icon: <AuditOutlined />, label: '操作日志', permission: 'logs' },
  { key: 'settings', icon: <SettingOutlined />, label: '系统设置', permission: 'settings' },
  { key: 'admins', icon: <TeamOutlined />, label: '权限管理', permission: 'admins' },
];

function getFilteredMenuItems(permissions: string[], isSuperAdmin: boolean) {
  const items: MenuProps['items'] = [];
  
  if (isSuperAdmin) {
    allMenuItems.forEach(item => {
      items.push({ key: item.key, icon: item.icon, label: item.label });
    });
  } else {
    allMenuItems.forEach(item => {
      if (!item.permission || permissions.includes(item.permission)) {
        items.push({ key: item.key, icon: item.icon, label: item.label });
      }
    });
  }
  
  return items;
}

const userMenuItems: MenuProps['items'] = [
  {
    key: 'profile',
    icon: <UserOutlined />,
    label: '个人资料',
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '个人设置',
  },
  {
    type: 'divider',
  },
  {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: '退出登录',
    danger: true,
  },
];

export function AdminLayout({
  children,
  currentPage,
  onNavigate,
  adminInfo,
  onLogout,
  collapsed,
  onCollapse,
  permissions = [],
  isSuperAdmin = false,
  isMockMode,
}: AdminLayoutProps) {
  const { token } = theme.useToken();

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    onNavigate(key);
  };

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      onLogout();
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={200}
        collapsedWidth={80}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            padding: '0 16px',
          }}
        >
          <img
            src={collapsed ? '/logo3.png' : '/logo.png'}
            alt="知链方舟"
            style={{
              height: collapsed ? 32 : 28,
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentPage]}
          onClick={handleMenuClick}
          items={getFilteredMenuItems(permissions, isSuperAdmin)}
          style={{
            background: 'transparent',
            borderRight: 0,
          }}
        />
      </Sider>
      <Layout
        style={{
          marginLeft: collapsed ? 80 : 200,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Header
          style={{
            position: 'fixed',
            top: 0,
            left: collapsed ? 80 : 200,
            right: 0,
            height: 64,
            zIndex: 99,
            padding: '0 16px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              onClick={() => onCollapse(!collapsed)}
              style={{
                fontSize: 18,
                cursor: 'pointer',
                padding: '0 8px',
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Badge count={5} size="small">
              <div
                style={{
                  fontSize: 18,
                  cursor: 'pointer',
                  padding: '0 8px',
                }}
              >
                <BellOutlined />
              </div>
            </Badge>
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '0 8px',
                }}
              >
                <Avatar
                  size={32}
                  src={adminInfo?.avatar}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: token.colorPrimary }}
                />
                <span style={{ fontWeight: 500 }}>
                  {adminInfo?.username || '管理员'}
                </span>
                {isMockMode && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>模拟</Tag>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            flex: 1,
            overflow: 'auto',
            margin: 24,
            marginTop: 88,
            padding: 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 0,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
