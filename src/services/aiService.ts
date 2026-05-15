// AI服务集成 - 文本模型（Minimax Anthropic / OpenAI 兼容）与 Minimax 图片生成

// 扩展 Window 接口以支持全局 API 密钥
declare global {
  interface Window {
    __APP_GLM_API_KEY__?: string;
  }
}

import { logger } from '../utils/logger';

// 文本AI配置（由系统设置或 setConfig 注入）
export interface AIServiceConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
}

// 图片生成AI配置
export interface ImageAIConfig {
  enabled: boolean;
  apiKey: string;
  model: string;
}

let runtimeConfig: AIServiceConfig | null = null;
let imageRuntimeConfig: ImageAIConfig | null = null;

const DEFAULT_AI_CONFIG: AIServiceConfig = {
  enabled: false,
  apiKey: '',
  baseUrl: 'https://api.minimaxi.com/anthropic',
  model: 'MiniMax-M2.7',
};

const DEFAULT_IMAGE_CONFIG: ImageAIConfig = {
  enabled: false,
  apiKey: '',
  model: 'image-01',
};

// 兼容旧字段名（与后端 / 管理后台默认配置一致）
const GLM_API_CONFIG = {
  baseURL: 'https://api.minimaxi.com/anthropic',
  model: 'MiniMax-M2.7',
  timeout: 15000,
  maxRetries: 3
};

// 本地缓存
const CACHE_PREFIX = 'ai_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

// 类型定义
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

// 缓存管理
const getCache = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    
    return data;
  } catch (err) {
    logger.warn('aiService.getCache', 'Cache read error:', err);
    return null;
  }
};

const setCache = <T>(key: string, data: T): void => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheData));
  } catch (err) {
    logger.warn('aiService.setCache', 'Cache write error:', err);
  }
};

// 内容类型检测
const detectContentTypeFromURL = (url: string): 'article' | 'video' | 'document' | 'link' | 'other' => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube') || lowerUrl.includes('bilibili') || 
      lowerUrl.includes('vimeo') || lowerUrl.includes('youtu.be')) {
    return 'video';
  }
  
  if (lowerUrl.includes('pdf') || lowerUrl.includes('docs.google') || 
      lowerUrl.includes('notion') || lowerUrl.includes('github.com/blob')) {
    return 'document';
  }
  
  if (lowerUrl.includes('github') || lowerUrl.includes('codepen') || 
      lowerUrl.includes('jsfiddle') || lowerUrl.includes('codesandbox')) {
    return 'link';
  }
  
  if (lowerUrl.includes('medium') || lowerUrl.includes('dev.to') || 
      lowerUrl.includes('juejin') || lowerUrl.includes('zhihu') || 
      lowerUrl.includes('csdn')) {
    return 'article';
  }
  
  return 'other';
};

// 获取网站favicon
const getFaviconURL = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
  } catch (err) {
    logger.warn('aiService.getFaviconURL', 'Invalid URL:', url);
    return '';
  }
};

function isMinimaxAnthropicBaseUrl(baseUrl: string): boolean {
  const u = baseUrl.toLowerCase();
  return u.includes('minimaxi.com') || u.includes('minimax.io');
}

function resolveMinimaxMessagesEndpoint(baseUrl: string): string {
  let b = baseUrl.trim().replace(/\/+$/, '');
  if (b.toLowerCase().endsWith('/v1/messages')) return b;
  return `${b}/v1/messages`;
}

function resolveOpenAiChatEndpoint(baseUrl: string): string {
  let b = baseUrl.trim().replace(/\/+$/, '');
  if (b.toLowerCase().endsWith('/chat/completions')) return b;
  return `${b}/chat/completions`;
}

