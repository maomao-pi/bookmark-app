import { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import './AdminLogin.css';

interface AdminLoginProps {
  onLoginSuccess: (token: string, adminInfo: { username: string; avatar?: string; role: string; permissions?: string[] }) => void;
  baseUrl?: string;
}

/* ---- 粒子画布 ---- */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const COUNT = 80;
    const MAX_DIST = 120;
    let raf: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2 + 1,
      alpha: Math.random() * 0.4 + 0.15,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 连线
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(37,99,235,${(1 - dist / MAX_DIST) * 0.18})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // 粒子
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(37,99,235,${p.alpha})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      });

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}

function BrandIllustration() {
  return (
    <svg viewBox="0 0 420 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="brand-illustration">
      {/* 背景卡片 */}
      <rect x="30" y="60" width="360" height="240" rx="20" fill="rgba(255,255,255,0.10)" />

      {/* 顶栏 */}
      <rect x="30" y="60" width="360" height="44" rx="20" fill="rgba(255,255,255,0.18)" />
      <circle cx="62" cy="82" r="7" fill="rgba(255,255,255,0.5)" />
      <circle cx="86" cy="82" r="7" fill="rgba(255,255,255,0.5)" />
      <circle cx="110" cy="82" r="7" fill="rgba(255,255,255,0.5)" />
      <rect x="140" y="76" width="120" height="12" rx="6" fill="rgba(255,255,255,0.3)" />

      {/* 左侧菜单栏 */}
      <rect x="30" y="104" width="80" height="196" rx="0" fill="rgba(255,255,255,0.06)" />
      <rect x="42" y="120" width="56" height="10" rx="5" fill="rgba(255,255,255,0.35)" />
      <rect x="42" y="142" width="40" height="10" rx="5" fill="rgba(255,255,255,0.2)" />
      <rect x="42" y="162" width="48" height="10" rx="5" fill="rgba(255,255,255,0.2)" />
      <rect x="42" y="182" width="44" height="10" rx="5" fill="rgba(255,255,255,0.2)" />
      <rect x="42" y="202" width="52" height="10" rx="5" fill="rgba(255,255,255,0.2)" />
      <rect x="42" y="222" width="36" height="10" rx="5" fill="rgba(255,255,255,0.2)" />

      {/* 内容区：统计卡片行 */}
      <rect x="126" y="116" width="70" height="48" rx="8" fill="rgba(255,255,255,0.18)" />
      <rect x="134" y="124" width="32" height="8" rx="4" fill="rgba(255,255,255,0.5)" />
      <rect x="134" y="138" width="48" height="16" rx="4" fill="rgba(255,255,255,0.7)" />

      <rect x="206" y="116" width="70" height="48" rx="8" fill="rgba(255,255,255,0.18)" />
      <rect x="214" y="124" width="32" height="8" rx="4" fill="rgba(255,255,255,0.5)" />
      <rect x="214" y="138" width="48" height="16" rx="4" fill="rgba(255,255,255,0.7)" />

      <rect x="286" y="116" width="90" height="48" rx="8" fill="rgba(255,255,255,0.18)" />
      <rect x="294" y="124" width="32" height="8" rx="4" fill="rgba(255,255,255,0.5)" />
      <rect x="294" y="138" width="60" height="16" rx="4" fill="rgba(255,255,255,0.7)" />

      {/* 图表区 */}
      <rect x="126" y="176" width="250" height="108" rx="8" fill="rgba(255,255,255,0.12)" />
      <rect x="140" y="188" width="80" height="8" rx="4" fill="rgba(255,255,255,0.4)" />
      {/* 柱状图 */}
      <rect x="148" y="246" width="16" height="30" rx="4" fill="rgba(255,255,255,0.5)" />
      <rect x="172" y="234" width="16" height="42" rx="4" fill="rgba(255,255,255,0.7)" />
      <rect x="196" y="224" width="16" height="52" rx="4" fill="rgba(255,255,255,0.9)" />
      <rect x="220" y="238" width="16" height="38" rx="4" fill="rgba(255,255,255,0.6)" />
      <rect x="244" y="228" width="16" height="48" rx="4" fill="rgba(255,255,255,0.75)" />
      <rect x="268" y="218" width="16" height="58" rx="4" fill="rgba(255,255,255,0.9)" />
      <rect x="292" y="232" width="16" height="44" rx="4" fill="rgba(255,255,255,0.6)" />
      <rect x="316" y="222" width="16" height="54" rx="4" fill="rgba(255,255,255,0.8)" />

      {/* 底部装饰点 */}
      <circle cx="80" cy="320" r="30" fill="rgba(255,255,255,0.06)" />
      <circle cx="340" cy="30" r="22" fill="rgba(255,255,255,0.07)" />
    </svg>
  );
}

export function AdminLogin({ onLoginSuccess, baseUrl = 'http://localhost:8080' }: AdminLoginProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('登录失败');

      const json = await response.json();
      if (json.code !== 200) throw new Error(json.message || '登录失败');

      message.success('登录成功');
      const permissions = json.data.permissions ? JSON.parse(json.data.permissions) : [];
      onLoginSuccess(json.data.token, {
        username: json.data.username,
        avatar: json.data.avatar,
        role: json.data.role,
        permissions,
      });
    } catch {
      message.error('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <ParticleCanvas />
      <div className="admin-login-container">

        {/* 左侧品牌区 */}
        <div className="admin-login-brand">
          <div className="brand-text-block">
            <h1 className="brand-title">Mimori</h1>
            <p className="brand-subtitle">智能收藏，触手可及</p>
          </div>
          <BrandIllustration />
          <div className="brand-tag-row">
            <span className="brand-tag">数据管理</span>
            <span className="brand-tag">权限控制</span>
            <span className="brand-tag">系统监控</span>
          </div>
        </div>

        {/* 右侧登录卡片 */}
        <div className="admin-login-card">
          <div className="login-card-header">
            <div className="login-icon-wrap">
              <img src="/logo3.png" alt="logo" className="login-icon-img" />
            </div>
            <h2 className="login-card-title">管理后台</h2>
            <p className="login-card-desc">使用管理员账号登录系统</p>
          </div>

          <Form
            name="adminLogin"
            onFinish={handleSubmit}
            autoComplete="off"
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入管理员用户名"
                size="large"
                className="login-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入登录密码"
                size="large"
                className="login-input"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="login-submit-btn"
              >
                {loading ? '登录中...' : '登 录'}
              </Button>
            </Form.Item>
          </Form>

          <p className="login-footer-tip">© 2025 Mimori · Admin Panel</p>
        </div>

      </div>
    </div>
  );
}
