import { useState, useEffect, useCallback } from 'react';
import { Badge, Card, Empty, Skeleton, message, Button, Alert } from 'antd';
import { RobotOutlined, LinkOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import type { AiNewsItem } from '../types';
import { userApi } from '../services/userApi';
import './AiNewsSection.css';

export function AiNewsSection() {
  const [news, setNews] = useState<AiNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadNews = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setHasError(false);
    try {
      const data = await userApi.getAiNews(forceRefresh);
      setNews(data);
      if (forceRefresh) {
        message.success('已刷新获取最新咨讯');
      }
    } catch (err) {
      console.error('加载 AI 咨讯失败:', err);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const handleRefresh = () => {
    loadNews(true);
  };

  if (loading) {
    return (
      <div className="ai-news-section ai-news-panel">
        <div className="ai-news-header">
          <RobotOutlined className="ai-news-header-icon" />
          <span>AI 为你推荐</span>
        </div>
        <div className="ai-news-scroll-area">
          {[1, 2, 3].map(i => (
            <div key={i} className="ai-news-skeleton">
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hasError || news.length === 0) {
    return (
      <div className="ai-news-section ai-news-panel">
        <div className="ai-news-header">
          <RobotOutlined className="ai-news-header-icon" />
          <span>AI 为你推荐</span>
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
            style={{ marginLeft: 'auto' }}
          >
            刷新
          </Button>
        </div>
        <div className="ai-news-scroll-area ai-news-empty">
          {hasError ? (
            <Alert
              className="ai-news-error-alert"
              type="warning"
              icon={<WarningOutlined />}
              showIcon
              message="推荐咨讯暂时不可用"
              description="加载失败，请点击「刷新」重试。左侧收藏功能不受影响。"
              action={
                <Button size="small" onClick={handleRefresh} loading={loading}>
                  重试
                </Button>
              }
            />
          ) : (
            <Empty
              image={<RobotOutlined style={{ fontSize: 48, color: '#94a3b8' }} />}
              description={
                <span className="ai-news-empty-text">
                  暂无推荐咨讯
                  <br />
                  <span className="ai-news-empty-hint">管理员可在系统设置中开启「外部内容推荐」</span>
                </span>
              }
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ai-news-section ai-news-panel">
      <div className="ai-news-header">
        <RobotOutlined className="ai-news-header-icon" />
        <span>AI 为你推荐</span>
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined spin={loading} />}
          onClick={handleRefresh}
          loading={loading}
          style={{ marginLeft: 'auto' }}
        >
          刷新
        </Button>
      </div>
      <div className="ai-news-scroll-area">
        <div className="ai-news-list">
          {news.map(item => (
            <Badge.Ribbon key={item.id} text="AI 推荐" color="blue" className="ai-news-badge-ribbon">
              <Card
                className="ai-news-card"
                hoverable
                onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
              >
                <div className="ai-news-card-body">
                  <div className="ai-news-title">{item.title}</div>
                  {item.summary && (
                    <div className="ai-news-summary">{item.summary}</div>
                  )}
                  <div className="ai-news-footer">
                    {item.source && (
                      <span className="ai-news-source">{item.source}</span>
                    )}
                    <span className="ai-news-link">
                      <LinkOutlined /> 查看原文
                    </span>
                  </div>
                </div>
              </Card>
            </Badge.Ribbon>
          ))}
        </div>
      </div>
    </div>
  );
}
