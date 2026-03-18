import { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Checkbox, message, ConfigProvider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, MobileOutlined } from '@ant-design/icons';
import { userApi } from '../services/userApi';
import './LoginPage.css';

const REMEMBER_KEY = 'bookmark_app_remember_login';

/* ---- 粒子背景 ---- */
interface Particle { x: number; y: number; vx: number; vy: number; r: number; alpha: number; }

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const COUNT = 70;
    const MAX_DIST = 120;
    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2 + 1, alpha: Math.random() * 0.35 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(37,99,235,${(1 - dist / MAX_DIST) * 0.15})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(37,99,235,${p.alpha})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="lp-particle-canvas" />;
}

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'register' ? 'register' : 'login';
  });
  const [loading, setLoading] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (raw) {
        const { username, password } = JSON.parse(raw);
        loginForm.setFieldsValue({ username, password, remember: true });
      }
    } catch { /* ignore */ }
  }, [loginForm]);

  const handleLoginSuccess = () => {
    message.success('登录成功');
    if (window.opener) {
      window.opener.location.reload();
      window.close();
    } else {
      window.location.href = '/';
    }
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
      const session = {
        id: String(result.user.id),
        username: result.user.username,
        email: result.user.email,
        avatar: result.user.avatar,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('userInfo', JSON.stringify(session));
      message.success('注册成功，欢迎加入！');
      if (window.opener) {
        window.opener.location.reload();
        window.close();
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
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
      <div className="lp-page">
        <ParticleCanvas />

        <div className="lp-card">
          {/* 顶部 logo + 切换 */}
          <div className="lp-header">
            <img src="/logo3.png" alt="Mimori" className="lp-logo" />
            <h1 className="lp-title">Mimori</h1>
            <p className="lp-subtitle">智能收藏，触手可及</p>
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

          <p className="lp-footer">© 2025 Mimori · 智能收藏管理平台</p>
        </div>
      </div>
    </ConfigProvider>
  );
}
