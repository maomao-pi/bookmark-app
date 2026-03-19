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
 * AI 推荐咨讯服务
 * <p>
 * 支持两种模型模式：
 * <ul>
 *   <li>联网搜索模式（ai.search.enabled=true）：调用联网搜索模型，返回真实可访问的链接</li>
 *   <li>文本生成模式（默认）：调用文本生成模型，链接为 AI 推断，可能无效</li>
 * </ul>
 * 外部推荐总开关：recommend.external.enabled=true 时生效
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
     * <p>
     * 逻辑流程：
     * 1. 检查外部推荐总开关（recommend.external.enabled）
     * 2. 判断是否使用联网搜索模型（ai.search.enabled）
     * 3. 读取对应模型的 apiKey / baseUrl / model 配置
     * 4. 检查缓存有效性
     * 5. 调用 AI API 并缓存结果，每条结果附加 modelSource 字段
     */
    public List<AiNewsItemVO> getNews() {
        Map<String, String> settings = systemSettingService.getSettings();

        // 外部推荐总开关（兼容新旧键名）
        String externalEnabled = settings.getOrDefault("recommend.external.enabled",
                settings.getOrDefault("recommend.externalEnabled", "false"));
        if (!"true".equalsIgnoreCase(externalEnabled)) {
            log.info("[AiNewsService] 外部推荐已关闭 (recommend.external.enabled=false)");
            return Collections.emptyList();
        }

        // 判断使用哪种模型
        boolean useSearchModel = "true".equalsIgnoreCase(settings.getOrDefault("ai.search.enabled", "false"));

        String apiKey;
        String baseUrl;
        String model;
        final String modelType;

        if (useSearchModel) {
            // 联网搜索模型分支
            apiKey = settings.getOrDefault("ai.search.apiKey", "");
            baseUrl = settings.getOrDefault("ai.search.baseUrl",
                    settings.getOrDefault("ai.search.baseurl",
                            "https://dashscope.aliyuncs.com/compatible-mode/v1"));
            model = settings.getOrDefault("ai.search.model", "");
            modelType = "search";

            if (apiKey.isBlank()) {
                log.warn("[AiNewsService] 联网搜索已启用 (ai.search.enabled=true) 但未配置 apiKey，请在系统设置中配置 ai.search.apiKey");
                return Collections.emptyList();
            }
            if (model.isBlank()) {
                model = "qwen3-search";
            }
            log.info("[AiNewsService] 使用[联网搜索模型: {}]", model);
        } else {
            // 文本生成模型分支（兼容旧配置键）
            apiKey = settings.getOrDefault("ai.text.apiKey",
                    settings.getOrDefault("ai.apiKey",
                            settings.getOrDefault("ai.api.key", "")));
            baseUrl = settings.getOrDefault("ai.text.baseUrl",
                    settings.getOrDefault("ai.baseUrl",
                            settings.getOrDefault("ai.base.url",
                                    "https://dashscope.aliyuncs.com/compatible-mode/v1")));
            model = settings.getOrDefault("ai.text.model",
                    settings.getOrDefault("ai.model",
                            settings.getOrDefault("ai.modelName", "qwen3-plus")));
            modelType = "text";

            if (apiKey.isBlank()) {
                log.info("[AiNewsService] 文本 AI 未配置 apiKey (ai.text.apiKey)，跳过推荐");
                return Collections.emptyList();
            }
            log.info("[AiNewsService] 使用[文本生成模型: {}]", model);
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
            log.info("[AiNewsService] 开始获取 AI 咨讯: [{}模型: {}], baseUrl={}, limit={}",
                    useSearchModel ? "联网搜索" : "文本生成", model, baseUrl, limit);

            List<AiNewsItemVO> result = fetchNewsFromAi(apiKey, baseUrl, model, limit, modelType);

            // 更新缓存
            cache = result;
            cacheExpireAt = now + CACHE_TTL_MS;
            log.info("[AiNewsService] 获取到 {} 条咨讯，已缓存 [{}模型: {}]",
                    result.size(), useSearchModel ? "联网搜索" : "文本生成", model);
            return result;
        } catch (Exception e) {
            log.error("[AiNewsService] 获取 AI 咨讯失败 [{}模型: {}]: {}", modelType, model, e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /** 清除缓存（管理员修改设置或用户手动刷新时调用） */
    public void clearCache() {
        cache = null;
        cacheExpireAt = 0;
        log.info("[AiNewsService] 推荐缓存已清除");
    }

    private List<AiNewsItemVO> fetchNewsFromAi(String apiKey, String baseUrl, String model,
                                                int limit, String modelType) throws Exception {
        boolean isSearchMode = "search".equals(modelType);
        String prompt = isSearchMode
                ? "联网搜索并推荐 " + limit + " 条最新的 AI、科技、编程领域精选文章。\n"
                  + "必须返回真实可访问的 URL，无效链接会导致用户投诉。\n"
                  + "优先选择：github.com, dev.to, medium.com, react.dev, vite.dev, nextjs.org, blog.langchain.dev, huggingface.co/blog。\n"
                  + "JSON 格式：[{\"title\":\"标题\",\"url\":\"真实URL\",\"summary\":\"摘要\",\"source\":\"来源\"}]\n"
                  + "不要返回推测的 URL，不要返回 404 的链接。"
                : "推荐 " + limit + " 条最新的 AI、科技、编程领域精选文章。\n"
                  + "优先选择有效域名：github.com, dev.to, medium.com, react.dev, vite.dev\n"
                  + "JSON 格式：[{\"title\":\"标题\",\"url\":\"URL\",\"summary\":\"摘要\",\"source\":\"来源\"}]";

        String content = callAiApi(apiKey, baseUrl, model, prompt, isSearchMode);
        return parseNewsJson(content, limit, isSearchMode);
    }

    private String callAiApi(String apiKey, String baseUrl, String model, String prompt,
                              boolean enableSearch) throws Exception {
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
        // enable_search=true 激活阿里云百炼模型的联网搜索能力（qwen3-max 等支持此参数）
        String searchParam = enableSearch ? ",\"enable_search\":true" : "";
        String requestBody = "{\"model\":\"" + model + "\",\"messages\":[{\"role\":\"user\",\"content\":"
                + escapedPrompt + "}],\"max_tokens\":2048" + searchParam + "}";

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
            log.error("[AiNewsService] AI API 返回错误 HTTP {}: {}", statusCode, response);
            throw new RuntimeException("AI API 返回错误 " + statusCode);
        }

        JsonNode root = objectMapper.readTree(response);
        return root.path("choices").path(0).path("message").path("content").asText("");
    }

    private List<AiNewsItemVO> parseNewsJson(String content, int limit, boolean isSearchMode) {
        List<AiNewsItemVO> result = new ArrayList<>();
        try {
            String json = content.trim();
            int start = json.indexOf('[');
            int end = json.lastIndexOf(']');
            if (start >= 0 && end > start) {
                json = json.substring(start, end + 1);
            } else {
                log.warn("[AiNewsService] AI 响应中未找到 JSON 数组，原始内容: {}", content.substring(0, Math.min(200, content.length())));
                return result;
            }

            JsonNode array = objectMapper.readTree(json);
            if (!array.isArray()) return result;

            List<AiNewsItemVO> tempResult = new ArrayList<>();
            for (int i = 0; i < array.size() && i < limit; i++) {
                JsonNode item = array.get(i);
                String title = item.path("title").asText("").trim();
                String url = item.path("url").asText("").trim();
                String summary = item.path("summary").asText("").trim();
                String source = item.path("source").asText("").trim();

                if (title.isBlank() || url.isBlank()) continue;

                String id = "news_" + Math.abs(url.hashCode());
                AiNewsItemVO vo = new AiNewsItemVO(id, title, url, summary, source.isBlank() ? null : source);
                vo.setModelSource(isSearchMode ? "search" : "text");
                tempResult.add(vo);
            }

            if (isSearchMode && !tempResult.isEmpty()) {
                log.info("[AiNewsService] 开始验证 {} 条链接有效性...", tempResult.size());
                List<AiNewsItemVO> validatedResult = validateAndFilterUrls(tempResult);
                log.info("[AiNewsService] 链接验证完成: 有效 {} 条 / 原始 {} 条", validatedResult.size(), tempResult.size());
                return validatedResult;
            }

            return tempResult;
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

    private List<AiNewsItemVO> validateAndFilterUrls(List<AiNewsItemVO> items) {
        List<AiNewsItemVO> validItems = new ArrayList<>();
        int maxRedirects = 5;

        for (AiNewsItemVO item : items) {
            String url = item.getUrl();
            boolean isValid = false;
            int redirects = 0;
            String currentUrl = url;

            while (redirects < maxRedirects) {
                HttpURLConnection conn = null;
                try {
                    URL validateUrl = new URL(currentUrl);
                    conn = (HttpURLConnection) validateUrl.openConnection();
                    conn.setRequestMethod("HEAD");
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);
                    conn.setInstanceFollowRedirects(false);
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

                    int responseCode = conn.getResponseCode();
                    log.debug("[AiNewsService] 验证 URL {} -> HTTP {}", currentUrl, responseCode);

                    if (responseCode >= 200 && responseCode < 400) {
                        isValid = true;
                        break;
                    } else if (responseCode >= 300 && responseCode < 400) {
                        String location = conn.getHeaderField("Location");
                        if (location != null && !location.isBlank()) {
                            if (location.startsWith("http")) {
                                currentUrl = location;
                            } else {
                                URL baseUrl = new URL(currentUrl);
                                currentUrl = new URL(baseUrl, location).toString();
                            }
                            redirects++;
                            log.debug("[AiNewsService] 重定向到: {}", currentUrl);
                            continue;
                        }
                    }
                    break;
                } catch (Exception e) {
                    log.debug("[AiNewsService] 验证 URL {} 失败: {}", currentUrl, e.getMessage());
                    break;
                } finally {
                    if (conn != null) {
                        conn.disconnect();
                    }
                }
            }

            if (isValid) {
                validItems.add(item);
                log.info("[AiNewsService] URL 有效: {}", url);
            } else {
                log.warn("[AiNewsService] URL 无效已过滤: {}", url);
            }
        }

        return validItems;
    }
}
