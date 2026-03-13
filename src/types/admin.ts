export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageData<T> {
  records: T[];
  total: number;
  pageNum: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminLoginResponse {
  token: string;
  username: string;
  avatar?: string;
  role: 'super_admin' | 'admin';
  permissions?: string[];
}

export interface AdminUser {
  id: number;
  username: string;
  password?: string;
  avatar?: string;
  role: 'super_admin' | 'admin';
  status: 'active' | 'disabled';
  permissions?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface AppUser {
  id: number;
  username: string;
  email: string;
  password?: string;
  avatar?: string;
  role?: string;
  status: 'active' | 'disabled';
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  bookmarkCount?: number;
}

export interface BookmarkItem {
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

export interface CategoryItem {
  id: number;
  name: string;
  icon?: string;
  parentId?: number;
  type: 'user' | 'discover';
  sort?: number;
  status: 'visible' | 'hidden';
  createdAt?: string;
}

export interface DiscoverItem {
  id: number;
  categoryId?: number;
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  thumbnail?: string;
  source?: string;
  tags?: string;
  sort?: number;
  status: 'visible' | 'hidden';
  createdAt?: string;
  updatedAt?: string;
}

export interface ArticleItem {
  id: number;
  bookmarkId?: number;
  discoverBookmarkId?: number;
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  type: 'article' | 'video' | 'document' | 'link';
  createdAt?: string;
}

export interface OperationLogItem {
  id: number;
  adminId?: number;
  action: string;
  target?: string;
  targetId?: number;
  detail?: string;
  ip?: string;
  result: 'success' | 'failed';
  createdAt?: string;
}

export interface UserDetailResponse {
  user: AppUser;
  bookmarkCount: number;
  categoryDistribution: Record<string, number>;
  recentBookmarks: BookmarkItem[];
}
