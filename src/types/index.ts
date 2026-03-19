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
  pinned: boolean;
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
  pinned: boolean;
  aiGenerated?: boolean;
}

export interface Note {
  id: string;
  bookmarkId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteFormData {
  content: string;
}

export interface URLMetadata {
  title: string;
  description: string;
  favicon: string;
  contentType: 'article' | 'video' | 'document' | 'link' | 'other';
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
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppDataWithDiscover extends AppData {
  discoverCategories: DiscoverCategory[];
  discoverBookmarks: DiscoverBookmark[];
}

export interface UserProfile {
  id: string;
  username: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  bio: string | null;
  deletePendingAt: string | null;
  createdAt: string;
}

export interface UserAuthBinding {
  id: string;
  authType: 'phone' | 'email' | 'wechat' | 'qq';
  authKey: string;
  createdAt: string;
}

export interface BookmarkStatsData {
  total: number;
  categoryDistribution: Record<string, number>;
  tagFrequency: Record<string, number>;
  recentTrend: { date: string; count: number }[];
}

export interface AIOrganizeSuggestion {
  id: string;
  suggestionType: 'uncategorized' | 'tag_merge' | 'stale_content' | 'general';
  content: {
    summary: string;
    uncategorizedCount?: number;
    tagMergeSuggestions?: { from: string; to: string; count: number }[];
    staleItems?: { id: string; title: string; lastSeen: string }[];
  };
  bookmarkIds: string[];
  status: 'unread' | 'applied' | 'ignored';
  createdAt: string;
}

export interface BookmarkAnalysisResult {
  summary: string;
  keyPoints: string[];
  suggestedTags: string[];
  categoryMatch: string;
  generatedAt: string;
}

export interface ContentRecommendation {
  id: string;
  title: string;
  url: string;
  description: string;
  favicon: string;
  tags: string[];
  source: 'internal' | 'external';
  reason: string;
  score: number;
}

export interface AiNewsItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  source?: string;
  publishedAt?: string;
}
