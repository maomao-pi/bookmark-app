import type {
  AdminLoginResponse,
  AdminUser,
  ApiResponse,
  AppUser,
  ArticleItem,
  BookmarkItem,
  CategoryItem,
  DiscoverItem,
  OperationLogItem,
  PageData,
  UserDetailResponse,
} from '../types/admin';

export interface AdminClientConfig {
  baseUrl: string;
  token: string;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

function buildQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== '');
  if (entries.length === 0) {
    return '';
  }

  const search = new URLSearchParams();
  entries.forEach(([key, value]) => {
    search.append(key, String(value));
  });
  return `?${search.toString()}`;
}

export class AdminApi {
  private baseUrl: string;

  private token: string;

  constructor(config: AdminClientConfig) {
    this.baseUrl = config.baseUrl;
    this.token = config.token;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    console.log(`AdminApi request: ${method} ${this.baseUrl}${path}`, body);
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = (await response.json()) as ApiResponse<T>;
    console.log('AdminApi response:', json);
    if (!response.ok || json.code !== 200) {
      throw new Error(json.message || '请求失败');
    }
    return json.data;
  }

  static async login(baseUrl: string, username: string, password: string): Promise<AdminLoginResponse> {
    const response = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const json = (await response.json()) as ApiResponse<AdminLoginResponse>;
    if (!response.ok || json.code !== 200) {
      throw new Error(json.message || '登录失败');
    }
    return json.data;
  }

  getOverviewStats() {
    return this.request<Record<string, number>>('GET', '/api/admin/stats/overview').then(data => ({
      totalUsers: data.userCount || 0,
      todayLoginUsers: data.todayLoginUserCount || 0,
      totalBookmarks: data.bookmarkCount || 0,
      totalCategories: (data.categoryCount || 0) + (data.discoverCategoryCount || 0),
      totalArticles: data.articleCount || 0,
      todayUsers: data.todayUserCount || 0,
      todayBookmarks: data.todayBookmarkCount || 0,
    }));
  }

  getUserStats() {
    return this.request<Record<string, unknown>>('GET', '/api/admin/stats/users');
  }

  getBookmarkStats() {
    return this.request<Record<string, unknown>>('GET', '/api/admin/stats/bookmarks');
  }

  getUsers(params: { pageNum: number; pageSize: number; keyword?: string }) {
    return this.request<PageData<AppUser>>(
      'GET',
      `/api/admin/users${buildQuery({
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        keyword: params.keyword,
      })}`,
    );
  }

  getUserDetail(id: number) {
    return this.request<UserDetailResponse>('GET', `/api/admin/users/${id}/detail`);
  }

  createUser(payload: Partial<AppUser>) {
    return this.request<AppUser>('POST', '/api/admin/users', payload);
  }

  updateUser(id: number, payload: Partial<AppUser>) {
    return this.request<AppUser>('PUT', `/api/admin/users/${id}`, payload);
  }

  deleteUser(id: number) {
    return this.request<void>('DELETE', `/api/admin/users/${id}`);
  }

  updateUserStatus(id: number, status: 'active' | 'disabled') {
    return this.request<void>('PUT', `/api/admin/users/${id}/status${buildQuery({ status })}`);
  }

  updateUserPassword(id: number, newPassword: string) {
    return this.request<void>('PUT', `/api/admin/users/${id}/password`, { password: newPassword });
  }

  getBookmarks(params: {
    pageNum: number;
    pageSize: number;
    keyword?: string;
    categoryId?: number;
    userId?: number;
    source?: string;
  }) {
    return this.request<PageData<BookmarkItem>>(
      'GET',
      `/api/admin/bookmarks${buildQuery({
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        keyword: params.keyword,
        categoryId: params.categoryId,
        userId: params.userId,
        source: params.source,
      })}`,
    );
  }

  createBookmark(payload: Partial<BookmarkItem>) {
    return this.request<BookmarkItem>('POST', '/api/admin/bookmarks', payload);
  }

  updateBookmark(id: number, payload: Partial<BookmarkItem>) {
    return this.request<BookmarkItem>('PUT', `/api/admin/bookmarks/${id}`, payload);
  }

  deleteBookmark(id: number) {
    return this.request<void>('DELETE', `/api/admin/bookmarks/${id}`);
  }

  batchDeleteBookmarks(ids: number[]) {
    return this.request<void>('POST', '/api/admin/bookmarks/batch-delete', ids);
  }

