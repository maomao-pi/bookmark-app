import { Modal, Button, Tag, List, message, Empty, Card, Spin, Tabs, Progress, Tooltip } from 'antd';
import { CopyOutlined, LinkOutlined, PlusOutlined, EditOutlined, DeleteOutlined, GlobalOutlined, FileTextOutlined, VideoCameraOutlined, RobotOutlined, PlayCircleOutlined, ClockCircleOutlined, CheckCircleOutlined, ThunderboltOutlined, FolderOutlined } from '@ant-design/icons';
import type { Bookmark, Article } from '../types';
import { useState, useEffect } from 'react';
import { userApi } from '../services/userApi';
import './DetailModal.css';

// AI 分析结果
interface AIResult {
  id: string;
  type: string;
  title: string;
  content: string;
  keyPoints?: string[];
  timestamp?: { time: string; point: string }[];
  createdAt: string;
}

interface DetailModalProps {
  open: boolean;
  bookmark: Bookmark | null;
  categoryName: string | null;
  onClose: () => void;
  onAddArticle: (type?: 'article' | 'video' | 'document' | 'link') => void;
  onEditArticle: (article: Article) => void;
  onDeleteArticle: (article: Article) => void;
  onArticleUpdate: (bookmarkId: string, articles: Article[]) => void;
}

