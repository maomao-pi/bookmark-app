import { useState, useEffect, useCallback } from 'react';
import { Badge, Card, Empty, Skeleton, message, Button, Alert } from 'antd';
import { RobotOutlined, LinkOutlined, ReloadOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { AiNewsItem } from '../types';
import { userApi } from '../services/userApi';
import './AiNewsSection.css';

export function AiNewsSection() {
  const [news, setNews] = useState<AiNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const loadNews = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setHasError(false);
    setErrorDetail(null);
    try {
      const data = await userApi.getAiNews(forceRefresh);
      setNews(data);
      if (forceRefresh) {
        message.success('已刷新获取最新咨讯');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败';
      setHasError(true);
      setErrorDetail(msg);
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNews(false);
  }, [loadNews]);

  /** 仅手动刷新：带 refresh=true 重新拉取（服务端清缓存后重查） */
  const handleRefresh = () => {
    void loadNews(true);
  };

  const header = (
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
  );

  if (loading) {
    return (
      <div className="ai-news-section ai-news-panel">
        {header}
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

  if (hasError) {
    return (
      <div className="ai-news-section ai-news-panel">
        {header}
        <div className="ai-news-scroll-area ai-news-empty">
          <Alert
            className="ai-news-error-alert"
            type="warning"
            icon={<WarningOutlined />}
            showIcon
            message="推荐咨讯暂时不可用"
            description={
              <span>
                {errorDetail || '网络或服务异常'}。左侧收藏功能不受影响。
              </span>
            }
            action={
              <Button size="small" onClick={handleRefresh} loading={loading}>
                重试
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="ai-news-section ai-news-panel">
        {header}
        <div className="ai-news-scroll-area ai-news-empty">
          <Empty
            image={<InfoCircleOutlined style={{ fontSize: 44, color: '#94a3b8' }} />}
            description={
              <span className="ai-news-empty-text">
                暂无推荐列表
                <br />
                <span className="ai-news-empty-hint">
                  可能原因：管理员未开启「外部内容推荐」、未配置 AI Key，或当前周期内无可用条目。与网络错误不同，此时无需报错，可点击「刷新」在允许时重新拉取。
                </span>
              </span>
            }
          >
            <Button type="default" size="small" icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新重试
            </Button>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-news-section ai-news-panel">
      {header}
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
