// GLM-4.6 AI服务集成 - 真实实API实现

// 运行时配置（由系统设置或 setConfig 注入）
export interface AIServiceConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
}

let runtimeConfig: AIServiceConfig | null = null;

const DEFAULT_AI_CONFIG: AIServiceConfig = {
  enabled: false,
  apiKey: '',
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  model: 'glm-4',
};

// 兼容旧字段名
const GLM_API_CONFIG = {
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  model: 'glm-4.6',
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
  } catch {
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
  } catch {
    // 忽略缓存错误
  }
};

// 内容类型检测
const detectContentTypeFromURL = (url: string): 'article' | 'video' | 'document' | 'tool' | 'other' => {
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
    return 'tool';
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
  } catch {
    return '';
  }
};

// 真实的 GLM API 调用（使用传入的 baseUrl/model 或运行时配置）
async function callGLMAPI(prompt: string, apiKey: string, baseUrl?: string, model?: string): Promise<string> {
  const url = baseUrl ?? runtimeConfig?.baseUrl ?? GLM_API_CONFIG.baseURL;
  const m = model ?? runtimeConfig?.model ?? GLM_API_CONFIG.model;
  const response = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: m,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API调用失败: ${response.status}`);
  }

  const data = await response.json();
  if (!data.choices || data.choices.length === 0) {
    throw new Error('API返回结果为空');
  }

  return data.choices[0].message.content;
}

// 获取 API 密钥：优先使用运行时配置（来自系统设置），其次本地/环境
const getApiKey = (): string | null => {
  if (typeof window !== 'undefined' && (window as any).__APP_GLM_API_KEY__) {
    return (window as any).__APP_GLM_API_KEY__;
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
      const aiResponse = await callGLMAPI(prompt, apiKey);
      let aiData: Partial<URLMetadata>;
      
      try {
        // 尝试解析JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('AI响应中未找到JSON');
        }
      } catch {
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

      const aiResponse = await callGLMAPI(prompt, apiKey);
      
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
      } catch {
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

      const aiResponse = await callGLMAPI(prompt, apiKey);
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
      } catch {
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
      
      // 映射到文章类型（无链接，tool/other 归为文档）
      const articleTypeMap = {
        'article': 'article',
        'video': 'video',
        'document': 'document',
        'tool': 'document',
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

  // 测试API连接
  static async testApiConnection(apiKey: string): Promise<AIResponse<{ status: string }>> {
    try {
      const response = await fetch(`${GLM_API_CONFIG.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`API连接失败: ${response.status}`);
      }

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
}

export default AIService;