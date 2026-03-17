import { useState, useEffect, useCallback } from 'react';
import type { Category, Bookmark, Article, EnhancedBookmarkFormData, EnhancedArticleFormData, DiscoverBookmark, AppDataWithDiscover } from '../types';
import { userApi } from '../services/userApi';

const defaultSettings = { theme: 'light' as const, sortBy: 'date' as const, sortOrder: 'desc' as const };

function getFaviconFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
  } catch {
    return '';
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function useAppData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  
  const [data, setData] = useState<AppDataWithDiscover>({
    categories: [],
    bookmarks: [],
    settings: defaultSettings,
    discoverCategories: [],
    discoverBookmarks: []
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [discoverSearchQuery, setDiscoverSearchQuery] = useState('');
  const [discoverCategoryFilter, setDiscoverCategoryFilter] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const token = localStorage.getItem('userToken');
    console.log('loadData called, token:', !!token);
    
    // 先加载发现页面数据（不需要登录）
    let discoverCategories: Category[] = [];
    let discoverBookmarks: DiscoverBookmark[] = [];
    try {
      discoverCategories = await userApi.getDiscoverCategories();
      discoverBookmarks = await userApi.getDiscoverBookmarks();
      console.log('Discover data loaded');
    } catch (err) {
      console.error('Discover data load failed:', err);
    }
    
    // 如果有 token，加载用户数据
    if (token) {
      console.log('Loading user data with token...');
      try {
        const [bookmarks, categories] = await Promise.all([
          userApi.getBookmarks(),
          userApi.getCategories()
        ]);
        console.log('User data loaded, bookmarks:', bookmarks.length);
        
        setData({
          bookmarks,
          categories,
          settings: defaultSettings,
          discoverCategories,
          discoverBookmarks
        });
        setIsOnline(true);
        console.log('SUCCESS: isOnline = true');
      } catch (err) {
        console.error('User data load failed:', err);
        // 用户数据加载失败，但发现页面可能成功了
        setData(prev => ({
          ...prev,
          discoverCategories,
          discoverBookmarks
        }));
        // 不设置为 false，因为可能是临时网络问题
      }
    } else {
      console.log('No token, setting offline mode');
      setData({
        bookmarks: [],
        categories: [],
        settings: defaultSettings,
        discoverCategories,
        discoverBookmarks
      });
      setIsOnline(false);
    }
    
    setLoading(false);
    console.log('loadData completed, isOnline:', true);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isDuplicate = useCallback((url: string, excludeId?: string): boolean => {
    return data.bookmarks.some(b => b.url === url && b.id !== excludeId);
  }, [data.bookmarks]);

  const addBookmark = useCallback(async (bookmarkData: EnhancedBookmarkFormData): Promise<Bookmark | null> => {
    const token = localStorage.getItem('userToken');
    console.log('addBookmark called, isOnline:', isOnline, 'token exists:', !!token);
    
    if (isDuplicate(bookmarkData.url)) return null;

    // 如果有 token，尝试调用 API
    if (token) {
      console.log('Has token, calling API...');
      try {
        const created = await userApi.createBookmark(bookmarkData);
        console.log('Bookmark created:', created);
        setData(prev => ({
          ...prev,
          bookmarks: [created, ...prev.bookmarks]
        }));
        return created;
      } catch (err) {
        console.error('API call failed:', err);
        throw new Error('添加失败');
      }
    }

    console.log('No token, saving to localStorage (offline mode)...');
    const newBookmark: Bookmark = {
      id: generateId(),
      title: bookmarkData.title,
      url: bookmarkData.url,
      description: bookmarkData.description,
      categoryId: bookmarkData.categoryId,
      favicon: getFaviconFromUrl(bookmarkData.url),
      source: '',
      tags: bookmarkData.tags || [],
      articles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setData(prev => {
      const newData = {
        ...prev,
        bookmarks: [newBookmark, ...prev.bookmarks]
      };
      localStorage.setItem('bookmarkAppData', JSON.stringify(newData));
      return newData;
    });

    return newBookmark;
  }, [isOnline]);

  const updateBookmark = useCallback(async (id: string, updates: Partial<EnhancedBookmarkFormData>): Promise<Bookmark | null> => {
    let updatedBookmark: Bookmark | null = null;

    const existing = data.bookmarks.find(b => b.id === id);
    if (!existing) return null;
    
    if (updates.url && updates.url !== existing.url && isDuplicate(updates.url, id)) {
      return null;
    }

    updatedBookmark = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    if (isOnline) {
      try {
        const updated = await userApi.updateBookmark(id, updates);
        setData(prev => ({
          ...prev,
          bookmarks: [updated, ...prev.bookmarks.filter(b => b.id !== id)]
        }));
        return updated;
      } catch (err) {
        console.error('Failed to update bookmark:', err);
      }
    }

    setData(prev => {
      const newData = {
        ...prev,
        bookmarks: [updatedBookmark, ...prev.bookmarks.filter(b => b.id !== id)]
      };
      localStorage.setItem('bookmarkAppData', JSON.stringify(newData));
      return newData;
    });

    return updatedBookmark;
  }, [data.bookmarks, isDuplicate, isOnline]);

  const deleteBookmark = useCallback(async (id: string): Promise<boolean> => {
    if (isOnline) {
      try {
        await userApi.deleteBookmark(id);
      } catch (err) {
        console.error('Failed to delete bookmark:', err);
      }
    }

    setData(prev => {
      const newData = { ...prev, bookmarks: prev.bookmarks.filter(b => b.id !== id) };
      localStorage.setItem('bookmarkAppData', JSON.stringify(newData));
      return newData;
    });
    return true;
  }, [isOnline]);

  const addCategory = useCallback(async (name: string): Promise<Category> => {
    const newCategory: Category = { id: generateId(), name, createdAt: new Date().toISOString() };

    if (isOnline) {
      try {
        const created = await userApi.createCategory(name);
        setData(prev => ({
          ...prev,
          categories: [...prev.categories, created]
        }));
        return created;
      } catch (err) {
        console.error('Failed to create category:', err);
      }
    }

    setData(prev => {
      const newData = { ...prev, categories: [...prev.categories, newCategory] };
      localStorage.setItem('bookmarkAppData', JSON.stringify(newData));
      return newData;
    });

    return newCategory;
  }, [isOnline]);

  const updateCategory = useCallback(async (id: string, name: string): Promise<Category | null> => {
    let updatedCategory: Category | null = null;

    if (isOnline) {
      try {
        const updated = await userApi.updateCategory(id, name);
        updatedCategory = updated;
        setData(prev => ({
          ...prev,
          categories: [updated, ...prev.categories.filter(c => c.id !== id)]
        }));
        return updated;
      } catch (err) {
        console.error('Failed to update category:', err);
      }
    }

    setData(prev => {
      const index = prev.categories.findIndex(c => c.id === id);
      if (index === -1) return prev;
      updatedCategory = { ...prev.categories[index], name };
      const newData = {
        ...prev,
        categories: [updatedCategory, ...prev.categories.filter(c => c.id !== id)]
      };
      localStorage.setItem('bookmarkAppData', JSON.stringify(newData));
      return newData;
    });

    return updatedCategory;
  }, [isOnline]);

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    if (isOnline) {
      try {
        await userApi.deleteCategory(id);
      } catch (err) {
        console.error('Failed to delete category:', err);
      }
    }

    setData(prev => {
      const newData = {
        categories: prev.categories.filter(c => c.id !== id),
        bookmarks: prev.bookmarks.map(b => b.categoryId === id ? { ...b, categoryId: '' } : b),
        settings: prev.settings,
        discoverCategories: prev.discoverCategories,
        discoverBookmarks: prev.discoverBookmarks
      };
      localStorage.setItem('bookmarkAppData', JSON.stringify(newData));
      return newData;
    });
    return true;
  }, [isOnline]);

  const addArticle = useCallback(async (bookmarkId: string, articleData: EnhancedArticleFormData): Promise<Article | null> => {
    const newArticle: Article = {
      id: generateId(),
      title: articleData.title,
      url: articleData.url,
      description: articleData.description,
      type: articleData.type || 'link',
      pinned: articleData.pinned ?? false,
      createdAt: new Date().toISOString()
    };

    if (isOnline) {
      try {
        const created = await userApi.createArticle(bookmarkId, articleData);
        setData(prev => {
          const bookmarkIndex = prev.bookmarks.findIndex(b => b.id === bookmarkId);
          if (bookmarkIndex === -1) return prev;
          const updatedBookmarks = [...prev.bookmarks];
          updatedBookmarks[bookmarkIndex] = {
            ...updatedBookmarks[bookmarkIndex],
            articles: [...updatedBookmarks[bookmarkIndex].articles, created],
            updatedAt: new Date().toISOString()
          };
          return { ...prev, bookmarks: updatedBookmarks };
        });
        return created;
      } catch (err) {
        console.error('Failed to create article:', err);
      }
    }

    setData(prev => {
      const bookmarkIndex = prev.bookmarks.findIndex(b => b.id === bookmarkId);
      if (bookmarkIndex === -1) return prev;
      const updatedBookmarks = [...prev.bookmarks];
      updatedBookmarks[bookmarkIndex] = {
        ...updatedBookmarks[bookmarkIndex],
        articles: [...updatedBookmarks[bookmarkIndex].articles, newArticle],
        updatedAt: new Date().toISOString()
      };
      const newData = { ...prev, bookmarks: updatedBookmarks };
      localStorage.setItem('bookmarkAppData', JSON.stringify(newData));
      return newData;
    });

    return newArticle;
  }, [isOnline]);

  const updateArticle = useCallback(async (bookmarkId: string, articleId: string, updates: Partial<EnhancedArticleFormData>): Promise<Article | null> => {
    let updatedArticle: Article | null = null;

    if (isOnline) {
      try {
        const updated = await userApi.updateArticle(bookmarkId, articleId, updates);
        updatedArticle = updated;
        setData(prev => {
          const bookmarkIndex = prev.bookmarks.findIndex(b => b.id === bookmarkId);
          if (bookmarkIndex === -1) return prev;
          const articleIndex = prev.bookmarks[bookmarkIndex].articles.findIndex(a => a.id === articleId);
          if (articleIndex === -1) return prev;
          const updatedBookmarks = [...prev.bookmarks];
          updatedBookmarks[bookmarkIndex] = {
            ...updatedBookmarks[bookmarkIndex],
            articles: [updated, ...updatedBookmarks[bookmarkIndex].articles.filter(a => a.id !== articleId)],
            updatedAt: new Date().toISOString()
          };
          return { ...prev, bookmarks: updatedBookmarks };
        });
        return updated;
      } catch (err) {
        console.error('Failed to update article:', err);
      }
    }

    setData(prev => {
      const bookmarkIndex = prev.bookmarks.findIndex(b => b.id === bookmarkId);
      if (bookmarkIndex === -1) return prev;
      const articleIndex = prev.bookmarks[bookmarkIndex].articles.findIndex(a => a.id === articleId);
      if (articleIndex === -1) return prev;
      updatedArticle = { ...prev.bookmarks[bookmarkIndex].articles[articleIndex], ...updates };
      const updatedBookmarks = [...prev.bookmarks];
      updatedBookmarks[bookmarkIndex] = {
        ...updatedBookmarks[bookmarkIndex],
        articles: [updatedArticle, ...updatedBookmarks[bookmarkIndex].articles.filter(a => a.id !== articleId)],
        updatedAt: new Date().toISOString()
      };
      const newData = { ...prev, bookmarks: updatedBookmarks };
      localStorage.setItem('bookmarkAppData', JSON.stringify(newData));
      return newData;
    });

    return updatedArticle;
  }, [isOnline]);

  const deleteArticle = useCallback(async (bookmarkId: string, articleId: string): Promise<boolean> => {
    if (isOnline) {
      try {
        await userApi.deleteArticle(bookmarkId, articleId);
      } catch (err) {
        console.error('Failed to delete article:', err);
      }
    }

    setData(prev => {
      const bookmarkIndex = prev.bookmarks.findIndex(b => b.id === bookmarkId);
      if (bookmarkIndex === -1) return prev;
      const updatedBookmarks = [...prev.bookmarks];
      updatedBookmarks[bookmarkIndex] = {
        ...updatedBookmarks[bookmarkIndex],
        articles: updatedBookmarks[bookmarkIndex].articles.filter(a => a.id !== articleId),
        updatedAt: new Date().toISOString()
      };
      const newData = { ...prev, bookmarks: updatedBookmarks };
      localStorage.setItem('bookmarkAppData', JSON.stringify(newData));
      return newData;
    });
    return true;
  }, [isOnline]);

  const updateSortSettings = useCallback((sortBy: 'date' | 'source' | 'title', sortOrder: 'asc' | 'desc') => {
    setData(prev => {
      const newData = { ...prev, settings: { ...prev.settings, sortBy, sortOrder } };
      localStorage.setItem('bookmarkAppData', JSON.stringify(newData));
      return newData;
    });
  }, []);

  const getFilteredBookmarks = useCallback((): Bookmark[] => {
    let bookmarks = [...data.bookmarks];
    if (categoryFilter) bookmarks = bookmarks.filter(b => b.categoryId === categoryFilter);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      bookmarks = bookmarks.filter(bookmark => {
        if (bookmark.title.toLowerCase().includes(query)) return true;
        if (bookmark.description?.toLowerCase().includes(query)) return true;
        if (bookmark.url.toLowerCase().includes(query)) return true;
        if (bookmark.tags.some(tag => tag.toLowerCase().includes(query))) return true;
        if (bookmark.categoryId) {
          const category = data.categories.find(c => c.id === bookmark.categoryId);
          if (category?.name.toLowerCase().includes(query)) return true;
        }
        return false;
      });
    }
    const { sortBy, sortOrder } = data.settings;
    bookmarks.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date': comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case 'source': comparison = (a.source || '').localeCompare(b.source || ''); break;
        case 'title': comparison = a.title.localeCompare(b.title); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return bookmarks;
  }, [data, categoryFilter, searchQuery]);

  const getCategoryName = useCallback((categoryId: string | null): string | null => {
    if (!categoryId) return null;
    return data.categories.find(c => c.id === categoryId)?.name || null;
  }, [data.categories]);

  const getBookmarkById = useCallback((id: string): Bookmark | undefined => {
    return data.bookmarks.find(b => b.id === id);
  }, [data.bookmarks]);

  const getFilteredDiscoverBookmarks = useCallback((): DiscoverBookmark[] => {
    let bookmarks = [...data.discoverBookmarks];
    if (discoverCategoryFilter) bookmarks = bookmarks.filter(b => b.categoryId === discoverCategoryFilter);
    if (discoverSearchQuery) {
      const query = discoverSearchQuery.toLowerCase();
      bookmarks = bookmarks.filter(bookmark => {
        if (bookmark.title.toLowerCase().includes(query)) return true;
        if (bookmark.description?.toLowerCase().includes(query)) return true;
        if (bookmark.url.toLowerCase().includes(query)) return true;
        if (bookmark.tags.some(tag => tag.toLowerCase().includes(query))) return true;
        return false;
      });
    }
    bookmarks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return bookmarks;
  }, [data.discoverBookmarks, discoverCategoryFilter, discoverSearchQuery]);

  const getDiscoverCategoryName = useCallback((categoryId: string | null): string | null => {
    if (!categoryId) return null;
    return data.discoverCategories.find(c => c.id === categoryId)?.name || null;
  }, [data.discoverCategories]);

  return {
    loading,
    error,
    isOnline,
    categories: data.categories,
    bookmarks: data.bookmarks,
    settings: data.settings,
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
    isDuplicate,
    discoverCategories: data.discoverCategories,
    discoverBookmarks: data.discoverBookmarks,
    discoverSearchQuery,
    discoverCategoryFilter,
    setDiscoverSearchQuery,
    setDiscoverCategoryFilter,
    getFilteredDiscoverBookmarks,
    getDiscoverCategoryName,
    refreshData: loadData
  };
}
