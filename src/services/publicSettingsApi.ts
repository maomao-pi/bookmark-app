/**
 * 用户端拉取系统设置（无需登录）
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface ThemeSettings {
  defaultMode: 'light' | 'dark';
  allowUserSwitch: boolean;
}

export interface AiSettings {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  const json = await res.json();
  if (json.code !== 200 || json.data == null) {
    throw new Error(json.message || '请求失败');
  }
  return json.data as T;
}

export const publicSettingsApi = {
  async getThemeSettings(): Promise<ThemeSettings> {
    const data = await fetchJson<Record<string, string>>('/api/settings/theme');
    return {
      defaultMode: (data['theme.defaultMode'] === 'dark' ? 'dark' : 'light') as 'light' | 'dark',
      allowUserSwitch: data['theme.allowUserSwitch'] === undefined ? true : data['theme.allowUserSwitch'] === 'true',
    };
  },

  async getAiSettings(): Promise<AiSettings> {
    const data = await fetchJson<Record<string, string>>('/api/settings/ai');
    return {
      enabled: data['ai.enabled'] === 'true',
      apiKey: data['ai.apiKey'] || '',
      baseUrl: data['ai.baseUrl'] || 'https://open.bigmodel.cn/api/paas/v4',
      model: data['ai.model'] || 'glm-4',
    };
  },
};
