import { useState, useMemo, useEffect } from 'react';
import { ConfigProvider, theme as antTheme, Layout, Input, Button, Empty, message, Dropdown, Space, Menu, Tooltip, type MenuProps } from 'antd';
import { SunOutlined, MoonOutlined, PlusOutlined, FolderOutlined, SortAscendingOutlined, LogoutOutlined, UserOutlined, BookOutlined, HomeOutlined, CompassOutlined, SettingOutlined, SettingFilled, TeamOutlined, ThunderboltOutlined, AppstoreOutlined, ReadOutlined, TagsOutlined, BarChartOutlined, RobotOutlined, GlobalOutlined, LinkOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAppData } from './hooks/useAppData';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';

import { lightTheme, darkTheme } from './theme';
import { BookmarkCard } from './components/BookmarkCard';
import { BookmarkModal } from './components/BookmarkModal';
import { AuthModal } from './components/AuthModal';
import { DetailModal } from './components/DetailModal';
import { CategoryManageModal } from './components/CategoryManageModal';
import { ArticleModal } from './components/ArticleModal';
import { ProfileModal } from './components/ProfileModal';
import { AiNewsSection } from './components/AiNewsSection';
import type { Bookmark, BookmarkFormData, Article, ArticleFormData, Category } from './types';
import { UserAvatar } from './components/UserAvatar';
import { getUserDisplayName, getUserSubtitle } from './utils/userAvatar';
import { canAccessAdminBackend, openAdminPanelAsUser, openSystemAdminLogin } from './utils/adminAccess';
import './App.css';

const { Header, Content } = Layout;

type PageType = 'about' | 'home' | 'discover';

