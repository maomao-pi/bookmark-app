import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Empty, Spin, message, Button, Alert, Tag } from 'antd';
import { RobotOutlined, LinkOutlined, ReloadOutlined, WarningOutlined, GlobalOutlined, LoadingOutlined } from '@ant-design/icons';
import type { AiNewsItem } from '../types';
import { userApi } from '../services/userApi';
import './AiNewsSection.css';

export function AiNewsSection() {
  const [news, setNews] = useState<AiNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchMode, setSearchMode] = useState<'search' | 'text' | null>(null);
  const isRefreshingRef = useRef(false);

  const loadNews = useCallback(async (forceRefresh = false) => {
    if (forceRefresh && isRefreshingRef.current) return;

    setLoading(true);
    if (forceRefresh) {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
    }
    setHasError(false);

    try {
      const data = await userApi.getAiNews(forceRefresh);
      setNews(data);
      if (data.length > 0 && data[0].modelSource) {
        setSearchMode(data[0].modelSource);
      } else {
        setSearchMode(null);
      }
      if (forceRefresh) {
        message.success('已刷新获取最新咨讯');
      }
    } catch (err) {
      console.error('加载 AI 咨讯失败:', err);
      setHasError(true);
    } finally {
      setLoading(false);
      if (forceRefresh) {
        setTimeout(() => {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
        }, 2000);
      }
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
        <div className="ai-news-loading">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#3B82F6' }} spin />} />
          <p className="ai-news-loading-text">AI 正在努力查询...</p>
          <p className="ai-news-loading-hint">正在为你搜索最新资讯，请稍候</p>
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
            disabled={isRefreshing}
            loading={isRefreshing}
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
                <Button size="small" onClick={handleRefresh} disabled={isRefreshing} loading={isRefreshing}>
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
                  <span className="ai-news-empty-hint">管理员可在系统设置中开启「外部内容推荐」并配置 AI 联网搜索</span>
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
        {searchMode === 'search' && (
          <Tag
            icon={<GlobalOutlined />}
            color="blue"
            className="ai-news-search-tag"
          >
            联网搜索
          </Tag>
        )}
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined spin={isRefreshing} />}
          onClick={handleRefresh}
          disabled={isRefreshing}
          loading={isRefreshing}
          style={{ marginLeft: 'auto' }}
        >
          刷新
        </Button>
      </div>
      <div className="ai-news-scroll-area">
        <div className="ai-news-list">
          {news.map(item => (
            <Card
              key={item.id}
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
          ))}
        </div>
      </div>
    </div>
  );
}
