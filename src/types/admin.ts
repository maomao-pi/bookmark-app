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
  id: number;
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
  nickname?: string;
  phone?: string;
  password?: string;
  avatar?: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  permissions?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  bookmarkCount?: number;
}

// 用户权限结构 - 菜单级别和标签页级别
export interface UserMenuPermissions {
  dashboard?: boolean;
  users?: boolean;
  bookmarks?: boolean;
  discover?: boolean;
  categories?: boolean;
  articles?: boolean;
  logs?: boolean;
  settings?: boolean;
  admins?: boolean;
}

export interface UserTabPermissions {
  bookmarks?: {
    list?: boolean;
    add?: boolean;
    edit?: boolean;
    delete?: boolean;
    batchDelete?: boolean;
  };
  categories?: {
    list?: boolean;
    add?: boolean;
    edit?: boolean;
    delete?: boolean;
    removeDuplicates?: boolean;
  };
  articles?: {
    list?: boolean;
    add?: boolean;
    edit?: boolean;
    delete?: boolean;
  };
  discover?: {
    list?: boolean;
    add?: boolean;
    edit?: boolean;
    delete?: boolean;
    batchDelete?: boolean;
    batchStatus?: boolean;
    removeDuplicates?: boolean;
  };
  logs?: {
    list?: boolean;
    revert?: boolean;
  };
  users?: {
    list?: boolean;
    add?: boolean;
    edit?: boolean;
    delete?: boolean;
    view?: boolean;
    resetPassword?: boolean;
    changeRole?: boolean;
    configurePermissions?: boolean;
  };
  settings?: {
    view?: boolean;
    edit?: boolean;
    testAi?: boolean;
  };
  admins?: {
    list?: boolean;
    add?: boolean;
    edit?: boolean;
    delete?: boolean;
    resetPassword?: boolean;
    configurePermissions?: boolean;
  };
}

export interface UserPermissions {
  menus?: UserMenuPermissions;
  tabs?: UserTabPermissions;
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
  createdById?: number;
  createdByType?: 'user' | 'admin';
  createdByName?: string;
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
  pinned?: number;
  createdById?: number;
  createdByType?: 'user' | 'admin';
  createdByName?: string;
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
  pinned?: number;
  createdByName?: string;
  sourceType?: 'user' | 'discover';
  createdAt?: string;
}

export interface OperationLogItem {
  id: number;
  adminId?: number;
  operatorName?: string;
  action: string;
  actionText?: string;
  target?: string;
  targetId?: number;
  detail?: string;
  ip?: string;
  result: 'success' | 'failed';
  revocable?: number;
  reverted?: number;
  revertParentId?: number;
  revertedAt?: string;
  createdAt?: string;
}

export interface UserDetailResponse {
  user: AppUser;
  bookmarkCount: number;
  categoryDistribution: Record<string, number>;
  recentBookmarks: BookmarkItem[];
}

export type NotificationType = 'user_register' | 'new_bookmark' | 'new_article' | 'system_alert';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  content: string;
  targetType: string | null;
  targetId: number | null;
  relatedUserId: number | null;
  relatedUsername: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}
