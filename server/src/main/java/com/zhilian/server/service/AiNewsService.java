package com.zhilian.server.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zhilian.server.dto.AiNewsItemVO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AI 联网搜索推荐咨讯服务
 * 依赖系统设置：recommend.external.enabled、recommend.limit、ai.search.*
 * 支持多模型配置：ai.search.* 用于联网搜索功能
 */
@Service
public class AiNewsService {

    private static final Logger log = LoggerFactory.getLogger(AiNewsService.class);

    private final SystemSettingService systemSettingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** 内存缓存：咨讯列表 */
    private volatile List<AiNewsItemVO> cache = null;
    /** 缓存过期时间戳（毫秒） */
    private volatile long cacheExpireAt = 0;
    /** 缓存有效期：1 小时 */
    private static final long CACHE_TTL_MS = 3_600_000L;

    public AiNewsService(SystemSettingService systemSettingService) {
        this.systemSettingService = systemSettingService;
    }

    /**
     * 获取 AI 推荐咨讯列表。
     * 若 recommend.external.enabled=false 或联网搜索 AI 未配置，返回空列表。
     * 结果缓存 1 小时。
     */
    public List<AiNewsItemVO> getNews() {
        Map<String, String> settings = systemSettingService.getSettings();
        
        String externalEnabled = settings.getOrDefault("recommend.external.enabled",
                settings.getOrDefault("recommend.externalEnabled", "false"));
        if (!"true".equalsIgnoreCase(externalEnabled)) {
            log.info("[AiNewsService] 外部推荐已关闭");
            return Collections.emptyList();
        }

        // 优先使用 ai.search.* 配置（联网搜索模型）
        String searchEnabled = settings.getOrDefault("ai.search.enabled", "false");
        String apiKey = settings.getOrDefault("ai.search.apiKey", "");
        String baseUrl = settings.getOrDefault("ai.search.baseUrl", 
                settings.getOrDefault("ai.search.baseurl", ""));
        String model = settings.getOrDefault("ai.search.model", "");

        // 兼容旧配置：如果 ai.search.* 未配置，回退到 ai.*
        if (apiKey.isBlank()) {
            apiKey = settings.getOrDefault("ai.apiKey", 
                    settings.getOrDefault("ai.api.key", ""));
        }
        if (baseUrl.isBlank()) {
            baseUrl = settings.getOrDefault("ai.baseUrl", 
                    settings.getOrDefault("ai.base.url", 
                    settings.getOrDefault("ai.baseurl", 
                            "https://dashscope.aliyuncs.com/compatible-mode/v1")));
        }
        if (model.isBlank()) {
            model = settings.getOrDefault("ai.model", 
                    settings.getOrDefault("ai.modelName", "qwen3-search"));
        }

        // 检查是否启用了联网搜索
        if (!"true".equalsIgnoreCase(searchEnabled) && apiKey.isBlank()) {
            log.info("[AiNewsService] 联网搜索 AI 未配置 apiKey");
            return Collections.emptyList();
        }

        // 检查缓存
        long now = System.currentTimeMillis();
        if (cache != null && now < cacheExpireAt) {
            log.debug("[AiNewsService] 返回缓存数据: {} 条", cache.size());
            return cache;
        }

        // 调用 AI 获取咨讯
        try {
            int limit = parseLimit(settings.getOrDefault("recommend.limit", "8"));
            log.info("[AiNewsService] 开始获取 AI 咨讯: baseUrl={}, model={}, limit={}", baseUrl, model, limit);
            
            List<AiNewsItemVO> result = fetchNewsFromGlm(apiKey, baseUrl, model, limit);

            // 更新缓存
            cache = result;
            cacheExpireAt = now + CACHE_TTL_MS;
            log.info("[AiNewsService] 获取到 {} 条咨讯，已缓存", result.size());
            return result;
        } catch (Exception e) {
            log.error("获取 AI 咨讯失败: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /** 清除缓存（供测试或管理员手动触发使用） */
    public void clearCache() {
        cache = null;
        cacheExpireAt = 0;
    }

    private List<AiNewsItemVO> fetchNewsFromGlm(String apiKey, String baseUrl, String model, int limit) throws Exception {
        String prompt = "请搜索并推荐最新的 AI、科技、编程领域精选文章或资讯，要求：\n"
                + "1. 返回 " + limit + " 条内容\n"
                + "2. 严格按照以下 JSON 数组格式返回，不要包含任何其他文字或代码块标记：\n"
                + "[{\"title\":\"文章标题\",\"url\":\"https://...\",\"summary\":\"一句话摘要\",\"source\":\"来源网站\"}]\n"
                + "3. 优先选择 2025-2026 年的内容\n"
                + "4. 涵盖 AI 大模型、前端技术、开源工具等方向\n"
                + "5. 【重要】URL 必须是真实存在、当前可正常访问的链接，请优先使用知名网站（如 GitHub、掘金、InfoQ、CSDN、medium.com、dev.to 等）的真实文章 URL，不要生成无法访问的虚构链接";

        String content = callGlmApi(apiKey, baseUrl, model, prompt);
        return parseNewsJson(content, limit);
    }

    private String callGlmApi(String apiKey, String baseUrl, String model, String prompt) throws Exception {
        String endpoint = baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";
        URL url = new URL(endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Authorization", "Bearer " + apiKey);
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(60000);
        conn.setDoOutput(true);

        String escapedPrompt = objectMapper.writeValueAsString(prompt);
        String requestBody = "{\"model\":\"" + model + "\",\"messages\":[{\"role\":\"user\",\"content\":"
                + escapedPrompt + "}],\"max_tokens\":2048}";

        try (OutputStream os = conn.getOutputStream()) {
            os.write(requestBody.getBytes(StandardCharsets.UTF_8));
        }

        int statusCode = conn.getResponseCode();
        java.io.InputStream is = statusCode >= 400 ? conn.getErrorStream() : conn.getInputStream();
        String response;
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            response = br.lines().collect(Collectors.joining("\n"));
        }

        if (statusCode >= 400) {
            log.error("GLM API 返回错误: {}", response);
            throw new RuntimeException("GLM API 返回错误 " + statusCode);
        }

        JsonNode root = objectMapper.readTree(response);
        return root.path("choices").path(0).path("message").path("content").asText("");
    }

    private List<AiNewsItemVO> parseNewsJson(String content, int limit) {
        List<AiNewsItemVO> result = new ArrayList<>();
        try {
            // 尝试提取 JSON 数组（可能包裹在 markdown 代码块中）
            String json = content.trim();
            int start = json.indexOf('[');
            int end = json.lastIndexOf(']');
            if (start >= 0 && end > start) {
                json = json.substring(start, end + 1);
            } else {
                return result;
            }

            JsonNode array = objectMapper.readTree(json);
            if (!array.isArray()) return result;

            for (int i = 0; i < array.size() && i < limit; i++) {
                JsonNode item = array.get(i);
                String title = item.path("title").asText("").trim();
                String url = item.path("url").asText("").trim();
                String summary = item.path("summary").asText("").trim();
                String source = item.path("source").asText("").trim();

                if (title.isBlank() || url.isBlank()) continue;

                String id = "news_" + Math.abs(url.hashCode());
                result.add(new AiNewsItemVO(id, title, url, summary, source.isBlank() ? null : source));
            }
        } catch (Exception e) {
            log.error("[AiNewsService] 解析 AI 咨讯 JSON 失败: {}", e.getMessage(), e);
        }
        return result;
    }

    private int parseLimit(String value) {
        try {
            int v = Integer.parseInt(value.trim());
            return Math.max(1, Math.min(v, 20));
        } catch (NumberFormatException e) {
            return 8;
        }
    }
}
