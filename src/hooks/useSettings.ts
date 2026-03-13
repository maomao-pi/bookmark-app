import { useState, useCallback } from 'react';
import { AIService } from '../services/aiService';

export function useSettings() {
  const [isConfigured, setIsConfigured] = useState(AIService.isApiKeyConfigured());

  const checkApiKeyStatus = useCallback(() => {
    setIsConfigured(AIService.isApiKeyConfigured());
  }, []);

  const configureApiKey = useCallback((apiKey: string) => {
    AIService.setApiKey(apiKey);
    setIsConfigured(true);
  }, []);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem('glm_api_key');
    setIsConfigured(false);
  }, []);

  const getApiKey = useCallback(() => {
    return AIService.getApiKey();
  }, []);

  return {
    isConfigured,
    checkApiKeyStatus,
    configureApiKey,
    clearApiKey,
    getApiKey
  };
}