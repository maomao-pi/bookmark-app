import { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, message, Modal } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import './AuthModal.css';

const REMEMBER_KEY = 'bookmark_app_remember_login';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export function AuthModal({ open, onClose, onLoginSuccess }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [form] = Form.useForm();
  const { isDark } = useTheme();
  const { login, register } = useAuth();

  useEffect(() => {
    if (open) {
      try {
        const raw = localStorage.getItem(REMEMBER_KEY);
        if (raw) {
          const { username, password } = JSON.parse(raw);
          form.setFieldsValue({ username: username || '', password: password || '', remember: true });
        } else {
          form.setFieldsValue({ remember: false });
        }
      } catch {
        form.setFieldsValue({ remember: false });
      }
    }
  }, [open, form]);

  const handleLogin = async (values: { username: string; password: string; remember?: boolean }) => {
    setIsLoading(true);
    
    const result = await login(values.username, values.password);
    setIsLoading(false);
    
    if (result.success) {
      if (values.remember) {
        try {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username: values.username, password: values.password }));
        } catch {
          // ignore
        }
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      message.success(result.message);
      onLoginSuccess();
      form.resetFields();
    } else {
      message.error(result.message);
    }
  };

  const handleRegister = async (values: { username: string; email: string; password: string }) => {
    setIsLoading(true);
    
    const result = await register(values.username, values.email, values.password);
    setIsLoading(false);
    
    if (result.success) {
      message.success(result.message);
      onLoginSuccess();
      form.resetFields();
      setIsRegisterMode(false);
    } else {
      message.error(result.message);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      centered
      width={400}
      className="auth-modal"
      destroyOnClose
      closable={true}
      maskStyle={{
        backgroundColor: 'rgba(148, 163, 184, 0.18)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(14px)'
      }}
    >
      <div className="auth-form-container">
        <img 
          src={isDark ? "/logo2.png" : "/logo.png"} 
          alt="Logo" 
          className="auth-logo" 
        />
        
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Button type="link" onClick={() => setIsRegisterMode(!isRegisterMode)}>
            {isRegisterMode ? '已有账号？立即登录' : '没有账号？立即注册'}
          </Button>
        </div>

        {isRegisterMode ? (
          <Form
            form={form}
            name="register"
            onFinish={handleRegister}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="用户名" />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="邮箱" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6位' }
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={isLoading}>
                注册
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="用户名" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>记住密码</Checkbox>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={isLoading}>
                登录
              </Button>
            </Form.Item>
          </Form>
        )}
      </div>
    </Modal>
  );
}
