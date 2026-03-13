export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  description: string;
  type: 'article' | 'video' | 'document' | 'link';
  createdAt: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description: string;
  categoryId: string | null;
  favicon: string;
  thumbnail?: string;
  source?: string;
  tags: string[];
  articles: Article[];
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  theme: 'light' | 'dark';
  sortBy: 'date' | 'source' | 'title';
  sortOrder: 'asc' | 'desc';
}

export interface AppData {
  categories: Category[];
  bookmarks: Bookmark[];
  settings: Settings;
}

export interface BookmarkFormData {
  title: string;
  url: string;
  description: string;
  categoryId: string | null;
  favicon?: string;
  tags?: string[];
  thumbnail?: string;
}

export interface ArticleFormData {
  title: string;
  url: string;
  description: string;
  type: 'article' | 'video' | 'document' | 'link';
  aiGenerated?: boolean;
}

export interface URLMetadata {
  title: string;
  description: string;
  favicon: string;
  contentType: 'article' | 'video' | 'document' | 'tool' | 'other';
  suggestedTags: string[];
  suggestedCategory: string;
}

export interface AIDescriptionOption {
  style: '简洁' | '详细' | '功能导向';
  text: string;
}

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AIConfig {
  enabled: boolean;
  autoExtract: boolean;
  autoGenerate: boolean;
  requestTimeout: number;
}

export interface EnhancedBookmarkFormData extends BookmarkFormData {
  aiEnhanced?: boolean;
  aiGeneratedDescription?: boolean;
  aiGeneratedTags?: boolean;
}

export interface EnhancedArticleFormData extends ArticleFormData {
  aiEnhanced?: boolean;
  aiDetectedType?: boolean;
}

export type ThemeMode = 'light' | 'dark';

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface AIEnhancedBookmark extends Bookmark {
  aiGenerated?: boolean;
  aiMetadata?: {
    extractedAt: string;
    confidence: number;
    source: 'ai' | 'manual' | 'hybrid';
  };
}

export interface DiscoverCategory {
  id: string;
  name: string;
  icon?: string;
  createdAt: string;
}

export interface DiscoverBookmark {
  id: string;
  title: string;
  url: string;
  description: string;
  categoryId: string | null;
  favicon: string;
  thumbnail?: string;
  source?: string;
  tags: string[];
  articles: Article[];
  createdAt: string;
  updatedAt: string;
}

export interface AppDataWithDiscover extends AppData {
  discoverCategories: DiscoverCategory[];
  discoverBookmarks: DiscoverBookmark[];
}
