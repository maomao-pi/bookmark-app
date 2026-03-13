import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import type { AdminLoginResponse } from '../../types/admin';

const { Title, Text } = Typography;

interface AdminLoginProps {
  onLoginSuccess: (token: string, adminInfo: { username: string; avatar?: string; role: string; permissions?: string[] }, mockMode?: boolean) => void;
  baseUrl?: string;
}

const MOCK_ADMIN: AdminLoginResponse = {
  token: 'mock-token-' + Date.now(),
  username: 'admin',
  role: 'super_admin',
  permissions: ['dashboard', 'users', 'bookmarks', 'discover', 'categories', 'articles', 'logs', 'settings', 'admins'],
};

export function AdminLogin({ onLoginSuccess, baseUrl = 'http://localhost:8080' }: AdminLoginProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: { username: string, password: string }) => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('登录失败');
      }

      const json = await response.json();
      if (json.code !== 200) {
        throw new Error(json.message || '登录失败');
      }

      message.success('登录成功');
      const permissions = json.data.permissions ? JSON.parse(json.data.permissions) : [];
      onLoginSuccess(json.data.token, {
        username: json.data.username,
        avatar: json.data.avatar,
        role: json.data.role,
        permissions,
      });
    } catch (error) {
      message.error('无法连接到后端服务，是否使用模拟登录？');
    } finally {
      setLoading(false);
    }
  };

  const handleMockLogin = () => {
    message.success('模拟登录成功');
    onLoginSuccess(MOCK_ADMIN.token, {
      username: MOCK_ADMIN.username,
      avatar: MOCK_ADMIN.avatar,
      role: MOCK_ADMIN.role,
      permissions: MOCK_ADMIN.permissions,
    }, true);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 16,
            }}
          >
            <SafetyOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={3} style={{ marginBottom: 8 }}>
            知链方舟 Admin
          </Title>
          <Text type="secondary">管理后台登录</Text>
        </div>

        <Form
          name="adminLogin"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ marginTop: 8 }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button type="link" onClick={handleMockLogin}>
            使用模拟数据登录（无需后端）
          </Button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            默认账号: admin / admin123
          </Text>
        </div>
      </Card>
    </div>
  );
}
