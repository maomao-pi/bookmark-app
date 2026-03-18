import { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Tag, Empty, Spin, Button, Alert } from 'antd';
import {
  BookOutlined, TagsOutlined, AppstoreOutlined, TrophyOutlined, ReloadOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line,
  ResponsiveContainer,
} from 'recharts';
import { userApi } from '../services/userApi';
import type { Category } from '../types';
import './BookmarkStats.css';

const PIE_COLORS = ['#2563eb', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

type TooltipFormatter = (value: unknown) => [string, string];

interface Props {
  categories: Category[];
}

export function BookmarkStats({ categories }: Props) {
  const [stats, setStats] = useState<{
    total: number;
    categoryDistribution: Record<string, number>;
    tagFrequency: Record<string, number>;
    recentTrend: { date: string; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getBookmarkStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const categoryPieData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.categoryDistribution).map(([catId, count]) => {
      const cat = categories.find(c => String(c.id) === String(catId));
      return { name: cat?.name || '未分类', value: Number(count) };
    });
  }, [stats, categories]);

  const tagBarData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.tagFrequency)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count: Number(count) }));
  }, [stats]);

  if (loading) {
    return (
      <div className="stats-loading">
        <Spin size="large" />
        <p>正在加载统计数据…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-error">
        <Alert type="error" message={error} showIcon />
        <Button onClick={loadStats} icon={<ReloadOutlined />} style={{ marginTop: 12 }}>
          重试
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  const uncategorized = stats.total - Object.values(stats.categoryDistribution).reduce((a, b) => a + Number(b), 0);

  return (
    <div className="stats-container">
      {/* 顶部汇总卡片 */}
      <Row gutter={[16, 16]} className="stats-summary">
        <Col xs={12} sm={6}>
          <Card className="stats-card stats-card-blue">
            <Statistic title="收藏总数" value={stats.total} prefix={<BookOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stats-card stats-card-purple">
            <Statistic title="已分类" value={stats.total - uncategorized} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stats-card stats-card-teal">
            <Statistic title="未分类" value={uncategorized} prefix={<TagsOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stats-card stats-card-amber">
            <Statistic title="标签种类" value={Object.keys(stats.tagFrequency).length} prefix={<TrophyOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 近7天趋势 */}
        <Col xs={24} lg={14}>
          <Card title="近7天收藏趋势" className="stats-chart-card">
            {stats.recentTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.recentTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={((v: unknown) => [`${v} 条`, '收藏数']) as TooltipFormatter} labelFormatter={(l: unknown) => `日期：${l}`} />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>

        {/* 分类分布饼图 */}
        <Col xs={24} lg={10}>
          <Card title="分类分布" className="stats-chart-card">
            {categoryPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name ?? ''} ${(((percent as number | undefined) ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {categoryPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={((v: unknown) => [`${v} 条`, '收藏数']) as TooltipFormatter} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无分类数据" />
            )}
          </Card>
        </Col>

        {/* 标签频率柱状图 */}
        <Col xs={24}>
          <Card title="标签使用频率（Top 12）" className="stats-chart-card">
            {tagBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={tagBarData} margin={{ left: 0, right: 8 }}>
                  <XAxis dataKey="tag" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={((v: unknown) => [`${v} 次`, '使用次数']) as TooltipFormatter} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {tagBarData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="暂无标签数据" />
            )}
          </Card>
        </Col>

        {/* 热门标签云 */}
        {tagBarData.length > 0 && (
          <Col xs={24}>
            <Card title="热门标签" className="stats-chart-card">
              <div className="stats-tag-cloud">
                {tagBarData.map(({ tag, count }, i) => (
                  <Tag key={tag} color={PIE_COLORS[i % PIE_COLORS.length]} style={{ fontSize: 13, padding: '2px 10px', marginBottom: 8 }}>
                    {tag} <span style={{ opacity: 0.75 }}>×{count}</span>
                  </Tag>
                ))}
              </div>
            </Card>
          </Col>
        )}
      </Row>

      <div className="stats-refresh-row">
        <Button icon={<ReloadOutlined />} onClick={loadStats} loading={loading}>
          刷新数据
        </Button>
      </div>
    </div>
  );
}
