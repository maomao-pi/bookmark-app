import type {
  AdminLoginResponse,
  AdminUser,
  AppUser,
  ArticleItem,
  BookmarkItem,
  CategoryItem,
  DiscoverItem,
  OperationLogItem,
  PageData,
  UserDetailResponse,
} from '../types/admin';

const MOCK_USERS: AppUser[] = [
  { id: 1, username: '张三', email: 'zhangsan@example.com', status: 'active', bookmarkCount: 15, createdAt: '2024-01-15T10:00:00' },
  { id: 2, username: '李四', email: 'lisi@example.com', status: 'active', bookmarkCount: 8, createdAt: '2024-02-20T14:30:00' },
  { id: 3, username: '王五', email: 'wangwu@example.com', status: 'disabled', bookmarkCount: 23, createdAt: '2024-03-10T09:15:00' },
];

const MOCK_BOOKMARKS: BookmarkItem[] = [
  { id: 1, userId: 1, title: 'React 官方文档', url: 'https://react.dev', description: 'React 官方文档', categoryId: 1, source: 'user', createdAt: '2024-01-20T10:00:00' },
  { id: 2, userId: 1, title: 'TypeScript 手册', url: 'https://www.typescriptlang.org/docs/', description: 'TypeScript 学习手册', categoryId: 1, source: 'user', createdAt: '2024-01-25T15:30:00' },
  { id: 3, userId: 2, title: 'Vue.js', url: 'https://vuejs.org', description: '渐进式 JavaScript 框架', categoryId: 2, source: 'user', createdAt: '2024-02-01T09:00:00' },
  { id: 4, title: 'MDN Web Docs', url: 'https://developer.mozilla.org', description: 'Mozilla 开发者网络', categoryId: 3, source: 'admin', createdAt: '2024-03-01T10:00:00' },
  { id: 5, title: 'GitHub', url: 'https://github.com', description: '全球最大代码托管平台', categoryId: 4, source: 'admin', createdAt: '2024-03-05T11:00:00' },
];

const MOCK_CATEGORIES: CategoryItem[] = [
  { id: 1, name: '前端开发', type: 'user', sort: 1, status: 'visible', createdAt: '2024-01-01T00:00:00' },
  { id: 2, name: '后端开发', type: 'user', sort: 2, status: 'visible', createdAt: '2024-01-01T00:00:00' },
  { id: 3, name: '技术文档', type: 'user', sort: 3, status: 'visible', createdAt: '2024-01-01T00:00:00' },
  { id: 4, name: '开发工具', type: 'discover', sort: 1, status: 'visible', createdAt: '2024-01-01T00:00:00' },
  { id: 5, name: '技术博客', type: 'discover', sort: 2, status: 'visible', createdAt: '2024-01-01T00:00:00' },
];

const MOCK_DISCOVER: DiscoverItem[] = [
  { id: 1, categoryId: 4, title: 'Stack Overflow', url: 'https://stackoverflow.com', description: '程序员问答社区', sort: 1, status: 'visible', createdAt: '2024-03-01T10:00:00' },
  { id: 2, categoryId: 4, title: 'CodePen', url: 'https://codepen.io', description: '前端代码实验场', sort: 2, status: 'visible', createdAt: '2024-03-02T10:00:00' },
  { id: 3, categoryId: 5, title: '掘金', url: 'https://juejin.cn', description: '开发者社区', sort: 1, status: 'visible', createdAt: '2024-03-03T10:00:00' },
];

const MOCK_ARTICLES: ArticleItem[] = [
  { id: 1, bookmarkId: 1, title: 'React Hooks 详解', url: 'https://react.dev/reference/react', type: 'article', createdAt: '2024-01-20T10:00:00' },
  { id: 2, bookmarkId: 1, title: 'React 教程视频', url: 'https://youtube.com/react', type: 'video', createdAt: '2024-01-21T10:00:00' },
  { id: 3, bookmarkId: 3, title: 'Vue3 文档', url: 'https://vuejs.org/guide/', type: 'document', createdAt: '2024-02-01T10:00:00' },
];

