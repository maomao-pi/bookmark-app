import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Checkbox, message, ConfigProvider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { userApi } from '../services/userApi';
import './LoginPage.css';

const REMEMBER_KEY = 'bookmark_app_remember_login';

export interface AuthModalProps {
  open: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ open, initialMode = 'login', onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      try {
        const raw = localStorage.getItem(REMEMBER_KEY);
        if (raw) {
          const { username, password } = JSON.parse(raw);
          loginForm.setFieldsValue({ username, password, remember: true });
        }
      } catch { /* ignore */ }
    }
  }, [open, initialMode, loginForm]);

  const handleLoginSuccess = () => {
    message.success('登录成功');
    onSuccess();
    onClose();
  };

  const handleLogin = async (values: { username: string; password: string; remember?: boolean }) => {
    setLoading(true);
    try {
      const result = await userApi.login({ username: values.username, password: values.password });
      const session = {
        id: String(result.user.id),
        username: result.user.username,
        email: result.user.email,
        avatar: result.user.avatar,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('userInfo', JSON.stringify(session));
      if (values.remember) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username: values.username, password: values.password }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      handleLoginSuccess();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: { username: string; email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await userApi.register({ username: values.username, email: values.email, password: values.password });
      const session = {
        id: String(result.user.id),
        username: result.user.username,
        email: result.user.email,
        avatar: result.user.avatar,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('userInfo', JSON.stringify(session));
      message.success('注册成功，欢迎加入！');
      onSuccess();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={460}
      centered
      destroyOnClose
      styles={{
        content: { padding: 0, borderRadius: 16, overflow: 'hidden', boxShadow: 'none' },
        mask: {
          backgroundColor: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(12px)',
        },
      }}
      closeIcon={
        <span style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1 }}>×</span>
      }
    >
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#2563eb',
            borderRadius: 8,
            fontFamily: "'Outfit', sans-serif",
          },
          components: {
            Button: { borderRadius: 20 },
          },
        }}
      >
        <div className="lp-modal-wrap" style={{ background: '#fff' }}>
          <div className="lp-card" style={{ boxShadow: 'none', borderRadius: 0, maxWidth: '100%', background: '#fff' }}>
            {/* 顶部 logo + 文案：左右布局 */}
            <div
              className="lp-header"
              style={{
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <img
                src="/logo3.png"
                alt="Mimori"
                className="lp-logo"
                style={{
                  background: 'transparent',
                  boxShadow: 'none',
                  padding: 0,
                  borderRadius: 0,
                  marginBottom: 0,
                }}
              />
              <div>
                <h1 className="lp-title" style={{ marginBottom: 2, textAlign: 'left' }}>
                  Mimori
                </h1>
                <p className="lp-subtitle" style={{ textAlign: 'left' }}>
                  智能收藏，触手可及
                </p>
              </div>
            </div>

            {/* Tab 切换 */}
            <div className="lp-tabs">
              <button
                className={`lp-tab${mode === 'login' ? ' active' : ''}`}
                onClick={() => setMode('login')}
              >
                登录
              </button>
              <button
                className={`lp-tab${mode === 'register' ? ' active' : ''}`}
                onClick={() => setMode('register')}
              >
                注册
              </button>
            </div>

            {/* 登录表单 */}
            {mode === 'login' && (
              <Form form={loginForm} onFinish={handleLogin} layout="vertical" requiredMark={false}>
                <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                  <Input prefix={<UserOutlined />} placeholder="请输入用户名" size="large" />
                </Form.Item>
                <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
                </Form.Item>
                <div className="lp-row">
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>记住密码</Checkbox>
                  </Form.Item>
                </div>
                <Form.Item style={{ marginTop: 16 }}>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading} className="lp-submit-btn">
                    登 录
                  </Button>
                </Form.Item>
              </Form>
            )}

            {/* 注册表单 */}
            {mode === 'register' && (
              <Form form={registerForm} onFinish={handleRegister} layout="vertical" requiredMark={false}>
                <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                  <Input prefix={<UserOutlined />} placeholder="请输入用户名" size="large" />
                </Form.Item>
                <Form.Item
                  name="email"
                  label="邮箱"
                  rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱' }]}
                >
                  <Input prefix={<MailOutlined />} placeholder="请输入邮箱地址" size="large" />
                </Form.Item>
                <Form.Item
                  name="password"
                  label="密码"
                  rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="至少 6 位" size="large" />
                </Form.Item>
                <Form.Item style={{ marginTop: 16 }}>
                  <Button type="primary" htmlType="submit" block size="large" loading={loading} className="lp-submit-btn">
                    立即注册
                  </Button>
                </Form.Item>
              </Form>
            )}

            <p className="lp-footer">© 2025 Mimori · 智能收藏管理平台</p>
          </div>
        </div>
      </ConfigProvider>
    </Modal>
  );
}
