import { useState, useCallback, useRef, useEffect } from 'react';
import { AIService, type URLMetadata, type AIDescriptionOption } from '../services/aiService';
import { publicSettingsApi } from '../services/publicSettingsApi';

// AI功能配置
interface AIConfig {
  enabled: boolean;
  autoExtract: boolean;
  autoGenerate: boolean;
  requestTimeout: number;
}

// AI状态管理
export function useAI() {
  const [config, setConfig] = useState<AIConfig>({
    enabled: false,
    autoExtract: true,
    autoGenerate: true,
    requestTimeout: 8000
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 从系统设置拉取 AI 配置并应用到 AIService
  useEffect(() => {
    let mounted = true;
    publicSettingsApi.getAiSettings()
      .then((ai) => {
        if (!mounted) return;
        AIService.setConfig({
          enabled: ai.enabled,
          apiKey: ai.apiKey,
          baseUrl: ai.baseUrl,
          model: ai.model,
        });
        setConfig(prev => ({ ...prev, enabled: ai.enabled }));
      })
      .catch(() => {
        if (!mounted) return;
        setConfig(prev => ({ ...prev, enabled: false }));
      });
    return () => { mounted = false; };
  }, []);

  // 防抖函数
  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => ReturnType<T> | Promise<ReturnType<T>>) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      return new Promise<ReturnType<T>>((resolve, reject) => {
        timeout = setTimeout(() => {
          try {
            const result = func(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, wait);
      });
    };
  };

  // 提取URL元数据
  const extractMetadata = useCallback(async (url: string): Promise<URLMetadata | null> => {
    if (!config.enabled || !url) return null;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const result = await AIService.extractURLMetadata(url);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || '提取元数据失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      console.error('提取URL元数据失败:', err);
      return null;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [config.enabled]);

  // 生成描述选项
  const generateDescriptions = useCallback(async (
    title: string,
    url: string,
    existingDescription?: string
  ): Promise<AIDescriptionOption[] | null> => {
    if (!config.enabled || !title) return null;

    setIsLoading(true);
    setError(null);

    try {
      const result = await AIService.generateDescription(title, url, existingDescription);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || '生成描述失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      console.error('生成描述失败:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [config.enabled]);

  // 生成标签建议
  const suggestTags = useCallback(async (url: string, title: string): Promise<string[] | null> => {
    if (!config.enabled || !url) return null;

    try {
      const result = await AIService.suggestTags(url, title);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || '生成标签失败');
      }
    } catch (err) {
      console.error('生成标签失败:', err);
      return null;
    }
  }, [config.enabled]);

  // 检测文章内容类型
  const detectArticleType = useCallback(async (url: string): Promise<'article' | 'video' | 'document' | null> => {
    if (!config.enabled || !url) return null;

    try {
      const result = await AIService.detectArticleContentType(url);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || '检测内容类型失败');
      }
    } catch (err) {
      console.error('检测内容类型失败:', err);
      return null;
    }
  }, [config.enabled]);

  // 防抖版本的元数据提取
  const debouncedExtractMetadata = useCallback(
    debounce(extractMetadata, 800),
    [extractMetadata]
  );

  // 更新配置
  const updateConfig = useCallback((newConfig: Partial<AIConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 取消当前请求
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    cancelRequest();
    setError(null);
  }, [cancelRequest]);

  return {
    // 状态
    config,
    isLoading,
    error,
    
    // 功能方法
    extractMetadata,
    debouncedExtractMetadata,
    generateDescriptions,
    suggestTags,
    detectArticleType,
    
    // 配置方法
    updateConfig,
    
    // 工具方法
    clearError,
    cancelRequest,
    reset
  };
}

// 预设AI配置
export const AI_DEFAULT_CONFIG: AIConfig = {
  enabled: true,
  autoExtract: true,
  autoGenerate: true,
  requestTimeout: 8000
};

export default useAI;