export function DetailModal({ 
  open, 
  bookmark, 
  categoryName: _categoryName,
  onClose, 
  onAddArticle,
  onEditArticle,
  onDeleteArticle,
  onArticleUpdate
}: DetailModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResults, setAiResults] = useState<AIResult[]>([]);
  const [activeContentTab, setActiveContentTab] = useState<string>('article');
  const [localArticles, setLocalArticles] = useState<Article[]>([]);

  useEffect(() => {
    if (open && bookmark) {
      setLocalArticles(localArticles || []);
      loadArticles();
    }
  }, [open, bookmark]);

  const loadArticles = async () => {
    if (!bookmark) return;
    try {
      const articles = await userApi.getArticles(bookmark.id);
      setLocalArticles(articles);
      onArticleUpdate(bookmark.id, articles);
    } catch (error) {
      console.error('Failed to load articles:', error);
    }
  };

  if (!bookmark) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(bookmark.url).then(() => {
      message.success('链接已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  const handleOpenUrl = () => {
    window.open(bookmark.url, '_blank');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const handleGenerateSummary = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
  const articles = localArticles.filter(a => a.type === 'article');
  const videos = localArticles.filter(a => a.type === 'video');
  const documents = localArticles.filter(a => a.type === 'document');
  const total = articles.length + videos.length + documents.length;

      const typeLabel = (t: string) => ({ article: '文章', video: '视频', document: '文档' }[t] || t);
      const lines: string[] = [];
      localArticles.forEach(a => {
        lines.push(`【${typeLabel(a.type)}】${a.title}`);
        if (a.description) lines.push(`  ${a.description}`);
      });

      const content = total === 0
        ? `当前收藏「${bookmark.title}」下暂无添加的文章、视频或文档。\n\n在左侧添加文章、视频、文档后，可在此生成内容概览与智能摘要。`
        : `本收藏共包含 ${articles.length} 篇文章、${videos.length} 个视频、${documents.length} 个文档（合计 ${total} 条）。\n\n内容概览：\n\n${lines.join('\n')}`;

      const keyPoints: string[] = [];
      if (articles.length > 0) keyPoints.push(`文章 ${articles.length} 篇：${articles.map(a => a.title).join('、')}`);
      if (videos.length > 0) keyPoints.push(`视频 ${videos.length} 个：${videos.map(a => a.title).join('、')}`);
      if (documents.length > 0) keyPoints.push(`文档 ${documents.length} 个：${documents.map(a => a.title).join('、')}`);

      const result: AIResult = {
        id: Date.now().toString(),
        type: 'content-summary',
        title: '收藏内容概览',
        content,
        keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
        createdAt: new Date().toISOString()
      };
      
      setAiResults(prev => [result, ...prev]);
      setIsGenerating(false);
      message.success('内容概览生成成功');
    }, 2000);
  };

  const latestResult = aiResults[0];

  return (
    <Modal
      title="收藏详情"
      open={open}
      onCancel={onClose}
      footer={null}
      className="detail-modal"
      transitionName="detail-modal"
      width="90%"
      style={{ top: '5%' }}
      bodyStyle={{ maxHeight: '90vh', overflow: 'hidden' }}
      maskStyle={{
        backgroundColor: 'rgba(148, 163, 184, 0.18)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(14px)'
      }}
      destroyOnClose
    >
      <div className="detail-content">
        {/* 左侧：收藏信息 + 内容管理 */}
        <div className="detail-left">
          <div className="detail-left-body">
          <div className="bookmark-info">
            <div className="detail-header">
              {bookmark.favicon ? (
                <img 
                  className="detail-favicon" 
                  src={bookmark.favicon} 
                  alt=""
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="detail-favicon-placeholder">
                  <GlobalOutlined />
                </div>
              )}
              
              <div className="detail-info">
                <h3 className="detail-title">{bookmark.title}</h3>
                <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="detail-url">
                  {bookmark.url}
                </a>
              </div>
              
              <div className="detail-actions">
                <Tooltip title="复制链接">
                  <Button icon={<CopyOutlined />} onClick={handleCopyUrl} />
                </Tooltip>
                <Tooltip title="打开链接">
                  <Button icon={<LinkOutlined />} onClick={handleOpenUrl} />
                </Tooltip>
              </div>
            </div>

            {bookmark.description && (
              <div className="detail-description">{bookmark.description}</div>
            )}

                      {/* 底部容器：创建/更新时间 + 内容管理 Tabs */}
          <div className="detail-bottom">
            <div className="detail-meta">
              <span>创建时间：{formatDate(bookmark.createdAt)}</span>
              {bookmark.updatedAt !== bookmark.createdAt && (
                <>
                  <span className="detail-meta-divider" />
                  <span>更新时间：{formatDate(bookmark.updatedAt)}</span>
                </>
              )}
            </div>

            <div className="content-tabs-section">
            <Tabs
              activeKey={activeContentTab}
              onChange={setActiveContentTab}
              size="small"
              tabBarExtraContent={
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  className="detail-add-btn"
                  onClick={() => onAddArticle()}
                >
                  添加
                </Button>
              }
              items={[
                {
                  key: 'article',
                  label: (
                    <span>
                      <FileTextOutlined /> 文章 ({localArticles.filter(a => a.type === 'article').length})
                    </span>
                  ),
                  children: (
                    <div className="content-list">
                      {localArticles.filter(a => a.type === 'article').length > 0 ? (
                        <List
                          dataSource={localArticles.filter(a => a.type === 'article')}
                          renderItem={(article) => (
                            <List.Item
                              className="article-item"
                              actions={[
                                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => onEditArticle(article)} />,
                                <Button key="delete" type="text" danger icon={<DeleteOutlined />} onClick={() => onDeleteArticle(article)} />
                              ]}
                            >
                              <List.Item.Meta
                                title={<a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a>}
                                description={article.description || article.url}
                              />
                            </List.Item>
                          )}
                        />
                      ) : (
                        <div className="empty-content"><Empty description="暂无文章" image={Empty.PRESENTED_IMAGE_SIMPLE} /></div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'video',
                  label: (
                    <span>
                      <VideoCameraOutlined /> 视频 ({localArticles.filter(a => a.type === 'video').length})
                    </span>
                  ),
                  children: (
                    <div className="content-list">
                      {localArticles.filter(a => a.type === 'video').length > 0 ? (
                        <List
                          dataSource={localArticles.filter(a => a.type === 'video')}
                          renderItem={(article) => (
                            <List.Item
                              className="article-item video-item"
                              actions={[
                                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => onEditArticle(article)} />,
                                <Button key="delete" type="text" danger icon={<DeleteOutlined />} onClick={() => onDeleteArticle(article)} />
                              ]}
                            >
                              <List.Item.Meta
                                title={<a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a>}
                                description={article.description || article.url}
                              />
                            </List.Item>
                          )}
                        />
                      ) : (
                        <div className="empty-content"><Empty description="暂无视频" image={Empty.PRESENTED_IMAGE_SIMPLE} /></div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'document',
                  label: (
                    <span>
                      <FolderOutlined /> 文档 ({localArticles.filter(a => a.type === 'document').length})
                    </span>
                  ),
                  children: (
                    <div className="content-list">
                      {localArticles.filter(a => a.type === 'document').length > 0 ? (
                        <List
                          dataSource={localArticles.filter(a => a.type === 'document')}
                          renderItem={(article) => (
                            <List.Item
                              className="article-item document-item"
                              actions={[
                                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => onEditArticle(article)} />,
                                <Button key="delete" type="text" danger icon={<DeleteOutlined />} onClick={() => onDeleteArticle(article)} />
                              ]}
                            >
                              <List.Item.Meta
                                title={<a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a>}
                                description={article.description || article.url}
                              />
                            </List.Item>
                          )}
                        />
                      ) : (
                        <div className="empty-content"><Empty description="暂无文档" image={Empty.PRESENTED_IMAGE_SIMPLE} /></div>
                      )}
                    </div>
                  )
                }
              ]}
            />
            </div>
          </div>
          </div>
          </div>
        </div>

        {/* 左右分割线 */}
        <div className="detail-divider" />

        {/* 右侧：AI智能分析 */}
        <div className="detail-right">
          <div className="ai-section">
            <div className="ai-section-header">
              <span className="ai-title">
                <RobotOutlined style={{ marginRight: 8 }} />
                AI 智能分析
              </span>
              <Tag color="purple">基于左侧收藏内容</Tag>
            </div>
            
            <div className="ai-tabs-container">
              {isGenerating && (
                <div className="generating-overlay">
                  <Spin size="large" />
                  <p>正在分析左侧收藏内容...</p>
                  <Progress percent={75} status="active" />
                </div>
              )}
              {!latestResult ? (
                <div className="ai-panel">
                  <Empty 
                    description="点击生成左侧收藏的文章、视频、文档的数量与内容概览" 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Button 
                      type="primary" 
                      icon={<RobotOutlined />}
                      onClick={handleGenerateSummary}
                      loading={isGenerating}
                      className="generate-btn"
                    >
                      生成摘要
                    </Button>
                  </Empty>
                </div>
              ) : (
                <div className="ai-panel">
                  <Card className="result-card" title={latestResult.title} extra={formatDate(latestResult.createdAt)}>
                    <div className="result-content">
                      <p style={{ whiteSpace: 'pre-wrap' }}>{latestResult.content}</p>
                      {latestResult.keyPoints && (
                        <div className="key-points">
                          <h5><CheckCircleOutlined /> 关键要点</h5>
                          <ul>
                            {latestResult.keyPoints.map((point, idx) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {latestResult.timestamp && (
                        <div className="timestamp-points">
                          <h5><ClockCircleOutlined /> 时间戳要点</h5>
                          <div className="timestamp-list">
                            {latestResult.timestamp.map((ts, idx) => (
                              <div key={idx} className="timestamp-item">
                                <Button type="link" icon={<PlayCircleOutlined />} className="timestamp-time">
                                  {ts.time}
                                </Button>
                                <span className="timestamp-point">{ts.point}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="result-actions">
                      <Button 
                        type="primary" 
                        icon={<ThunderboltOutlined />}
                        onClick={handleGenerateSummary}
                        loading={isGenerating}
                      >
                        重新分析
                      </Button>
                      <Button 
                        type="default" 
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(latestResult.content);
                          message.success('已复制到剪贴板');
                        }}
                      >
                        复制内容
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
