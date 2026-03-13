import { useState, useEffect, useCallback } from 'react';
import { publicSettingsApi } from '../services/publicSettingsApi';
import type { ThemeMode } from '../types';

const STORAGE_KEY = 'bookmarkAppData';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [allowUserSwitch, setAllowUserSwitch] = useState(true);

  // 应用主题到DOM
  const applyTheme = useCallback((themeMode: ThemeMode) => {
    if (themeMode === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  // 初始化主题：优先使用系统设置，再考虑本地保存
  useEffect(() => {
    let mounted = true;

    const applyInitial = (mode: ThemeMode) => {
      if (mounted) {
        setThemeState(mode);
        applyTheme(mode);
      }
    };

    const init = async () => {
      try {
        const server = await publicSettingsApi.getThemeSettings();
        if (!mounted) return;
        setAllowUserSwitch(server.allowUserSwitch);

        const savedData = localStorage.getItem(STORAGE_KEY);
        let savedTheme: ThemeMode | undefined;
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            savedTheme = parsed.settings?.theme === 'dark' ? 'dark' : parsed.settings?.theme === 'light' ? 'light' : undefined;
          } catch {
            // ignore
          }
        }

        if (server.allowUserSwitch && savedTheme !== undefined) {
          applyInitial(savedTheme);
        } else {
          applyInitial(server.defaultMode);
        }
      } catch {
        // 后端不可用或未配置：沿用原有 localStorage 逻辑
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            if (parsed.settings?.theme) {
              const mode = parsed.settings.theme === 'dark' ? 'dark' : 'light';
              applyInitial(mode);
            }
          } catch {
            // 使用默认 light
          }
        }
      }
    };

    init();
    return () => { mounted = false; };
  }, [applyTheme]);

  // 切换主题
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
    applyTheme(newTheme);

    // 保存到localStorage
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        parsed.settings = { ...parsed.settings, theme: newTheme };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      } catch {
        // 忽略错误
      }
    }
  }, [theme, applyTheme]);

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    allowUserSwitch,
  };
}