const MOCK_LOGS: OperationLogItem[] = [
  { id: 1, adminId: 1, action: '用户登录', target: '管理员', detail: '成功登录系统', ip: '127.0.0.1', result: 'success', createdAt: '2024-03-05T10:00:00' },
  { id: 2, adminId: 1, action: '删除收藏', target: '收藏 ID:5', detail: '删除用户收藏', ip: '127.0.0.1', result: 'success', createdAt: '2024-03-04T15:30:00' },
  { id: 3, adminId: 1, action: '修改设置', target: '系统设置', detail: '更新 AI 配置', ip: '127.0.0.1', result: 'success', createdAt: '2024-03-03T09:00:00' },
];

const MOCK_ADMINS: AdminUser[] = [
  { id: 1, username: 'admin', role: 'super_admin', status: 'active', createdAt: '2024-01-01T00:00:00', lastLoginAt: '2024-03-05T10:00:00' },
  { id: 2, username: 'editor', role: 'admin', status: 'active', createdAt: '2024-02-01T00:00:00', lastLoginAt: '2024-03-04T16:00:00' },
];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makePageData<T>(data: T[], pageNum: number, pageSize: number): PageData<T> {
  const start = (pageNum - 1) * pageSize;
  const end = start + pageSize;
  return {
    records: data.slice(start, end),
    total: data.length,
    pageNum,
    pageSize,
    totalPages: Math.ceil(data.length / pageSize),
  };
}

export class MockAdminApi {
  async login(username: string, password: string): Promise<AdminLoginResponse> {
    await delay(500);
    if (username === 'admin' && password === 'admin123') {
      return {
        token: 'mock-token-' + Date.now(),
        username: 'admin',
        role: 'super_admin',
      };
    }
    throw new Error('用户名或密码错误');
  }

  async getOverviewStats(): Promise<Record<string, number>> {
    await delay(300);
    return {
      totalUsers: MOCK_USERS.length,
      totalBookmarks: MOCK_BOOKMARKS.length,
      totalCategories: MOCK_CATEGORIES.length,
      totalArticles: MOCK_ARTICLES.length,
      todayUsers: 2,
      todayBookmarks: 5,
    };
  }

  async getUsers(params: { pageNum: number; pageSize: number; keyword?: string }): Promise<PageData<AppUser>> {
    await delay(300);
    let filtered = MOCK_USERS;
    if (params.keyword) {
      filtered = filtered.filter(u => 
        u.username.includes(params.keyword!) || 
        u.email.includes(params.keyword!)
      );
    }
    return makePageData(filtered, params.pageNum, params.pageSize);
  }

  async getUserDetail(id: number): Promise<UserDetailResponse> {
    await delay(300);
    const user = MOCK_USERS.find(u => u.id === id);
    const bookmarks = MOCK_BOOKMARKS.filter(b => b.userId === id);
    return {
      user: user || MOCK_USERS[0],
      bookmarkCount: bookmarks.length,
      categoryDistribution: { '前端开发': 5, '后端开发': 3 },
      recentBookmarks: bookmarks.slice(0, 5),
    };
  }

  async updateUserStatus(id: number, status: 'active' | 'disabled'): Promise<void> {
    await delay(300);
    const user = MOCK_USERS.find(u => u.id === id);
    if (user) user.status = status;
  }

  async deleteUser(id: number): Promise<void> {
    await delay(300);
    const index = MOCK_USERS.findIndex(u => u.id === id);
    if (index > -1) MOCK_USERS.splice(index, 1);
  }

  async getBookmarks(params: { pageNum: number; pageSize: number; keyword?: string; categoryId?: number; source?: string }): Promise<PageData<BookmarkItem>> {
    await delay(300);
    let filtered = [...MOCK_BOOKMARKS];
    if (params.keyword) {
      filtered = filtered.filter(b => 
        b.title.includes(params.keyword!) || 
        b.url.includes(params.keyword!)
      );
    }
    if (params.categoryId) {
      filtered = filtered.filter(b => b.categoryId === params.categoryId);
    }
    if (params.source) {
      filtered = filtered.filter(b => b.source === params.source);
    }
    return makePageData(filtered, params.pageNum, params.pageSize);
  }

