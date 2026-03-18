import { useState, useMemo } from 'react';
import { ConfigProvider, theme as antTheme, Layout, Input, Button, Empty, message, Dropdown, Avatar, Space, Menu, Tooltip, type MenuProps } from 'antd';
import { SunOutlined, MoonOutlined, PlusOutlined, FolderOutlined, SortAscendingOutlined, LogoutOutlined, UserOutlined, HomeOutlined, CompassOutlined, SettingOutlined, SettingFilled } from '@ant-design/icons';
import { useAppData } from './hooks/useAppData';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';

import { lightTheme, darkTheme } from './theme';
import { BookmarkCard } from './components/BookmarkCard';
import { BookmarkModal } from './components/BookmarkModal';
import { AuthModal } from './components/AuthModal';
import { DetailModal } from './components/DetailModal';
import { CategoryModal } from './components/CategoryModal';
import { CategoryManageModal } from './components/CategoryManageModal';
import { ArticleModal } from './components/ArticleModal';
import { ProfileModal } from './components/ProfileModal';
import { AiNewsSection } from './components/AiNewsSection';
import type { Bookmark, BookmarkFormData, Article, ArticleFormData, Category } from './types';
import './App.css';

const { Header, Content } = Layout;

type PageType = 'home' | 'discover';

function App() {
  const {
    categories,
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
  const { currentUser, isAuthenticated, logout } = useAuth();
  
  const [currentPage, setCurrentPage] = useState<PageType>('home');
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
  
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
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

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryManageModalOpen(false);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = (name: string) => {
    if (editingCategory) {
      updateCategory(editingCategory.id, name);
      message.success('分类已更新');
    } else {
      if (categories.some(c => c.name === name)) {
        message.error('分类名称已存在');
        return;
      }
      addCategory(name);
      message.success('分类已添加');
    }
    setCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (category: Category) => {
    deleteCategory(category.id);
    message.success('分类已删除');
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
      message.info('请前往管理后台配置系统设置');
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
                searchQuery || categoryFilter
                  ? '没有找到匹配的收藏'
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
            <div className="logo-brand" onClick={() => setCurrentPage('home')}>
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
                  key: 'home',
                  icon: <HomeOutlined />,
                  label: '首页'
                },
                {
                  key: 'discover',
                  icon: <CompassOutlined />,
                  label: '发现'
                },
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
                      <Avatar 
                        size={32} 
                        icon={<UserOutlined />} 
                        className="user-avatar"
                      />
                      <span className="user-name">{currentUser.username}</span>
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
              <Tooltip title="管理后台">
                <Button 
                  type="text" 
                  icon={<SettingFilled />} 
                  onClick={() => window.open('/admin.html', '_blank')}
                  className="admin-btn"
                />
              </Tooltip>
            </div>
          </div>
        </Header>

        {currentPage === 'home' && renderHomeContent()}
        {currentPage === 'discover' && renderDiscoverContent()}

        <BookmarkModal
          open={bookmarkModalOpen}
          bookmark={editingBookmark}
          categories={categories}
          onSave={handleSaveBookmark}
          onCancel={() => {
            setBookmarkModalOpen(false);
            setEditingBookmark(null);
          }}
          onAddCategory={() => {
            setBookmarkModalOpen(false);
            handleAddCategory();
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

        <CategoryModal
          open={categoryModalOpen}
          categoryName={editingCategory?.name}
          onSave={handleSaveCategory}
          onCancel={() => {
            setCategoryModalOpen(false);
            setEditingCategory(null);
          }}
        />

        <CategoryManageModal
          open={categoryManageModalOpen}
          categories={categories}
          bookmarks={filteredBookmarks}
          onClose={() => setCategoryManageModalOpen(false)}
          onAdd={() => {
            setCategoryManageModalOpen(false);
            handleAddCategory();
          }}
          onEdit={handleEditCategory}
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
          user={currentUser ? { id: currentUser.id, username: currentUser.username, email: currentUser.email || '', avatar: currentUser.avatar, nickname: (currentUser as unknown as { nickname?: string | null }).nickname ?? null } : null}
          onClose={() => setProfileModalOpen(false)}
          onUpdated={(updated) => {
            const info = localStorage.getItem('userInfo');
            if (info) {
              try {
                const parsed = JSON.parse(info);
                localStorage.setItem('userInfo', JSON.stringify({ ...parsed, ...updated }));
                refreshData();
              } catch { /* ignore */ }
            }
          }}
        />

      </Layout>
    </ConfigProvider>
  );
}

export default App;