  getCategories(params: { pageNum: number; pageSize: number; type?: 'user' | 'discover'; creatorKeyword?: string }) {
    return this.request<PageData<CategoryItem>>(
      'GET',
      `/api/admin/categories${buildQuery({
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        type: params.type,
        creatorKeyword: params.creatorKeyword,
      })}`,
    );
  }

  getAllCategories(type?: 'user' | 'discover') {
    return this.request<CategoryItem[]>('GET', `/api/admin/categories/all${buildQuery({ type })}`);
  }

  createCategory(payload: Partial<CategoryItem>) {
    console.log('Creating category with payload:', payload);
    return this.request<CategoryItem>('POST', '/api/admin/categories', payload);
  }

  updateCategory(id: number, payload: Partial<CategoryItem>) {
    return this.request<CategoryItem>('PUT', `/api/admin/categories/${id}`, payload);
  }

  updateCategorySort(id: number, sort: number) {
    return this.request<CategoryItem>('PUT', `/api/admin/categories/${id}/sort${buildQuery({ sort })}`);
  }

  deleteCategory(id: number) {
    return this.request<void>('DELETE', `/api/admin/categories/${id}`);
  }

  batchDeleteCategories(ids: number[]) {
    return this.request<void>('POST', '/api/admin/categories/batch-delete', ids);
  }

  removeDuplicateCategories(type?: 'user' | 'discover') {
    return this.request<{ deleted: number }>('POST', `/api/admin/categories/remove-duplicates${buildQuery({ type })}`);
  }

  getDiscoverList(params: {
    pageNum: number;
    pageSize: number;
    keyword?: string;
    categoryId?: number;
    status?: 'visible' | 'hidden';
    creatorKeyword?: string;
  }) {
    return this.request<PageData<DiscoverItem>>(
      'GET',
      `/api/admin/discover${buildQuery({
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        keyword: params.keyword,
        categoryId: params.categoryId,
        status: params.status,
        creatorKeyword: params.creatorKeyword,
      })}`,
    );
  }

  createDiscover(payload: Partial<DiscoverItem>) {
    return this.request<DiscoverItem>('POST', '/api/admin/discover', payload);
  }

  updateDiscover(id: number, payload: Partial<DiscoverItem>) {
    return this.request<DiscoverItem>('PUT', `/api/admin/discover/${id}`, payload);
  }

  deleteDiscover(id: number) {
    return this.request<void>('DELETE', `/api/admin/discover/${id}`);
  }

  removeDuplicateDiscover() {
    return this.request<{ deleted: number }>('POST', '/api/admin/discover/remove-duplicates');
  }

  batchDeleteDiscover(ids: number[]) {
    return this.request<void>('POST', '/api/admin/discover/batch-delete', ids);
  }

  batchUpdateDiscoverStatus(ids: number[], status: 'visible' | 'hidden') {
    return this.request<{ updated: number }>('PUT', '/api/admin/discover/batch-status', { ids, status });
  }

  batchUpdateDiscoverCategory(ids: number[], categoryId: number) {
    return this.request<{ updated: number }>('PUT', '/api/admin/discover/batch-category', { ids, categoryId });
  }

  getAllBookmarks() {
    return this.request<BookmarkItem[]>('GET', '/api/admin/bookmarks/all');
  }

  getUserContents(params: {
    pageNum: number;
    pageSize: number;
    keyword?: string;
    bookmarkId?: number;
    type?: 'article' | 'video' | 'document' | 'link';
    userId?: number;
    creatorKeyword?: string;
  }) {
    return this.request<PageData<ArticleItem>>(
      'GET',
      `/api/admin/contents/user${buildQuery({
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        keyword: params.keyword,
        bookmarkId: params.bookmarkId,
        type: params.type,
        userId: params.userId,
        creatorKeyword: params.creatorKeyword,
      })}`,
    );
  }

  getDiscoverContents(params: {
    pageNum: number;
    pageSize: number;
    keyword?: string;
    discoverBookmarkId?: number;
    type?: 'article' | 'video' | 'document' | 'link';
    creatorKeyword?: string;
  }) {
    return this.request<PageData<ArticleItem>>(
      'GET',
      `/api/admin/contents/discover${buildQuery({
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        keyword: params.keyword,
        discoverBookmarkId: params.discoverBookmarkId,
        type: params.type,
        creatorKeyword: params.creatorKeyword,
      })}`,
    );
  }

