import { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, Button, Checkbox, Tabs, Divider, message, ConfigProvider, Tooltip } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, MobileOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { userApi } from '../services/userApi';
import './LoginPage.css';

const REMEMBER_KEY = 'bookmark_app_remember_login';

export interface AuthModalProps {
  open: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: () => void;
}

type LoginTab = 'username' | 'email-password' | 'email-code';

export function AuthModal({ open, initialMode = 'login', onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loginTab, setLoginTab] = useState<LoginTab>('username');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loginForm] = Form.useForm();
  const [emailPasswordForm] = Form.useForm();
  const [emailCodeForm] = Form.useForm();
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

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const saveSession = (user: { id: number | string; username: string; email: string; avatar?: string; nickname?: string }) => {
    const session = {
      id: String(user.id),
      username: user.username,
      email: user.email,
      avatar: user.avatar || null,
      nickname: user.nickname || null,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('userInfo', JSON.stringify(session));
  };

  const onLoginOk = () => {
    message.success('登录成功');
    onSuccess();
    onClose();
  };

  const handleUsernameLogin = async (values: { username: string; password: string; remember?: boolean }) => {
    setLoading(true);
    try {
      const result = await userApi.login({ username: values.username, password: values.password });
      saveSession(result.user);
      if (values.remember) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username: values.username, password: values.password }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      onLoginOk();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await userApi.loginByEmail(values.email, values.password);
      saveSession(result.user);
      onLoginOk();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '邮箱或密码错误');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailCodeLogin = async (values: { email: string; code: string }) => {
    setLoading(true);
    try {
      const result = await userApi.loginByEmailCode(values.email, values.code);
      saveSession(result.user);
      onLoginOk();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '验证码错误或已过期');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: { username: string; email: string; password: string; nickname: string; phone: string }) => {
    setLoading(true);
    try {
      const result = await userApi.register({
        username: values.username,
        email: values.email,
        password: values.password,
        nickname: values.nickname,
        phone: values.phone,
      });
      saveSession(result.user);
      message.success('注册成功，欢迎加入！');
      onSuccess();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (formInstance: ReturnType<typeof Form.useForm>[0], field = 'email') => {
    try {
      await formInstance.validateFields([field]);
    } catch {
      return;
    }
    const email = formInstance.getFieldValue(field) as string;
    setSendingCode(true);
    try {
      await userApi.sendVerificationCode(email, 'login');
      message.success('验证码已发送，请查收邮件');
      setCodeCooldown(60);
      cooldownRef.current = setInterval(() => {
        setCodeCooldown(prev => {
          if (prev <= 1) {
            clearInterval(cooldownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '发送失败，请稍后重试');
    } finally {
      setSendingCode(false);
    }
  };

  const loginTabItems = [
    {
      key: 'username',
      label: '用户名',
      children: (
        <Form form={loginForm} onFinish={handleUsernameLogin} layout="vertical" requiredMark={false}>
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
      ),
    },
    {
      key: 'email-password',
      label: '邮箱密码',
      children: (
        <Form form={emailPasswordForm} onFinish={handleEmailPasswordLogin} layout="vertical" requiredMark={false}>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱' }]}>
            <Input prefix={<MailOutlined />} placeholder="请输入邮箱地址" size="large" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
          </Form.Item>
          <Form.Item style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={loading} className="lp-submit-btn">
              登 录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'email-code',
      label: '验证码',
      children: (
        <Form form={emailCodeForm} onFinish={handleEmailCodeLogin} layout="vertical" requiredMark={false}>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱' }]}>
            <Input prefix={<MailOutlined />} placeholder="请输入邮箱地址" size="large" />
          </Form.Item>
          <Form.Item name="code" label="验证码" rules={[{ required: true, message: '请输入验证码' }]}>
            <Input
              prefix={<SafetyCertificateOutlined />}
              placeholder="6位验证码"
              size="large"
              suffix={
                <Button
                  type="link"
                  size="small"
                  disabled={codeCooldown > 0 || sendingCode}
                  onClick={() => handleSendCode(emailCodeForm)}
                  style={{ padding: '0 4px', fontSize: 12 }}
                >
                  {codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码'}
                </Button>
              }
            />
          </Form.Item>
          <Form.Item style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={loading} className="lp-submit-btn">
              登 录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

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
            Tabs: { itemActiveColor: '#2563eb', inkBarColor: '#2563eb' },
          },
        }}
      >
        <div className="lp-modal-wrap" style={{ background: '#fff' }}>
          <div className="lp-card" style={{ boxShadow: 'none', borderRadius: 0, maxWidth: '100%', background: '#fff' }}>
            {/* 顶部 logo + 文案：左右布局 */}
            <div
              className="lp-header"
              style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <img
                src="/logo3.png"
                alt="Linkbox"
                className="lp-logo"
                style={{ background: 'transparent', boxShadow: 'none', padding: 0, borderRadius: 0, marginBottom: 0 }}
              />
              <div>
                <h1 className="lp-title" style={{ marginBottom: 2, textAlign: 'left' }}>Linkbox</h1>
                <p className="lp-subtitle" style={{ textAlign: 'left' }}>智能收藏，触手可及</p>
              </div>
            </div>

            {/* 登录/注册切换 */}
            <div className="lp-tabs">
              <button className={`lp-tab${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')}>
                登录
              </button>
              <button className={`lp-tab${mode === 'register' ? ' active' : ''}`} onClick={() => setMode('register')}>
                注册
              </button>
            </div>

            {/* 登录 */}
            {mode === 'login' && (
              <>
                <Tabs
                  activeKey={loginTab}
                  onChange={k => setLoginTab(k as LoginTab)}
                  size="small"
                  style={{ marginBottom: 4 }}
                  items={loginTabItems}
                />
                <Divider style={{ margin: '8px 0', fontSize: 12, color: '#94a3b8' }}>或通过第三方登录</Divider>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 8 }}>
                  <Tooltip title="微信登录（敬请期待）">
                    <Button
                      shape="circle"
                      size="large"
                      style={{ background: '#07c160', border: 'none', color: '#fff', fontSize: 18 }}
                      disabled
                    >
                      <span style={{ fontWeight: 700, fontSize: 14 }}>W</span>
                    </Button>
                  </Tooltip>
                  <Tooltip title="QQ 登录（敬请期待）">
                    <Button
                      shape="circle"
                      size="large"
                      style={{ background: '#1aabee', border: 'none', color: '#fff', fontSize: 18 }}
                      disabled
                    >
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Q</span>
                    </Button>
                  </Tooltip>
                </div>
              </>
            )}

            {/* 注册表单 */}
            {mode === 'register' && (
              <Form form={registerForm} onFinish={handleRegister} layout="vertical" requiredMark={false}>
                <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                  <Input prefix={<UserOutlined />} placeholder="请输入用户名" size="large" />
                </Form.Item>
                <Form.Item
                  name="nickname"
                  label="姓名"
                  rules={[{ required: true, message: '请输入姓名' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="请输入姓名" size="large" />
                </Form.Item>
                <Form.Item
                  name="email"
                  label="邮箱"
                  rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱' }]}
                >
                  <Input prefix={<MailOutlined />} placeholder="请输入邮箱地址" size="large" />
                </Form.Item>
                <Form.Item
                  name="phone"
                  label="手机号"
                  rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '请输入有效手机号' }]}
                >
                  <Input prefix={<MobileOutlined />} placeholder="请输入手机号" size="large" />
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

            <p className="lp-footer">© 2025 Linkbox · 智能收藏管理平台</p>
          </div>
        </div>
      </ConfigProvider>
    </Modal>
  );
}
