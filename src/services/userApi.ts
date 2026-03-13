import type { Bookmark, Category, Article } from '../types';

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
  createdAt?: string;
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
    tags: api.tags ? api.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    thumbnail: api.thumbnail || '',
    articles: [],
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
      createdAt: a.createdAt || new Date().toISOString(),
    }));
  },

  async createArticle(bookmarkId: string, article: Partial<Article>): Promise<Article> {
    const api = await request<ApiArticle>('POST', `/api/user/bookmarks/${bookmarkId}/articles`, {
      title: article.title,
      url: article.url,
      description: article.description,
      type: article.type,
    });
    return {
      id: String(api.id),
      title: api.title,
      url: api.url,
      description: api.description || '',
      type: api.type as Article['type'],
      createdAt: api.createdAt || new Date().toISOString(),
    };
  },

  async updateArticle(bookmarkId: string, articleId: string, article: Partial<Article>): Promise<Article> {
    const api = await request<ApiArticle>('PUT', `/api/user/bookmarks/${bookmarkId}/articles/${articleId}`, {
      title: article.title,
      url: article.url,
      description: article.description,
      type: article.type,
    });
    return {
      id: String(api.id),
      title: api.title,
      url: api.url,
      description: api.description || '',
      type: api.type as Article['type'],
      createdAt: api.createdAt || new Date().toISOString(),
    };
  },

  async deleteArticle(bookmarkId: string, articleId: string): Promise<void> {
    return request<void>('DELETE', `/api/user/bookmarks/${bookmarkId}/articles/${articleId}`);
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
  }
};