/** 文本模型：Minimax Anthropic /v1/messages 或 OpenAI 兼容 /chat/completions */
async function callTextAiApi(prompt: string, apiKey: string, baseUrl?: string, model?: string): Promise<string> {
  const urlBase = baseUrl ?? runtimeConfig?.baseUrl ?? GLM_API_CONFIG.baseURL;
  const m = model ?? runtimeConfig?.model ?? GLM_API_CONFIG.model;

  if (isMinimaxAnthropicBaseUrl(urlBase)) {
    const endpoint = resolveMinimaxMessagesEndpoint(urlBase);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: m,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        thinking: { type: 'disabled' },
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      content?: Array<{ type?: string; text?: string }>;
      error?: { message?: string } | string;
    };
    if (!response.ok) {
      const msg = data.error;
      const detail = typeof msg === 'string' ? msg : msg?.message;
      throw new Error(detail || `API调用失败: ${response.status}`);
    }
    const blocks = data.content;
    if (Array.isArray(blocks)) {
      const textBlock = blocks.find((b) => b.type === 'text');
      if (textBlock?.text) return textBlock.text;
    }
    throw new Error('API返回结果为空或格式非 text');
  }

  const endpoint = resolveOpenAiChatEndpoint(urlBase);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: m,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: { message?: string } }).error?.message || `API调用失败: ${response.status}`);
  }

  if (!(data as { choices?: unknown[] }).choices || (data as { choices: unknown[] }).choices.length === 0) {
    throw new Error('API返回结果为空');
  }

  return (data as { choices: Array<{ message: { content: string } }> }).choices[0].message.content;
}

// 获取 API 密钥：优先使用运行时配置（来自系统设置），其次本地/环境
const getApiKey = (): string | null => {
  if (typeof window !== 'undefined' && window.__APP_GLM_API_KEY__) {
    return window.__APP_GLM_API_KEY__;
  }
  if (runtimeConfig?.apiKey) return runtimeConfig.apiKey;
  return localStorage.getItem('glm_api_key');
};

// AI服务类
export class AIService {
  /** 从系统设置注入配置（由 useAI 在拉取 /api/settings/ai 后调用） */
  static setConfig(config: Partial<AIServiceConfig> | null): void {
    if (config === null) {
      runtimeConfig = null;
      return;
    }
    runtimeConfig = {
      ...DEFAULT_AI_CONFIG,
      ...runtimeConfig,
      ...config,
    };
  }

  static getConfig(): AIServiceConfig | null {
    return runtimeConfig ? { ...runtimeConfig } : null;
  }

  // 设置API密钥（兼容旧用法，写入本地）
  static setApiKey(key: string): void {
    localStorage.setItem('glm_api_key', key);
  }

  // 获取API密钥
  static getApiKey(): string | null {
    return getApiKey();
  }

  // 检查API密钥是否配置
  static isApiKeyConfigured(): boolean {
    return !!getApiKey();
  }

  // 设置图片AI配置（从系统设置注入）
  static setImageConfig(config: Partial<ImageAIConfig> | null): void {
    if (config === null) {
      imageRuntimeConfig = null;
      return;
    }
    imageRuntimeConfig = {
      ...DEFAULT_IMAGE_CONFIG,
      ...imageRuntimeConfig,
      ...config,
    };
  }

  static getImageConfig(): ImageAIConfig | null {
    return imageRuntimeConfig ? { ...imageRuntimeConfig } : null;
  }

  // 获取图片AI API密钥
  static getImageApiKey(): string | null {
    if (imageRuntimeConfig?.apiKey) return imageRuntimeConfig.apiKey;
    return localStorage.getItem('minimax_image_api_key');
  }

  // 设置图片AI密钥（兼容旧用法，写入本地）
  static setImageApiKey(key: string): void {
    localStorage.setItem('minimax_image_api_key', key);
  }

  // 检查图片AI密钥是否配置
  static isImageApiKeyConfigured(): boolean {
    return !!AIService.getImageApiKey();
  }

  // 提取URL元数据
  static async extractURLMetadata(url: string): Promise<AIResponse<URLMetadata>> {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        return { success: false, error: '未配置GLM API密钥，请在设置中配置' };
      }

      // 检查缓存
      const cacheKey = `metadata_${url}`;
      const cached = getCache<URLMetadata>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 基础元数据提取
      const contentType = detectContentTypeFromURL(url);
      const favicon = getFaviconURL(url);
      
