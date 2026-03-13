import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Spin, Empty, Table, Tag, Avatar } from 'antd';
import {
  UserOutlined,
  BookOutlined,
  FolderOutlined,
  RiseOutlined,
  FireOutlined,
  TeamOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from 'recharts';
import { AdminApi } from '../../services/adminApi';

const { Title, Text } = Typography;

interface DashboardProps {
  api: AdminApi | null;
}

interface OverviewStats {
  totalUsers: number;
  todayLoginUsers: number;
  totalBookmarks: number;
  totalCategories: number;
  totalArticles: number;
  todayUsers: number;
  todayBookmarks: number;
}


const statCards = [
  { key: 'totalUsers', label: '用户总数', icon: <TeamOutlined /> },
  { key: 'totalBookmarks', label: '收藏总数', icon: <BookOutlined /> },
  { key: 'totalCategories', label: '分类总数', icon: <FolderOutlined /> },
];

const todayCards = [
  {
    key: 'todayUsers',
    label: '今日新增用户',
    icon: <UserOutlined />,
    color: '#667eea',
    bg: 'rgba(102,126,234,0.08)',
  },
  {
    key: 'todayLoginUsers',
    label: '今日登录用户',
    icon: <FireOutlined />,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
  },
  {
    key: 'todayBookmarks',
    label: '今日新增收藏',
    icon: <BookOutlined />,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
  },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

function CustomLineTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '10px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      }}>
        <p style={{ margin: 0, color: '#888', fontSize: 12 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ margin: '4px 0 0', color: p.color, fontWeight: 600, fontSize: 14 }}>
            {p.name}：{p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function CustomBarTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '10px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      }}>
        <p style={{ margin: 0, color: '#888', fontSize: 12 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ margin: '4px 0 0', color: '#3B82F6', fontWeight: 600, fontSize: 14 }}>
            收藏数：{p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function Dashboard({ api }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats>({
    totalUsers: 0,
    todayLoginUsers: 0,
    totalBookmarks: 0,
    totalCategories: 0,
    totalArticles: 0,
    todayUsers: 0,
    todayBookmarks: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [bookmarkStats, setBookmarkStats] = useState<any>(null);

  useEffect(() => {
    if (api) loadStats();
  }, [api]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api!.getOverviewStats();
      setStats(data);
      const userData = await api!.getUsers({ pageNum: 1, pageSize: 5 });
      setRecentUsers(userData.records);
      const statsData = await api!.getUserStats();
      setUserStats(statsData);
      const bookmarkData = await api!.getBookmarkStats();
      setBookmarkStats(bookmarkData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeUsers = userStats?.status?.active || 0;
  const disabledUsers = userStats?.status?.disabled || 0;
  const totalUsersCount = activeUsers + disabledUsers;

  const recentGrowth = userStats?.recentGrowth || {};
  const userGrowthData = Object.entries(recentGrowth).map(([date, count]) => ({
    date: date.slice(5),
    新增用户: count as number,
  }));

  const categoryDistribution = bookmarkStats?.categoryDistribution || {};
  const categoryData = Object.entries(categoryDistribution)
    .map(([name, value]) => ({
      name: name.length > 6 ? name.slice(0, 6) + '…' : name,
      收藏数: value as number,
    }))
    .sort((a, b) => b['收藏数'] - a['收藏数'])
    .slice(0, 8);

  const userStatusData = [
    { name: '活跃用户', value: activeUsers },
    { name: '已禁用', value: disabledUsers },
  ];

  const userColumns = [
    {
      title: '用户',
      key: 'user',
      render: (_: unknown, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={32}
            icon={<UserOutlined />}
            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{record.username}</div>
            <div style={{ color: '#aaa', fontSize: 12 }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: '收藏数',
      dataIndex: 'bookmarkCount',
      key: 'bookmarkCount',
      render: (count: number) => (
        <span style={{
          background: 'rgba(59,130,246,0.1)',
          color: '#3B82F6',
          borderRadius: 20,
          padding: '2px 10px',
          fontWeight: 600,
          fontSize: 12,
        }}>
          {count || 0}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag
          color={status === 'active' ? 'success' : 'error'}
          style={{ borderRadius: 20, padding: '0 10px', border: 'none' }}
        >
          {status === 'active' ? '正常' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <span style={{ color: '#aaa', fontSize: 12 }}>
          <CalendarOutlined style={{ marginRight: 4 }} />
          {date ? date.slice(0, 10) : '-'}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>数据概览</Title>
        <Text style={{ color: '#aaa', fontSize: 13 }}>实时监控平台各项核心指标</Text>
      </div>

      {/* 顶部统计卡片 */}
      <Row gutter={[16, 16]}>
        {statCards.map(card => (
          <Col xs={24} sm={8} lg={8} key={card.key}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
              styles={{ body: { padding: '16px 20px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#999', fontSize: 12, marginBottom: 6 }}>{card.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#222' }}>
                    {(stats[card.key as keyof OverviewStats] || 0).toLocaleString()}
                  </div>
                </div>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(59,130,246,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: '#3B82F6',
                }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, color: '#999', fontSize: 12 }}>
                <RiseOutlined />
                <span>累计数据</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 今日数据小卡片 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {todayCards.map(card => (
          <Col xs={24} sm={8} key={card.key}>
            <Card
              bordered={false}
              style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
              styles={{ body: { padding: '16px 20px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#999', fontSize: 12, marginBottom: 6 }}>{card.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#222' }}>
                    {stats[card.key as keyof OverviewStats] || 0}
                  </div>
                </div>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: card.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: card.color,
                }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, color: '#10B981', fontSize: 12 }}>
                <RiseOutlined />
                <span>今日实时数据</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表区 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 用户增长趋势 */}
        <Col xs={24} lg={14}>
          <Card
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 4, height: 16, background: 'linear-gradient(#667eea,#764ba2)', borderRadius: 4 }} />
                <span style={{ fontWeight: 600 }}>用户增长趋势（近7天）</span>
              </div>
            }
          >
            {userGrowthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={userGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="新增用户"
                    stroke="#667eea"
                    strokeWidth={3}
                    fill="url(#colorUsers)"
                    dot={{ fill: '#667eea', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, stroke: '#667eea', strokeWidth: 2, fill: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无数据" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>

        {/* 用户状态饼图 */}
        <Col xs={24} lg={10}>
          <Card
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 4, height: 16, background: 'linear-gradient(#11998e,#38ef7d)', borderRadius: 4 }} />
                <span style={{ fontWeight: 600 }}>用户状态分布</span>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={userStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {userStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#667eea' : '#f093fb'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* 图例 */}
              <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
                {userStatusData.map((item, index) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: index === 0 ? '#667eea' : '#f093fb',
                    }} />
                    <span style={{ fontSize: 12, color: '#666' }}>{item.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>{item.value}</span>
                    <span style={{ fontSize: 11, color: '#aaa' }}>
                      ({totalUsersCount > 0 ? ((item.value / totalUsersCount) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 分类收藏分布 + 最近用户 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 4, height: 16, background: 'linear-gradient(#4facfe,#00f2fe)', borderRadius: 4 }} />
                <span style={{ fontWeight: 600 }}>分类收藏分布（Top 8）</span>
              </div>
            }
          >
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#4facfe" />
                      <stop offset="100%" stopColor="#00f2fe" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#666' }} width={72} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="收藏数" fill="url(#barGrad)" radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无收藏数据" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>

        {/* 最近注册用户 */}
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 4, height: 16, background: 'linear-gradient(#f093fb,#f5576c)', borderRadius: 4 }} />
                <span style={{ fontWeight: 600 }}>最近注册用户</span>
              </div>
            }
          >
            {recentUsers.length > 0 ? (
              <Table
                columns={userColumns}
                dataSource={recentUsers}
                rowKey="id"
                pagination={false}
                size="small"
                style={{ marginTop: -8 }}
                rowClassName={() => 'dashboard-user-row'}
              />
            ) : (
              <Empty description="暂无数据" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
