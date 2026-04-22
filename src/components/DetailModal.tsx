import { Modal, Button, Tag, message, Empty, Card, Spin, Tabs, Progress, Tooltip, Input, Dropdown, List } from 'antd';
import { CopyOutlined, LinkOutlined, PlusOutlined, EditOutlined, DeleteOutlined, GlobalOutlined, FileTextOutlined, VideoCameraOutlined, RobotOutlined, PlayCircleOutlined, ClockCircleOutlined, CheckCircleOutlined, ThunderboltOutlined, FolderOutlined, BookOutlined, SearchOutlined, PushpinFilled, PushpinOutlined, MoreOutlined } from '@ant-design/icons';
import type { Bookmark, Article, BookmarkAnalysisResult } from '../types';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { userApi } from '../services/userApi';
import { publicSettingsApi } from '../services/publicSettingsApi';
import { NoteSection } from './NoteSection';
import './DetailModal.css';

interface DetailModalProps {
  open: boolean;
  bookmark: Bookmark | null;
  categoryName: string | null;
  onClose: () => void;
  onAddArticle: (type?: 'article' | 'video' | 'document' | 'link') => void;
  onEditArticle: (article: Article) => void;
  onDeleteArticle: (article: Article) => void;
  onArticleUpdate: (bookmarkId: string, articles: Article[]) => void;
  onTagAdded?: (bookmarkId: string, newTag: string) => void;
  articleSaveSignal?: number;
}