function App() {
  const {
    categories,
    bookmarks,
    searchQuery,
    categoryFilter,
    setSearchQuery,
    setCategoryFilter,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    addCategory,
    updateCategory,
    deleteCategory,
    addArticle,
    updateArticle,
    deleteArticle,
    getFilteredBookmarks,
    getCategoryName,
    getBookmarkById,
    updateSortSettings,
    settings,
    isDuplicate,
    discoverCategories,
    discoverSearchQuery,
    discoverCategoryFilter,
    setDiscoverSearchQuery,
    setDiscoverCategoryFilter,
    getFilteredDiscoverBookmarks,
    getDiscoverCategoryName,
    refreshData
  } = useAppData();

  const { toggleTheme, isDark, allowUserSwitch } = useTheme();
  const { currentUser, isAuthenticated, isLoading: authLoading, logout, patchSession } = useAuth();
  
  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    const token = localStorage.getItem('userToken');
    return token ? 'home' : 'about';
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated && currentPage === 'about') {
      setCurrentPage('home');
    }
  }, [authLoading, isAuthenticated, currentPage]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const openLoginPage = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentBookmark, setCurrentBookmark] = useState<Bookmark | null>(null);
  
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [pendingCategoryForBookmark, setPendingCategoryForBookmark] = useState(false);
  
  const [categoryManageModalOpen, setCategoryManageModalOpen] = useState(false);
  
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleDefaultType, setArticleDefaultType] = useState<'article' | 'video' | 'document' | 'link'>('article');
  const [articleSaveSignal, setArticleSaveSignal] = useState(0);

  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const filteredBookmarks = useMemo(() => getFilteredBookmarks(), [getFilteredBookmarks]);
  const filteredDiscoverBookmarks = useMemo(() => getFilteredDiscoverBookmarks(), [getFilteredDiscoverBookmarks]);

  const sortOptions = [
    { key: 'date-desc', label: '最新优先', sortBy: 'date' as const, sortOrder: 'desc' as const },
    { key: 'date-asc', label: '最早优先', sortBy: 'date' as const, sortOrder: 'asc' as const },
    { key: 'title-asc', label: '标题 A-Z', sortBy: 'title' as const, sortOrder: 'asc' as const },
    { key: 'title-desc', label: '标题 Z-A', sortBy: 'title' as const, sortOrder: 'desc' as const },
    { key: 'source-asc', label: '来源 A-Z', sortBy: 'source' as const, sortOrder: 'asc' as const },
    { key: 'source-desc', label: '来源 Z-A', sortBy: 'source' as const, sortOrder: 'desc' as const },
  ];

  const currentSortLabel = sortOptions.find(
    opt => opt.sortBy === settings.sortBy && opt.sortOrder === settings.sortOrder
  )?.label || '最新优先';

  const handleAddBookmark = () => {
    if (!isAuthenticated) {
      message.warning('请先登录后再添加收藏');
      openLoginPage();
      return;
    }
    setEditingBookmark(null);
    setBookmarkModalOpen(true);
  };

  const handleEditBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setBookmarkModalOpen(true);
  };

  const handleSaveBookmark = async (data: BookmarkFormData) => {
    if (!editingBookmark && isDuplicate(data.url)) {
      message.error('该网址已存在，请勿重复添加');
      return;
    }
    
    if (editingBookmark) {
      if (isDuplicate(data.url, editingBookmark.id)) {
        message.error('该网址已存在，请勿重复添加');
        return;
      }
      await updateBookmark(editingBookmark.id, data);
      message.success('收藏已更新');
    } else {
      try {
        await addBookmark(data);
        message.success('收藏已添加');
      } catch (err) {
        message.error('添加失败，请确保已登录');
        return;
      }
    }
    setBookmarkModalOpen(false);
    setEditingBookmark(null);
  };

  const handleDeleteBookmark = (bookmark: Bookmark) => {
    deleteBookmark(bookmark.id);
    message.success('收藏已删除');
    if (currentBookmark?.id === bookmark.id) {
      setDetailModalOpen(false);
      setCurrentBookmark(null);
    }
  };

  const handleViewDetail = (bookmark: Bookmark) => {
    setCurrentBookmark(bookmark);
    setDetailModalOpen(true);
  };

  const handleAddCategory = (returnToBookmark = false) => {
    setPendingCategoryForBookmark(returnToBookmark);
    setCategoryManageModalOpen(true);
  };

  const handleSaveCategory = async (name: string, editingCategoryId?: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      message.error('分类名称不能为空');
      return;
    }

    if (editingCategoryId) {
      // Editing existing category
      const duplicate = categories.some(c => c.id !== editingCategoryId && c.name === trimmedName);
      if (duplicate) {
        message.error('分类名称已存在');
        return;
      }

      const updated = await updateCategory(editingCategoryId, trimmedName);
      if (!updated) {
        message.error('分类更新失败，请重试');
        return;
      }
      setCategoryFilter(updated.id);
      message.success(`分类已更新，已切换到「${updated.name}」`);
      return;
    }

    // Adding new category
    if (categories.some(c => c.name === trimmedName)) {
      message.error('分类名称已存在');
      return;
    }

    const created = await addCategory(trimmedName);
    if (!created) {
      message.error('分类创建失败，请重试');
      return;
    }

    setCategoryFilter(created.id);
    message.success(`分类已添加，已切换到「${created.name}」`);
    if (pendingCategoryForBookmark) {
      setPendingCategoryForBookmark(false);
      setBookmarkModalOpen(true);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    await deleteCategory(category.id);
    if (categoryFilter === category.id) {
      setCategoryFilter('');
      message.success(`分类「${category.name}」已删除，已切换到全部`);
      return;
    }
    message.success(`分类「${category.name}」已删除`);
  };

  const handleAddArticle = (type: 'article' | 'video' | 'document' | 'link' = 'article') => {
    setEditingArticle(null);
    setArticleDefaultType(type);
    setArticleModalOpen(true);
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setArticleModalOpen(true);
  };

  const handleDeleteArticle = (article: Article) => {
    if (currentBookmark) {
      deleteArticle(currentBookmark.id, article.id);
      message.success('文章已删除');
      const updated = getBookmarkById(currentBookmark.id);
      if (updated) {
        setCurrentBookmark(updated);
      }
    }
  };

  const handleSaveArticle = (data: ArticleFormData) => {
    if (!currentBookmark) return;

    if (editingArticle) {
      updateArticle(currentBookmark.id, editingArticle.id, data);
      message.success('文章已更新');
    } else {
      addArticle(currentBookmark.id, data);
      message.success('文章已添加');
    }
    
    setArticleModalOpen(false);
    setEditingArticle(null);
    setArticleSaveSignal(prev => prev + 1);
    
    const updated = getBookmarkById(currentBookmark.id);
    if (updated) {
      setCurrentBookmark(updated);
    }
  };

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
  };

  const sortMenuItems = sortOptions.map(opt => ({
    key: opt.key,
    label: opt.label,
    onClick: () => updateSortSettings(opt.sortBy, opt.sortOrder)
  }));

  const handleMenuClick = ({ key }: { key: string }) => {
    setCurrentPage(key as PageType);
  };

  // 用户下拉菜单项
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人设置'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true
    }
  ];

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      handleLogout();
    } else if (key === 'profile') {
      setProfileModalOpen(true);
    } else if (key === 'stats') {
      setCurrentPage('home');
    } else if (key === 'settings') {
      if (isAuthenticated && canAccessAdminBackend(currentUser)) {
        openAdminPanelAsUser();
      } else if (!isAuthenticated) {
        openSystemAdminLogin();
      } else {
        message.warning('当前账号暂无管理权限，可使用系统管理员账号登录');
        openSystemAdminLogin();
      }
    }
  };

  const handleCategoryManage = () => {
    if (!isAuthenticated) {
      message.warning('请先登录后再管理分类');
      openLoginPage();
      return;
    }
    setCategoryManageModalOpen(true);
  };

  const renderAboutContent = () => (
    <div className="about-page">
      {/* ============== Hero Section ============== */}
      <section className="about-hero" aria-labelledby="about-hero-title">
        <div className="about-hero-aurora" aria-hidden="true">
          <span className="about-hero-aurora-mesh" />
          <span className="about-hero-aurora-grid" />
          <span className="about-hero-aurora-beam" />
        </div>

        <div className="about-wide-inner">
          <div className="about-hero-inner">
            <span className="about-hero-eyebrow">
              <span className="about-hero-eyebrow-dot" aria-hidden="true" />
              易普拉格 · 知识收藏与沉淀平台
            </span>

            <h1 id="about-hero-title" className="about-hero-title">
              不止收藏，<br className="about-hero-title-br" />
              <span className="about-hero-title-gradient">构建你的知识资产</span>
            </h1>

            <p className="about-hero-subtitle">
              Linkbox 让链接、文章、视频与笔记沉淀成可被检索、复用的认知资产 ——
              <span className="about-hero-subtitle-strong">一处收藏，终生受益。</span>
            </p>

            <div className="about-hero-actions">
              <Button
                type="primary"
                size="large"
                icon={<CompassOutlined />}
                className="about-hero-explore-btn"
                onClick={() => setCurrentPage('discover')}
              >
                立即探索
              </Button>
              <Button
                size="large"
                className="about-hero-secondary-btn"
                onClick={() => {
                  const el = document.getElementById('about-products');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                了解产品能力
              </Button>
            </div>

            <ul className="about-hero-tags" aria-label="平台核心能力">
              <li className="about-hero-tag"><ThunderboltOutlined /> 一键收藏</li>
              <li className="about-hero-tag"><RobotOutlined /> AI 摘要</li>
              <li className="about-hero-tag"><GlobalOutlined /> 发现广场</li>
              <li className="about-hero-tag"><ReadOutlined /> 笔记沉淀</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ============== Section 1：核心产品卡片（1 高亮 + 2 浅色） ============== */}
      <section id="about-products" className="about-section about-section-products">
        <div className="about-wide-inner">
          <div className="about-products-grid">
            {/* 主推卡片：深色渐变 */}
            <div className="about-product-card about-product-card-primary">
              <div className="about-product-card-icon">
                <AppstoreOutlined />
              </div>
              <h3 className="about-product-card-title">Linkbox · 智能收藏中枢</h3>
              <p className="about-product-card-desc">
                易普拉格新一代知识收藏旗舰平台，AI 自动抓取与摘要，多维分类与标签体系，
                让散落的链接、文章、视频化为体系化的知识资产。
              </p>
            </div>

            {/* 副卡片 1 */}
            <div className="about-product-card about-product-card-soft about-product-card-soft-blue">
              <div className="about-product-card-icon about-product-card-icon-light">
                <RobotOutlined />
              </div>
              <h3 className="about-product-card-title">AI 内容理解引擎</h3>
              <p className="about-product-card-desc">
                基于大语言模型的内容理解能力，自动生成网页摘要、识别关键信息，
                并智能推荐相关阅读，让信息处理效率全面跃升。
              </p>
            </div>

            {/* 副卡片 2 */}
            <div className="about-product-card about-product-card-soft about-product-card-soft-violet">
              <div className="about-product-card-icon about-product-card-icon-light">
                <GlobalOutlined />
              </div>
              <h3 className="about-product-card-title">发现广场社区</h3>
              <p className="about-product-card-desc">
                精选公开收藏内容池，跨越个人信息孤岛，发现行业前沿与他人智慧，
                让收藏不止是私有，更是开放的知识连接。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============== Section 2：旗舰能力家族（2 大 + 4 小） ============== */}
      <section className="about-section">
        <div className="about-wide-inner">
          <h2 className="about-section-title">旗舰能力家族，覆盖全场景</h2>
          <p className="about-section-subtitle">
            从单条链接到知识体系，Linkbox 为个人与团队提供一体化的内容沉淀工作流
          </p>

          {/* 上层：两张大卡片 */}
          <div className="about-capability-grid">
            <div className="about-capability-card about-capability-card-gradient">
              <div className="about-capability-badge">旗舰能力</div>
              <h3 className="about-capability-title">智能收藏 · AI 摘要</h3>
              <p className="about-capability-desc">
                收藏即所得，自动抓取标题、封面与正文摘要，大模型生成关键洞察，
                让"先收藏后阅读"变成"收藏即理解"
              </p>
            </div>

            <div className="about-capability-card about-capability-card-soft">
              <div className="about-capability-badge about-capability-badge-soft">内容沉淀</div>
              <h3 className="about-capability-title">收藏 → 笔记 → 文章</h3>
              <p className="about-capability-desc">
                完整的内容沉淀工作流，支持在收藏下挂载笔记、文章、视频与文档，
                构建以"项目/主题"为单位的私人知识库
              </p>
            </div>
          </div>

          {/* 下层：四张小卡片 */}
          <div className="about-mini-grid">
            <div className="about-mini-card">
              <div className="about-mini-tag">智能分类</div>
              <h4>多维分类标签</h4>
              <p>自定义分类与标签体系，支持批量整理与跨类筛选</p>
            </div>
            <div className="about-mini-card">
              <div className="about-mini-tag">笔记沉淀</div>
              <h4>结构化笔记</h4>
              <p>富文本笔记编辑，支持 Markdown，思考与原文同栏沉淀</p>
            </div>
            <div className="about-mini-card">
              <div className="about-mini-tag">AI 资讯</div>
              <h4>每日 AI 简报</h4>
              <p>每日精选 AI 与行业资讯，跟得上一线最新动态</p>
            </div>
            <div className="about-mini-card">
              <div className="about-mini-tag">数据洞察</div>
              <h4>收藏行为统计</h4>
              <p>分类分布、来源分析、活跃趋势，量化你的知识增长</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============== Section 3：数据指标 ============== */}
      <section className="about-section about-section-stats">
        <div className="about-wide-inner">
          <div className="about-stats-grid">
            <div className="about-stat">
              <div className="about-stat-number">10<span>+</span></div>
              <div className="about-stat-label">核心功能模块</div>
            </div>
            <div className="about-stat">
              <div className="about-stat-number">AI</div>
              <div className="about-stat-label">大模型驱动摘要</div>
            </div>
            <div className="about-stat">
              <div className="about-stat-number">200<span>ms</span></div>
              <div className="about-stat-label">收藏入库平均响应</div>
            </div>
            <div className="about-stat">
              <div className="about-stat-number">100<span>%</span></div>
              <div className="about-stat-label">JWT 安全鉴权</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== Section 4：CTA ============== */}
      <section className="about-section about-section-cta-wrap">
        <div className="about-wide-inner">
          <div className="about-cta-card">
            <h2 className="about-cta-title">开启你的知识收藏之旅</h2>
            <p className="about-cta-desc">
              浏览发现广场中的公开收藏，或登录后管理「我的」收藏与分类。
            </p>
            <div className="about-cta-actions">
              <Button
                type="primary"
                size="large"
                icon={<CompassOutlined />}
                className="about-cta-explore-btn"
                onClick={() => setCurrentPage('discover')}
              >
                立即探索
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============== Footer ============== */}
      <footer className="about-footer">
        <div className="about-footer-inner">
          <div className="about-footer-brand">
            <img src="/logo3.png" alt="易普拉格" className="about-footer-logo" />
            <div>
              <div className="about-footer-name">易普拉格 · Linkbox</div>
              <div className="about-footer-slogan">让收藏成为你的知识资产</div>
            </div>
          </div>

          <div className="about-footer-links">
            <div className="about-footer-col">
              <h5>产品</h5>
              <span className="about-footer-line"><BookOutlined /> 我的收藏</span>
              <span className="about-footer-line"><CompassOutlined /> 发现广场</span>
              <span className="about-footer-line"><HomeOutlined /> 关于平台</span>
            </div>
            <div className="about-footer-col">
              <h5>能力</h5>
              <span className="about-footer-line"><RobotOutlined /> AI 摘要</span>
              <span className="about-footer-line"><TagsOutlined /> 分类管理</span>
              <span className="about-footer-line"><BarChartOutlined /> 数据统计</span>
            </div>
            <div className="about-footer-col">
              <h5>资源</h5>
              <span className="about-footer-line"><LinkOutlined /> 接口文档</span>
              <span className="about-footer-line"><FileTextOutlined /> 用户指南</span>
              <span className="about-footer-line"><TeamOutlined /> 关于我们</span>
            </div>
          </div>
        </div>
        <div className="about-footer-bottom">
          <span>© 2026 易普拉格 (Eplugger) · Linkbox 智能收藏管理平台</span>
          <span>Crafted with care · All rights reserved</span>
        </div>
      </footer>
    </div>
  );

  const renderHomeContent = () => (
    <div className="home-layout-wrapper">
      {/* Left: bookmarks area */}
      <div className="home-bookmarks-col">
        <div className="toolbar">
          <div className="toolbar-left">
            <Space wrap size={[8, 8]}>
              <Button
                type={categoryFilter === '' ? 'primary' : 'default'}
                onClick={() => setCategoryFilter('')}
                shape="round"
              >
                全部
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  type={categoryFilter === cat.id ? 'primary' : 'default'}
                  onClick={() => setCategoryFilter(cat.id)}
                  shape="round"
                >
                  {cat.name}
                </Button>
              ))}
            </Space>
            <Button
              icon={<FolderOutlined />}
              onClick={handleCategoryManage}
            />
          </div>
          <div className="toolbar-right">
            <Dropdown menu={{ items: sortMenuItems }} placement="bottomRight">
              <Button icon={<SortAscendingOutlined />} className="sort-btn">
                {currentSortLabel}
              </Button>
            </Dropdown>
            <Input.Search
              placeholder="搜索收藏..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: 240 }}
              allowClear
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddBookmark}
            >
              添加收藏
            </Button>
          </div>
        </div>
        <div className="home-bookmarks-content">
          {filteredBookmarks.length > 0 ? (
            <div className="bookmarks-waterfall">
              {filteredBookmarks.map(bookmark => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  categoryName={getCategoryName(bookmark.categoryId)}
                  onView={handleViewDetail}
                  onEdit={handleEditBookmark}
                  onDelete={handleDeleteBookmark}
                />
              ))}
            </div>
          ) : (
            <Empty
              className="empty-state"
              description={
                searchQuery
                  ? '没有找到匹配的收藏'
                  : categoryFilter
                    ? '当前分类暂无收藏'
                    : '还没有收藏'
              }
            >
              {!searchQuery && !categoryFilter && (
                isAuthenticated ? (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddBookmark}
                  >
                    添加收藏
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<UserOutlined />}
                    onClick={() => openLoginPage()}
                  >
                    登录后添加收藏
                  </Button>
                )
              )}
            </Empty>
          )}
        </div>
      </div>

      {/* Right: AI recommendation panel (fixed height, internal scroll) */}
      <div className="home-ai-col">
        <AiNewsSection />
      </div>
    </div>
  );

  const renderDiscoverContent = () => {
    return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          {discoverCategories.length > 0 && (
            <Space wrap size={[8, 8]}>
              <Button
                type={discoverCategoryFilter === '' ? 'primary' : 'default'}
                onClick={() => setDiscoverCategoryFilter('')}
                shape="round"
              >
                全部
              </Button>
              {discoverCategories.map(cat => (
                <Button
                  key={cat.id}
                  type={discoverCategoryFilter === cat.id ? 'primary' : 'default'}
                  onClick={() => setDiscoverCategoryFilter(cat.id)}
                  shape="round"
                >
                  {cat.name}
                </Button>
              ))}
            </Space>
          )}
        </div>
        <div className="toolbar-right">
          <Input.Search
            placeholder="搜索发现..."
            value={discoverSearchQuery}
            onChange={(e) => setDiscoverSearchQuery(e.target.value)}
            style={{ maxWidth: 240 }}
            allowClear
          />
        </div>
      </div>

      <Content className="app-content">
        {filteredDiscoverBookmarks.length > 0 ? (
          <div className="bookmarks-waterfall">
            {filteredDiscoverBookmarks.map(bookmark => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                categoryName={getDiscoverCategoryName(bookmark.categoryId)}
                onView={handleViewDetail}
                onEdit={() => {}}
                onDelete={() => {}}
                showActions={false}
              />
            ))}
          </div>
        ) : (
          <Empty
            className="empty-state"
            description={
              discoverSearchQuery || discoverCategoryFilter
                ? '没有找到匹配的发现'
                : '暂无发现内容'
            }
          />
        )}
      </Content>
    </>
  );
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: isDark ? darkTheme.token : lightTheme.token,
        components: isDark ? darkTheme.components : lightTheme.components
      }}
    >
      <Layout className="app-layout">
        <div className="bg-decoration">
          <div className="floating-dot dot-1" />
          <div className="floating-dot dot-2" />
          <div className="floating-dot dot-3" />
          <div className="floating-dot dot-4" />
        </div>

        <Header className="app-header">
          <div className="header-content">
            <div className="logo-brand" onClick={() => setCurrentPage('about')}>
              <img src="/logo3.png" alt="Linkbox" className="logo-img" />
              <span className="logo-name">Linkbox</span>
            </div>
            
            <Menu
              mode="horizontal"
              selectedKeys={[currentPage]}
              onClick={handleMenuClick}
              className="header-menu"
              items={[
                {
                  key: 'about',
                  icon: <HomeOutlined />,
                  label: '首页'
                },
                {
                  key: 'discover',
                  icon: <CompassOutlined />,
                  label: '发现'
                },
                ...(isAuthenticated ? [{
                  key: 'home',
                  icon: <BookOutlined />,
                  label: '我的'
                }] : []),
              ]}
            />
            
            <div className="header-right">
              {isAuthenticated && currentUser ? (
                <Space size={12}>
                  <Dropdown 
                    menu={{ items: userMenuItems, onClick: handleUserMenuClick }} 
                    placement="bottomRight"
                    trigger={['click']}
                  >
                    <div className="user-info" style={{ cursor: 'pointer' }}>
                      <UserAvatar
                        avatar={currentUser.avatar}
                        name={getUserDisplayName(currentUser)}
                        size={32}
                      />
                      <div className="user-info-text">
                        <span className="user-name">{getUserDisplayName(currentUser)}</span>
                        <span className="user-subtitle">{getUserSubtitle(currentUser)}</span>
                      </div>
                    </div>
                  </Dropdown>
                  {allowUserSwitch && (
                    <Button 
                      type="text" 
                      icon={isDark ? <SunOutlined /> : <MoonOutlined />} 
                      onClick={toggleTheme}
                      className="theme-toggle"
                    />
                  )}
                </Space>
              ) : (
                <Space size={8}>
                  <Button 
                    type="primary"
                    icon={<UserOutlined />}
                    onClick={() => openLoginPage()}
                    className="login-btn"
                  >
                    登录
                  </Button>
                  {allowUserSwitch && (
                    <Button 
                      type="text" 
                      icon={isDark ? <SunOutlined /> : <MoonOutlined />} 
                      onClick={toggleTheme}
                      className="theme-toggle"
                    />
                  )}
                </Space>
              )}
              <Tooltip title="管理后台（系统管理员可直接登录）">
                <Button 
                  type="text" 
                  icon={<SettingFilled />} 
                  onClick={() => {
                    if (isAuthenticated && canAccessAdminBackend(currentUser)) {
                      openAdminPanelAsUser();
                    } else {
                      openSystemAdminLogin();
                    }
                  }}
                  className="admin-btn"
                />
              </Tooltip>
            </div>
          </div>
        </Header>

        {currentPage === 'about' && renderAboutContent()}
        {currentPage === 'home' && renderHomeContent()}
        {currentPage === 'discover' && renderDiscoverContent()}

        <BookmarkModal
          open={bookmarkModalOpen}
          bookmark={editingBookmark}
          categories={categories}
          categoryCount={categories.length}
          onSave={handleSaveBookmark}
          onCancel={() => {
            setBookmarkModalOpen(false);
            setEditingBookmark(null);
          }}
          onAddCategory={() => {
            setBookmarkModalOpen(false);
            handleAddCategory(true);
          }}
        />

        <DetailModal
          open={detailModalOpen}
          bookmark={currentBookmark}
          categoryName={currentBookmark ? getCategoryName(currentBookmark.categoryId) : null}
          onClose={() => {
            setDetailModalOpen(false);
            setCurrentBookmark(null);
          }}
          onAddArticle={handleAddArticle}
          onEditArticle={handleEditArticle}
          onDeleteArticle={handleDeleteArticle}
          onArticleUpdate={(bookmarkId, articles) => {
            if (currentBookmark && currentBookmark.id === bookmarkId) {
              setCurrentBookmark({ ...currentBookmark, articles });
            }
          }}
          articleSaveSignal={articleSaveSignal}
          onTagAdded={(bookmarkId, newTag) => {
            if (currentBookmark && currentBookmark.id === bookmarkId) {
              const updatedTags = [...(currentBookmark.tags || []), newTag];
              setCurrentBookmark({ ...currentBookmark, tags: updatedTags });
            }
            refreshData();
          }}
        />

        <CategoryManageModal
          open={categoryManageModalOpen}
          categories={categories}
          bookmarks={bookmarks}
          onClose={() => {
            setCategoryManageModalOpen(false);
            setEditingCategory(null);
          }}
          editingCategory={editingCategory}
          onSave={handleSaveCategory}
          onDelete={handleDeleteCategory}
        />

        <ArticleModal
          open={articleModalOpen}
          article={editingArticle}
          defaultType={articleDefaultType}
          onSave={handleSaveArticle}
          onCancel={() => {
            setArticleModalOpen(false);
            setEditingArticle(null);
            if (currentBookmark) {
              const updated = getBookmarkById(currentBookmark.id);
              if (updated) setCurrentBookmark(updated);
            }
          }}
        />

        <AuthModal
          open={authModalOpen}
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => { refreshData(); }}
        />

        <ProfileModal
          open={profileModalOpen}
          user={currentUser ? { id: currentUser.id, username: currentUser.username, email: currentUser.email || '', avatar: currentUser.avatar, nickname: currentUser.nickname ?? null } : null}
          onClose={() => setProfileModalOpen(false)}
          onUpdated={(updated) => {
            patchSession(updated);
            refreshData();
          }}
        />

      </Layout>
    </ConfigProvider>
  );
}

export default App;