  async updateBookmark(id: number, payload: Partial<BookmarkItem>): Promise<BookmarkItem> {
    await delay(300);
    const bookmark = MOCK_BOOKMARKS.find(b => b.id === id);
    if (bookmark) Object.assign(bookmark, payload);
    return bookmark || MOCK_BOOKMARKS[0];
  }

  async deleteBookmark(id: number): Promise<void> {
    await delay(300);
    const index = MOCK_BOOKMARKS.findIndex(b => b.id === id);
    if (index > -1) MOCK_BOOKMARKS.splice(index, 1);
  }

  async getCategories(params: { pageNum: number; pageSize: number; type?: 'user' | 'discover' }): Promise<PageData<CategoryItem>> {
    await delay(300);
    let filtered = MOCK_CATEGORIES;
    if (params.type) {
      filtered = filtered.filter(c => c.type === params.type);
    }
    return makePageData(filtered, params.pageNum, params.pageSize);
  }

  async getAllCategories(type?: 'user' | 'discover'): Promise<CategoryItem[]> {
    await delay(200);
    if (type) return MOCK_CATEGORIES.filter(c => c.type === type);
    return MOCK_CATEGORIES;
  }

  async createCategory(payload: Partial<CategoryItem>): Promise<CategoryItem> {
    await delay(300);
    const newCategory: CategoryItem = {
      id: Date.now(),
      name: payload.name || '新分类',
      type: payload.type || 'user',
      sort: payload.sort || 99,
      status: 'visible',
      createdAt: new Date().toISOString(),
    };
    MOCK_CATEGORIES.push(newCategory);
    return newCategory;
  }

  async updateCategory(id: number, payload: Partial<CategoryItem>): Promise<CategoryItem> {
    await delay(300);
    const category = MOCK_CATEGORIES.find(c => c.id === id);
    if (category) Object.assign(category, payload);
    return category || MOCK_CATEGORIES[0];
  }

  async updateCategorySort(id: number, sort: number): Promise<CategoryItem> {
    await delay(200);
    return this.updateCategory(id, { sort });
  }

  async deleteCategory(id: number): Promise<void> {
    await delay(300);
    const index = MOCK_CATEGORIES.findIndex(c => c.id === id);
    if (index > -1) MOCK_CATEGORIES.splice(index, 1);
  }

  async getDiscoverList(params: { pageNum: number; pageSize: number; keyword?: string; categoryId?: number; status?: 'visible' | 'hidden' }): Promise<PageData<DiscoverItem>> {
    await delay(300);
    let filtered = [...MOCK_DISCOVER];
    if (params.keyword) {
      filtered = filtered.filter(d => d.title.includes(params.keyword!));
    }
    if (params.categoryId) {
      filtered = filtered.filter(d => d.categoryId === params.categoryId);
    }
    if (params.status) {
      filtered = filtered.filter(d => d.status === params.status);
    }
    return makePageData(filtered, params.pageNum, params.pageSize);
  }

  async createDiscover(payload: Partial<DiscoverItem>): Promise<DiscoverItem> {
    await delay(300);
    const newItem: DiscoverItem = {
      id: Date.now(),
      title: payload.title || '新发现',
      url: payload.url || '',
      categoryId: payload.categoryId,
      sort: payload.sort || 99,
      status: payload.status || 'visible',
      createdAt: new Date().toISOString(),
    };
    MOCK_DISCOVER.push(newItem);
    return newItem;
  }

  async updateDiscover(id: number, payload: Partial<DiscoverItem>): Promise<DiscoverItem> {
    await delay(300);
    const item = MOCK_DISCOVER.find(d => d.id === id);
    if (item) Object.assign(item, payload);
    return item || MOCK_DISCOVER[0];
  }