      // 构建AI提示
      const prompt = `请分析这个网站URL: ${url}

请以JSON格式返回以下信息：
{
  "title": "网页标题",
  "description": "网站描述（50-100字，准确反映网站内容和功能）",
  "contentType": "article|video|document|tool|other",
  "suggestedTags": ["标签1", "标签2", "标签3"],
  "suggestedCategory": "建议分类"
}

注意：
1. 只返回JSON，不要其他文字
2. 如果无法访问网站，请基于URL模式进行合理推断
3. 描述要准确反映网站的主要功能和内容
4. 标签要简洁，2-4个字
5. 分类要符合常见的网站分类`;

      // 调用AI API
      const aiResponse = await callTextAiApi(prompt, apiKey);
      let aiData: Partial<URLMetadata>;
      
      try {
        // 尝试解析JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('AI响应中未找到JSON');
        }
      } catch (err) {
        logger.warn('aiService.extractURLMetadata', 'AI JSON parse failed, using fallback:', err);
        // AI解析失败，使用基础数据
        aiData = {
          title: new URL(url).hostname,
          description: '暂无描述'
        };
      }

      // 合并基础数据和AI数据
      const metadata: URLMetadata = {
        title: aiData.title || new URL(url).hostname,
        description: aiData.description || '暂无描述',
        favicon,
        contentType: aiData.contentType || contentType,
        suggestedTags: aiData.suggestedTags || ['网页'],
        suggestedCategory: aiData.suggestedCategory || '其他'
      };

      // 缓存结果
      setCache(cacheKey, metadata);
      
      return { success: true, data: metadata };
    } catch (error) {
      console.error('URL元数据提取失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 生成网站描述
  static async generateDescription(
    title: string, 
    url: string, 
    existingDescription?: string
  ): Promise<AIResponse<AIDescriptionOption[]>> {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        return { success: false, error: '未配置GLM API密钥' };
      }

      // 检查缓存
      const cacheKey = `description_${title}_${url}`;
      const cached = getCache<AIDescriptionOption[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const prompt = `基于以下信息生成3个不同风格的网站描述：

标题: ${title}
网址: ${url}
${existingDescription ? `现有描述: ${existingDescription}` : ''}

请以JSON数组格式返回：
[
  {"style": "简洁", "text": "30字以内的简洁描述"},
  {"style": "详细", "text": "50-100字的详细描述"},
  {"style": "功能导向", "text": "突出网站功能和价值的描述"}
]

注意：
1. 只返回JSON数组，不要其他文字
2. 描述要准确反映网站内容和价值
3. 避免使用营销性语言
4. 简洁版本控制在30字以内
5. 详细版本50-100字
6. 功能导向版本突出实用价值`;

      const aiResponse = await callTextAiApi(prompt, apiKey);
      
      let descriptions: AIDescriptionOption[] = [];
      try {
        // 尝试解析JSON
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          descriptions = JSON.parse(jsonMatch[0]);
          
          // 验证格式
          descriptions = descriptions.filter(desc => 
            desc.style && desc.text && 
            ['简洁', '详细', '功能导向'].includes(desc.style)
          );
        }
      } catch (err) {
        logger.warn('aiService.generateDescription', 'JSON parse failed, using defaults:', err);
        // 解析失败，生成默认描述
        descriptions = [
          { style: '简洁', text: `${title} - ${url}` },
          { style: '详细', text: `这是一个名为${title}的网站，提供相关服务和内容。` },
          { style: '功能导向', text: `${title}提供专业的在线服务，满足用户的相关需求。` }
        ];
      }

      // 缓存结果
      setCache(cacheKey, descriptions);
      
      return { success: true, data: descriptions };
    } catch (error) {
      console.error('描述生成失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 生成标签建议
  static async suggestTags(url: string, title: string): Promise<AIResponse<string[]>> {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        return { success: false, error: '未配置GLM API密钥' };
      }

      // 检查缓存
      const cacheKey = `tags_${url}_${title}`;
      const cached = getCache<string[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const prompt = `为以下网站生成5个相关标签：

网址: ${url}
标题: ${title}

请以JSON数组格式返回：
["标签1", "标签2", "标签3", "标签4", "标签5"]

注意：
1. 只返回JSON数组，不要其他文字
2. 标签要简洁准确，2-4个字
3. 包含网站类型、功能、领域等维度
4. 优先使用常见标签词`;

      const aiResponse = await callTextAiApi(prompt, apiKey);
      let tags: string[] = [];
      
      try {
        // 尝试解析JSON
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          tags = JSON.parse(jsonMatch[0]);
          
          // 过滤和验证标签
          tags = tags.filter(tag => 
            tag && typeof tag === 'string' && tag.length >= 2 && tag.length <= 6
          ).slice(0, 5);
        }
      } catch (err) {
        logger.warn('aiService.suggestTags', 'JSON parse failed, using defaults:', err);
        // 解析失败，使用基础标签
        tags = ['网页', '在线服务'];
      }

      // 确保至少有一个标签
      if (tags.length === 0) {
        tags = ['网页'];
      }

      // 缓存结果
      setCache(cacheKey, tags);
      
      return { success: true, data: tags };
    } catch (error) {
      console.error('标签生成失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 检测文章内容类型
  static async detectArticleContentType(url: string): Promise<AIResponse<'article' | 'video' | 'document'>> {
    try {
      // 基础规则检测
      const contentType = detectContentTypeFromURL(url);
      
      // 映射到文章类型（link/other 归为 document）
      const articleTypeMap = {
        'article': 'article',
        'video': 'video',
        'document': 'document',
        'link': 'document',
        'other': 'document'
      };

      return {
        success: true,
        data: articleTypeMap[contentType] as 'article' | 'video' | 'document'
      };
    } catch (error) {
      console.error('内容类型检测失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 清除缓存
  static clearCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  // 测试文本 API（与当前系统设置中的 baseUrl/model 一致；Minimax 走 /v1/messages）
  static async testApiConnection(apiKey: string): Promise<AIResponse<{ status: string }>> {
    try {
      await callTextAiApi('ping', apiKey);
      return {
        success: true,
        data: { status: '连接成功' }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API连接失败'
      };
    }
  }

  // 生成图片（使用 Minimax image-01 模型生成网站图标）
  static async generateImage(
    title: string,
    _imageUrl?: string // 预留参数，Minimax暂不支持图生图
  ): Promise<AIResponse<string>> {
    try {
      const apiKey = AIService.getImageApiKey();
      if (!apiKey) {
        return { success: false, error: '未配置Minimax API密钥，请在系统设置中配置' };
      }

      const imageConfig = AIService.getImageConfig();
      const model = imageConfig?.model || DEFAULT_IMAGE_CONFIG.model;

      // 构建更适合图标生成的prompt - 彩色扁平化logo风格
      const prompt = `为"${title}"设计一个现代简约风格的logo图标。
要求：
- 扁平化设计，简洁大方
- 必须有彩色背景色（选择能体现"${title}"主题的颜色）
- 图标主体要简单几何化，体现"${title}"的核心含义
- 不要包含任何文字或字母
- 使用鲜艳活泼的现代配色方案
- 尺寸适合48x48像素的小图标显示
- 风格参考：Notion、Linear、Vercel等现代App图标风格`;

      // Minimax image generation API (注意：是 minimaxi.com 不是 minimax.io)
      const baseUrl = 'https://api.minimaxi.com/v1';
      const requestBody = {
        model: model,
        prompt: prompt,
        aspect_ratio: '1:1',
        response_format: 'base64',
      };

      const response = await fetch(`${baseUrl}/image_generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Minimax API error:', response.status, errorData);
        throw new Error(errorData.error?.message || `图片生成失败: ${response.status}`);
      }

      const data = await response.json();
      console.log('Minimax image generation response:', response.status, data);

      // Minimax返回格式: { data: { image_base64: [...] } } 或 { data: { image_urls: [...] } }
      if (data.data?.image_base64 && data.data.image_base64.length > 0) {
        const base64Image = `data:image/png;base64,${data.data.image_base64[0]}`;
        return { success: true, data: base64Image };
      } else if (data.data?.image_urls && data.data.image_urls.length > 0) {
        // 如果返回的是URL格式，直接返回URL
        return { success: true, data: data.data.image_urls[0] };
      } else if (data.data?.image_base64) {
        // 处理空数组情况
        throw new Error('图片生成失败：未返回有效图片');
      } else {
        console.error('Unexpected response structure:', data);
        throw new Error('图片生成返回格式异常');
      }
    } catch (error) {
      console.error('图片生成失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '图片生成失败'
      };
    }
  }
}

export default AIService;