import type { Bookmark, Category, Article, Note } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function getToken() {
  return localStorage.getItem('userToken');
}

function setToken(token: string) {
  localStorage.setItem('userToken', token);
}

function removeToken() {
  localStorage.removeItem('userToken');
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json();
  if (!response.ok || json.code !== 200) {
    throw new Error(json.message || '请求失败');
  }
  return json.data;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    avatar?: string;
  };
}

export interface ApiBookmark {
  id: number;
  userId?: number;
  title: string;
  url: string;
  description?: string;
  categoryId?: number;
  favicon?: string;
  thumbnail?: string;
  source?: string;
  tags?: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiCategory {
  id: number;
  name: string;
  icon?: string;
  parentId?: number;
  type: 'user' | 'discover';
  sort?: number;
  status: 'visible' | 'hidden';
  createdAt?: string;
}

export interface ApiArticle {
  id: number;
  bookmarkId?: number;
  title: string;
  url: string;
  description?: string;
  type: 'article' | 'video' | 'document' | 'link';
  pinned?: number;
  createdAt?: string;
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // fall through to comma split
    }
  }
  return trimmed.split(',').map(t => t.trim()).filter(Boolean);
}

function transformBookmark(api: ApiBookmark): Bookmark {
  return {
    id: String(api.id),
    title: api.title,
    url: api.url,
    description: api.description || '',
    categoryId: api.categoryId ? String(api.categoryId) : '',
    favicon: api.favicon || '',
    source: api.source || '',
    tags: parseTags(api.tags),
    thumbnail: api.thumbnail || '',
    articles: [],
    createdAt: api.createdAt || new Date().toISOString(),
    updatedAt: api.updatedAt || new Date().toISOString(),
  };
}