  async deleteDiscover(id: number): Promise<void> {
    await delay(300);
    const index = MOCK_DISCOVER.findIndex(d => d.id === id);
    if (index > -1) MOCK_DISCOVER.splice(index, 1);
  }

  async getArticles(params: { pageNum: number; pageSize: number; keyword?: string; type?: string }): Promise<PageData<ArticleItem>> {
    await delay(300);
    let filtered = [...MOCK_ARTICLES];
    if (params.keyword) {
      filtered = filtered.filter(a => a.title.includes(params.keyword!));
    }
    if (params.type) {
      filtered = filtered.filter(a => a.type === params.type);
    }
    return makePageData(filtered, params.pageNum, params.pageSize);
  }

  async createArticle(payload: Partial<ArticleItem>): Promise<ArticleItem> {
    await delay(300);
    const newArticle: ArticleItem = {
      id: Date.now(),
      title: payload.title || '新文章',
      url: payload.url || '',
      type: payload.type || 'article',
      createdAt: new Date().toISOString(),
    };
    MOCK_ARTICLES.push(newArticle);
    return newArticle;
  }

  async updateArticle(id: number, payload: Partial<ArticleItem>): Promise<ArticleItem> {
    await delay(300);
    const article = MOCK_ARTICLES.find(a => a.id === id);
    if (article) Object.assign(article, payload);
    return article || MOCK_ARTICLES[0];
  }

  async deleteArticle(id: number): Promise<void> {
    await delay(300);
    const index = MOCK_ARTICLES.findIndex(a => a.id === id);
    if (index > -1) MOCK_ARTICLES.splice(index, 1);
  }

  async getSettings(): Promise<Record<string, string>> {
    await delay(200);
    return {
      'theme.defaultMode': 'light',
      'theme.allowUserSwitch': 'true',
      'ai.enabled': 'false',
      'ai.apiKey': '',
      'ai.baseUrl': 'https://open.bigmodel.cn/api/paas/v4',
      'ai.model': 'glm-4',
    };
  }

  async updateSettings(settings: Record<string, string>): Promise<Record<string, string>> {
    await delay(300);
    return settings;
  }

  async testAiConnection(_payload: { apiKey: string; baseUrl?: string; model?: string }): Promise<Record<string, unknown>> {
    await delay(500);
    return { success: true };
  }

  async getLogs(params: { pageNum: number; pageSize: number; action?: string }): Promise<PageData<OperationLogItem>> {
    await delay(300);
    let filtered = [...MOCK_LOGS];
    if (params.action) {
      filtered = filtered.filter(l => l.action.includes(params.action!));
    }
    return makePageData(filtered, params.pageNum, params.pageSize);
  }

  async getAdmins(params: { pageNum: number; pageSize: number; keyword?: string }): Promise<PageData<AdminUser>> {
    await delay(300);
    let filtered = MOCK_ADMINS;
    if (params.keyword) {
      filtered = filtered.filter(a => a.username.includes(params.keyword!));
    }
    return makePageData(filtered, params.pageNum, params.pageSize);
  }

  async createAdmin(payload: Partial<AdminUser>): Promise<AdminUser> {
    await delay(300);
    const newAdmin: AdminUser = {
      id: Date.now(),
      username: payload.username || 'newadmin',
      role: payload.role || 'admin',
      status: payload.status || 'active',
      createdAt: new Date().toISOString(),
    };
    MOCK_ADMINS.push(newAdmin);
    return newAdmin;
  }

  async updateAdmin(id: number, payload: Partial<AdminUser>): Promise<AdminUser> {
    await delay(300);
    const admin = MOCK_ADMINS.find(a => a.id === id);
    if (admin) Object.assign(admin, payload);
    return admin || MOCK_ADMINS[0];
  }

  async deleteAdmin(id: number): Promise<void> {
    await delay(300);
    const index = MOCK_ADMINS.findIndex(a => a.id === id);
    if (index > -1) MOCK_ADMINS.splice(index, 1);
  }

  async getProfile(): Promise<AdminUser> {
    await delay(200);
    return MOCK_ADMINS[0];
  }
}