export function DetailModal({ 
  open, 
  bookmark, 
  categoryName: _categoryName,
  onClose, 
  onAddArticle,
  onEditArticle,
  onDeleteArticle,
  onArticleUpdate,
  onTagAdded,
  articleSaveSignal,
}: DetailModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<BookmarkAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeContentTab, setActiveContentTab] = useState<string>('article');
  const [localArticles, setLocalArticles] = useState<Article[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [aiModelName, setAiModelName] = useState<string>('AI');

  useEffect(() => {
    publicSettingsApi.getAiSettings().then(ai => {
      setAiModelName(ai.model || 'AI');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (open && bookmark) {
      setSearchKeyword('');
      setAiResult(null);
      setAiError(null);
      loadArticles();
    }
  }, [open, bookmark?.id]);

  useEffect(() => {
    if (open && bookmark && articleSaveSignal !== undefined && articleSaveSignal > 0) {
      loadArticles();
    }
  }, [articleSaveSignal]);

  const loadArticles = useCallback(async () => {
    if (!bookmark?.id) return;
    try {
      const articles = await userApi.getArticles(bookmark.id);
      setLocalArticles(articles);
      onArticleUpdate(bookmark.id, articles);
    } catch (error) {
      console.error('Failed to load articles:', error);
    }
  }, [bookmark?.id]);

  const filteredArticles = useMemo(() => {
    if (!searchKeyword.trim()) return localArticles;
    const kw = searchKeyword.toLowerCase();
    return localArticles.filter(a =>
      a.title.toLowerCase().includes(kw) ||
      (a.description || '').toLowerCase().includes(kw) ||
      a.url.toLowerCase().includes(kw)
    );
  }, [localArticles, searchKeyword]);

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

  const handleGenerateAnalysis = async () => {
    if (!bookmark) return;
    setIsGenerating(true);
    setAiError(null);
    try {
      const result = await userApi.analyzeBookmark(bookmark.id);
      setAiResult(result);
      message.success('AI 分析完成');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI 分析失败';
      setAiError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddTag = async (tag: string) => {
    if (!bookmark) return;
    const currentTags = bookmark.tags || [];
    if (currentTags.includes(tag)) {
      message.info(`标签「${tag}」已存在`);
      return;
    }
    try {
      await userApi.updateBookmark(bookmark.id, { ...bookmark, tags: [...currentTags, tag] });
      onTagAdded?.(bookmark.id, tag);
      message.success(`标签「${tag}」已添加`);
    } catch {
      message.error('添加标签失败');
    }
  };

  const handleTogglePin = async (article: Article) => {
    const newPinned = !article.pinned;
    setLocalArticles(prev =>
      prev.map(a => a.id === article.id ? { ...a, pinned: newPinned } : a)
    );
    try {
      await userApi.updateArticle(bookmark!.id, article.id, { ...article, pinned: newPinned });
    } catch {
      setLocalArticles(prev =>
        prev.map(a => a.id === article.id ? { ...a, pinned: article.pinned } : a)
      );
      message.error('操作失败，请重试');
    }
  };

  const renderArticleList = (type: string, emptyText: string) => {
    const rawItems = filteredArticles.filter(a => a.type === type);
    const items = [...rawItems].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    const getTypeIcon = () => {
      switch (type) {
        case 'video': return <VideoCameraOutlined />;
        case 'document': return <FolderOutlined />;
        default: return <FileTextOutlined />;
      }
    };
    const getTypeColor = () => {
      switch (type) {
        case 'video': return '#EF4444';
        case 'document': return '#10B981';
        default: return '#3B82F6';
      }
    };
    return (
      <div className="content-list">
        <div className="tab-search-bar">
          <Input
            prefix={<SearchOutlined className="search-icon" />}
            placeholder="搜索标题、描述..."
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            allowClear
            size="small"
            className="tab-search-input"
          />
        </div>
        {items.length > 0 ? (
          <List
            className="content-list-view"
            itemLayout="horizontal"
            dataSource={items}
            renderItem={(article) => (
              <List.Item
                className={`content-list-item ${article.pinned ? 'content-list-item--pinned' : ''}`}
                actions={[
                  <Dropdown
                    key="more"
                    menu={{
                      items: [
                        {
                          key: 'pin',
                          label: article.pinned ? '取消置顶' : '置顶',
                          icon: article.pinned ? <PushpinFilled style={{ color: '#f59e0b' }} /> : <PushpinOutlined />,
                          onClick: () => handleTogglePin(article),
                        },
                        {
                          key: 'edit',
                          label: '编辑',
                          icon: <EditOutlined />,
                          onClick: () => onEditArticle(article),
                        },
                        {
                          key: 'delete',
                          label: '删除',
                          icon: <DeleteOutlined />,
                          danger: true,
                          onClick: () => onDeleteArticle(article),
                        },
                      ],
                    }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button type="text" size="small" icon={<MoreOutlined />} />
                  </Dropdown>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div className="content-list-avatar" style={{ background: `linear-gradient(135deg, ${getTypeColor()}20 0%, ${getTypeColor()}10 100%)`, color: getTypeColor() }}>
                      {getTypeIcon()}
                    </div>
                  }
                  title={
                    <div className="content-list-title">
                      {article.pinned && <Tag color="gold" className="article-pin-tag">置顶</Tag>}
                      <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                        {article.title}
                      </a>
                    </div>
                  }
                  description={
                    <div className="content-list-desc">
                      {article.description && <span>{article.description}</span>}
                      <span className="content-list-url">{article.url}</span>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <div className="empty-content">
            <Empty description={searchKeyword ? '无匹配结果' : emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        )}
      </div>
    );
  };

  const countByType = (type: string) => localArticles.filter(a => a.type === type).length;

  return (
    <Modal
      title="收藏详情"
      open={open}
      onCancel={onClose}
      footer={null}
      className="detail-modal"
      width="90%"
      style={{ top: '5%' }}
      styles={{
        body: { maxHeight: '90vh', overflow: 'hidden' },
        mask: {
          backgroundColor: 'rgba(148, 163, 184, 0.18)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(14px)'
        }
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
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="detail-favicon-placeholder"><GlobalOutlined /></div>
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
                    onChange={(key) => { setActiveContentTab(key); setSearchKeyword(''); }}
                    size="small"
                    tabBarExtraContent={
                      activeContentTab !== 'note' ? (
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          className="detail-add-btn"
                          onClick={() => onAddArticle()}
                        >
                          添加
                        </Button>
                      ) : null
                    }
                    items={[
                      {
                        key: 'article',
                        label: <span><FileTextOutlined /> 文章 {countByType('article') > 0 && `(${countByType('article')})`}</span>,
                        children: renderArticleList('article', '暂无文章'),
                      },
                      {
                        key: 'video',
                        label: <span><VideoCameraOutlined /> 视频 {countByType('video') > 0 && `(${countByType('video')})`}</span>,
                        children: renderArticleList('video', '暂无视频'),
                      },
                      {
                        key: 'document',
                        label: <span><FolderOutlined /> 文档 {countByType('document') > 0 && `(${countByType('document')})`}</span>,
                        children: renderArticleList('document', '暂无文档'),
                      },
                      {
                        key: 'note',
                        label: <span><BookOutlined /> 笔记</span>,
                        children: (
                          <NoteSection bookmarkId={bookmark.id} />
                        ),
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 左右分割线 */}
        <div className="detail-divider" />

        {/* 右侧：AI 智能分析 */}
        <div className="detail-right">
          <div className="ai-section">
            <div className="ai-section-header">
              <span className="ai-title">
                <RobotOutlined style={{ marginRight: 8 }} />
                AI 智能分析
              </span>
              <Tag color="purple">{aiModelName}</Tag>
            </div>

            <div className="ai-tabs-container">
              {isGenerating && (
                <div className="generating-overlay">
                  <Spin size="large" />
                  <p>正在调用 AI 分析收藏内容...</p>
                  <Progress percent={75} status="active" />
                </div>
              )}

              {!aiResult && !aiError && !isGenerating && (
                <div className="ai-panel">
                  <Empty
                    description="点击生成按钮，AI 将分析收藏内容并给出摘要、要点和标签建议"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Button
                      type="primary"
                      icon={<RobotOutlined />}
                      onClick={handleGenerateAnalysis}
                      className="generate-btn"
                    >
                      生成智能分析
                    </Button>
                  </Empty>
                </div>
              )}

              {aiError && !isGenerating && (
                <div className="ai-panel">
                  <Empty
                    description={
                      <span>
                        {aiError.includes('未配置') || aiError.includes('API') ? (
                          <>请先在系统设置中配置 AI API Key</>
                        ) : (
                          <>分析失败：{aiError}</>
                        )}
                      </span>
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Button icon={<RobotOutlined />} onClick={handleGenerateAnalysis}>
                      重试
                    </Button>
                  </Empty>
                </div>
              )}

              {aiResult && !isGenerating && (
                <div className="ai-panel">
                  <Card
                    className="result-card"
                    title="AI 分析报告"
                    extra={<span style={{ fontSize: 12, color: '#999' }}>{formatDate(aiResult.generatedAt)}</span>}
                  >
                    <div className="result-content">
                      {/* 摘要 */}
                      <div className="ai-block">
                        <h5>📋 内容摘要</h5>
                        <p>{aiResult.summary}</p>
                      </div>

                      {/* 核心要点 */}
                      {aiResult.keyPoints?.length > 0 && (
                        <div className="ai-block key-points">
                          <h5><CheckCircleOutlined /> 核心要点</h5>
                          <ul>
                            {aiResult.keyPoints.map((point, idx) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 标签建议 */}
                      {aiResult.suggestedTags?.length > 0 && (
                        <div className="ai-block">
                          <h5>🏷️ 标签建议</h5>
                          <div className="suggested-tags">
                            {aiResult.suggestedTags.map(tag => (
                              <Tag
                                key={tag}
                                className="suggested-tag"
                                onClick={() => handleAddTag(tag)}
                                style={{ cursor: 'pointer' }}
                              >
                                + {tag}
                              </Tag>
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>点击标签可添加到收藏</div>
                        </div>
                      )}

                      {/* 分类匹配 */}
                      {aiResult.categoryMatch && (
                        <div className="ai-block">
                          <h5>📁 分类建议</h5>
                          <p style={{ color: '#666' }}>{aiResult.categoryMatch}</p>
                        </div>
                      )}
                    </div>

                    <div className="result-actions">
                      <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        onClick={handleGenerateAnalysis}
                        loading={isGenerating}
                      >
                        重新分析
                      </Button>
                      <Button
                        icon={<CopyOutlined />}
                        onClick={() => {
                          const text = `摘要：${aiResult.summary}\n\n要点：\n${aiResult.keyPoints?.join('\n')}\n\n标签：${aiResult.suggestedTags?.join(', ')}`;
                          navigator.clipboard.writeText(text);
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

            {/* 时间戳功能（仅有分析结果时占位用，已移除） */}
            <div style={{ display: 'none' }}>
              <PlayCircleOutlined /><ClockCircleOutlined />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