  createUserContent(payload: Partial<ArticleItem>) {
    return this.request<ArticleItem>('POST', '/api/admin/contents/user', payload);
  }

  createDiscoverContent(payload: Partial<ArticleItem>) {
    return this.request<ArticleItem>('POST', '/api/admin/contents/discover', payload);
  }

  updateUserContent(id: number, payload: Partial<ArticleItem>) {
    return this.request<ArticleItem>('PUT', `/api/admin/contents/user/${id}`, payload);
  }

  updateDiscoverContent(id: number, payload: Partial<ArticleItem>) {
    return this.request<ArticleItem>('PUT', `/api/admin/contents/discover/${id}`, payload);
  }

  deleteUserContent(id: number) {
    return this.request<void>('DELETE', `/api/admin/contents/user/${id}`);
  }

  deleteDiscoverContent(id: number) {
    return this.request<void>('DELETE', `/api/admin/contents/discover/${id}`);
  }

  batchDeleteUserContents(ids: number[]) {
    return this.request<void>('POST', '/api/admin/contents/user/batch-delete', ids);
  }

  batchDeleteDiscoverContents(ids: number[]) {
    return this.request<void>('POST', '/api/admin/contents/discover/batch-delete', ids);
  }

  getAllDiscoverBookmarks() {
    return this.request<DiscoverItem[]>('GET', '/api/admin/discover/all');
  }

  getSettings() {
    return this.request<Record<string, string>>('GET', '/api/admin/settings');
  }

  updateSettings(settings: Record<string, string>) {
    return this.request<Record<string, string>>('PUT', '/api/admin/settings', { settings });
  }

  testAiConnection(payload: { apiKey: string; baseUrl?: string; model?: string }) {
    return this.request<Record<string, unknown>>('POST', '/api/admin/settings/ai-test', payload);
  }

  getLogs(params: {
    pageNum: number;
    pageSize: number;
    adminId?: number;
    action?: string;
  }) {
    return this.request<PageData<OperationLogItem>>(
      'GET',
      `/api/admin/logs${buildQuery({
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        adminId: params.adminId,
        action: params.action,
      })}`,
    );
  }

  revertLog(id: number) {
    return this.request<void>('POST', `/api/admin/logs/${id}/revert`);
  }

  getAdmins(params: { pageNum: number; pageSize: number; keyword?: string; sortField?: string; sortOrder?: string }) {
    return this.request<PageData<AdminUser>>(
      'GET',
      `/api/admin/list${buildQuery({
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        keyword: params.keyword,
        sortField: params.sortField,
        sortOrder: params.sortOrder,
      })}`,
    );
  }

  createAdmin(payload: Partial<AdminUser>) {
    return this.request<AdminUser>('POST', '/api/admin', payload);
  }

  updateAdmin(id: number, payload: Partial<AdminUser>) {
    return this.request<AdminUser>('PUT', `/api/admin/${id}`, payload);
  }

  deleteAdmin(id: number) {
    return this.request<void>('DELETE', `/api/admin/${id}`);
  }

  getProfile() {
    return this.request<AdminUser>('GET', '/api/admin/profile');
  }

  updateProfile(payload: { username?: string; avatar?: string }) {
    return this.request<AdminUser>('PUT', '/api/admin/profile', payload);
  }

  updatePassword(payload: { oldPassword: string; newPassword: string }) {
    return this.request<void>('PUT', '/api/admin/password', payload);
  }

  updateAdminPermissions(id: number, permissions: string) {
    return this.request<AdminUser>('PUT', `/api/admin/${id}/permissions`, { permissions });
  }

  // -------------------- AI 分析日志 --------------------
  getAiAnalysisLogs(params: { pageNum: number; pageSize: number; userId?: number; analysisType?: string }) {
    return this.request<import('../types/admin').PageData<Record<string, unknown>>>(
      'GET',
      `/api/admin/ai/logs${buildQuery({ pageNum: params.pageNum, pageSize: params.pageSize, userId: params.userId, analysisType: params.analysisType })}`,
    );
  }

  // -------------------- 用户认证绑定 --------------------
  getUserAuthBindings(userId: number) {
    return this.request<Record<string, unknown>[]>('GET', `/api/admin/users/${userId}/auth-bindings`);
  }
}
