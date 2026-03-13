import { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface AdminLoginProps {
  onLoginSuccess: (token: string, adminInfo: { username: string; avatar?: string; role: string; permissions?: string[] }) => void;
  baseUrl?: string;
}

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
      message.error('用户名或密码错误');
    } finally {
      setLoading(false);
    }
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

      </Card>
    </div>
  );
}