export interface ApiNote {
  id: number;
  bookmarkId: number;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

function transformNote(api: ApiNote): Note {
  return {
    id: String(api.id),
    bookmarkId: String(api.bookmarkId),
    content: api.content,
    createdAt: api.createdAt || new Date().toISOString(),
    updatedAt: api.updatedAt || new Date().toISOString(),
  };
}

export const userApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const result = await request<LoginResponse>('POST', '/api/user/login', data);
    setToken(result.token);
    return result;
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const result = await request<LoginResponse>('POST', '/api/user/register', data);
    setToken(result.token);
    return result;
  },

  logout() {
    removeToken();
    localStorage.removeItem('userInfo');
  },

  async getProfile() {
    return request<{ id: number; username: string; email: string; avatar?: string }>('GET', '/api/user/profile');
  },

  async getBookmarks(): Promise<Bookmark[]> {
    const data = await request<{ records: ApiBookmark[] }>('GET', '/api/user/bookmarks');
    return data.records.map(transformBookmark);
  },

  async createBookmark(bookmark: Partial<Bookmark>): Promise<Bookmark> {
    const tagsJson = bookmark.tags && bookmark.tags.length > 0 ? JSON.stringify(bookmark.tags) : '[]';
    const api = await request<ApiBookmark>('POST', '/api/user/bookmarks', {
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description,
      categoryId: bookmark.categoryId ? parseInt(bookmark.categoryId) : undefined,
      favicon: bookmark.favicon || '',
      tags: tagsJson,
    });
    return transformBookmark(api);
  },

  async updateBookmark(id: string, bookmark: Partial<Bookmark>): Promise<Bookmark> {
    const tagsJson = bookmark.tags && bookmark.tags.length > 0 ? JSON.stringify(bookmark.tags) : '[]';
    const api = await request<ApiBookmark>('PUT', `/api/user/bookmarks/${id}`, {
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description,
      categoryId: bookmark.categoryId ? parseInt(bookmark.categoryId) : undefined,
      favicon: bookmark.favicon || '',
      tags: tagsJson,
    });
    return transformBookmark(api);
  },

  async deleteBookmark(id: string): Promise<void> {
    return request<void>('DELETE', `/api/user/bookmarks/${id}`);
  },

  async getCategories(): Promise<Category[]> {
    const data = await request<ApiCategory[]>('GET', '/api/user/categories');
    return data.map(api => ({
      id: String(api.id),
      name: api.name,
      createdAt: api.createdAt || new Date().toISOString(),
    }));
  },

  async createCategory(name: string): Promise<Category> {
    const api = await request<ApiCategory>('POST', '/api/user/categories', { name });
    return {
      id: String(api.id),
      name: api.name,
      createdAt: api.createdAt || new Date().toISOString(),
    };
  },

  async updateCategory(id: string, name: string): Promise<Category> {
    const api = await request<ApiCategory>('PUT', `/api/user/categories/${id}`, { name });
    return {
      id: String(api.id),
      name: api.name,
      createdAt: api.createdAt || new Date().toISOString(),
    };
  },

  async deleteCategory(id: string): Promise<void> {
    return request<void>('DELETE', `/api/user/categories/${id}`);
  },

  async getArticles(bookmarkId: string): Promise<Article[]> {
    const data = await request<ApiArticle[]>('GET', `/api/user/bookmarks/${bookmarkId}/articles`);
    return data.map(a => ({
      id: String(a.id),
      title: a.title,
      url: a.url,
      description: a.description || '',
      type: a.type as Article['type'],
      pinned: Boolean(a.pinned),
      createdAt: a.createdAt || new Date().toISOString(),
    }));
  },

  async createArticle(bookmarkId: string, article: Partial<Article>): Promise<Article> {
    const api = await request<ApiArticle>('POST', `/api/user/bookmarks/${bookmarkId}/articles`, {
      title: article.title,
      url: article.url,
      description: article.description,
      type: article.type,
      pinned: article.pinned ? 1 : 0,
    });
    return {
      id: String(api.id),
      title: api.title,
      url: api.url,
      description: api.description || '',
      type: api.type as Article['type'],
      pinned: Boolean(api.pinned),
      createdAt: api.createdAt || new Date().toISOString(),
    };
  },

  async updateArticle(bookmarkId: string, articleId: string, article: Partial<Article>): Promise<Article> {
    const api = await request<ApiArticle>('PUT', `/api/user/bookmarks/${bookmarkId}/articles/${articleId}`, {
      title: article.title,
      url: article.url,
      description: article.description,
      type: article.type,
      pinned: article.pinned ? 1 : 0,
    });
    return {
      id: String(api.id),
      title: api.title,
      url: api.url,
      description: api.description || '',
      type: api.type as Article['type'],
      pinned: Boolean(api.pinned),
      createdAt: api.createdAt || new Date().toISOString(),
    };
  },

  async deleteArticle(bookmarkId: string, articleId: string): Promise<void> {
    return request<void>('DELETE', `/api/user/bookmarks/${bookmarkId}/articles/${articleId}`);
  },

  async getNotes(bookmarkId: string): Promise<Note[]> {
    const data = await request<ApiNote[]>('GET', `/api/user/bookmarks/${bookmarkId}/notes`);
    return data.map(transformNote);
  },

  async createNote(bookmarkId: string, content: string): Promise<Note> {
    const api = await request<ApiNote>('POST', `/api/user/bookmarks/${bookmarkId}/notes`, { content });
    return transformNote(api);
  },

  async updateNote(bookmarkId: string, noteId: string, content: string): Promise<void> {
    return request<void>('PUT', `/api/user/bookmarks/${bookmarkId}/notes/${noteId}`, { content });
  },

  async deleteNote(bookmarkId: string, noteId: string): Promise<void> {
    return request<void>('DELETE', `/api/user/bookmarks/${bookmarkId}/notes/${noteId}`);
  },

  async getDiscoverCategories(): Promise<Category[]> {
    const data = await request<ApiCategory[]>('GET', '/api/discover/categories');
    return data.map(api => ({
      id: String(api.id),
      name: api.name,
      createdAt: api.createdAt || new Date().toISOString(),
    }));
  },

  async getDiscoverBookmarks(): Promise<Bookmark[]> {
    const data = await request<ApiBookmark[]>('GET', '/api/discover/bookmarks');
    return data.map(transformBookmark);
  },

  getBaseUrl() {
    return API_BASE_URL;
  },

  // -------------------- 扩展认证 --------------------

  async sendVerificationCode(target: string, purpose: string): Promise<void> {
    return request<void>('POST', '/api/user/auth/send-code', { target, purpose });
  },

  async loginByEmail(email: string, password: string): Promise<LoginResponse> {
    const data = await request<{ user: LoginResponse['user']; token: string }>(
      'POST', '/api/user/auth/login-email', { email, password }
    );
    setToken(data.token);
    return data;
  },

  async loginByEmailCode(email: string, code: string): Promise<LoginResponse> {
    const data = await request<{ user: LoginResponse['user']; token: string }>(
      'POST', '/api/user/auth/login-email', { email, code }
    );
    setToken(data.token);
    return data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return request<void>('POST', '/api/user/auth/change-password', { oldPassword, newPassword });
  },

  // -------------------- 个人资料 --------------------

  async updateExtendedProfile(data: { nickname?: string; bio?: string; avatar?: string }): Promise<void> {
    return request<void>('PUT', '/api/user/profile/extended', data);
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/api/user/profile/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await response.json();
    if (!response.ok || json.code !== 200) throw new Error(json.message || '上传失败');
    return json.data;
  },

  // -------------------- 收藏统计 --------------------

  async getBookmarkStats(): Promise<import('../types').BookmarkStatsData> {
    return request<import('../types').BookmarkStatsData>('GET', '/api/user/stats/bookmarks');
  },

  // -------------------- AI 分析 --------------------

  async analyzeBookmark(bookmarkId: string): Promise<import('../types').BookmarkAnalysisResult> {
    return request<import('../types').BookmarkAnalysisResult>('POST', `/api/user/bookmarks/${bookmarkId}/analyze`);
  },

  // -------------------- AI 咨讯 --------------------

  async getAiNews(forceRefresh = false): Promise<import('../types').AiNewsItem[]> {
    const url = forceRefresh
      ? '/api/user/ai/news?refresh=true'
      : '/api/user/ai/news';
    return request<import('../types').AiNewsItem[]>('GET', url);
  },

  async refreshAiNews(): Promise<void> {
    return request<void>('GET', '/api/user/ai/news/clear-cache');
  },
};
