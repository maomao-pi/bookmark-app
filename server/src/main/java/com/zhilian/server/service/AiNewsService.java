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
        return getNews(false);
    }

    public synchronized List<AiNewsItemVO> getNews(boolean forceRefresh) {
        Map<String, String> settings = systemSettingService.getSettings();

        if (forceRefresh) {
            clearCache();
            log.info("[AiNewsService] 收到强制刷新请求，将重新拉取推荐数据");
        }

        // 外部推荐总开关（兼容新旧键名；DB 中空字符串需视为未配置，不能挡住默认值）
        String externalEnabled = firstNonBlankSetting(settings,
                "recommend.external.enabled", "recommend.externalEnabled");
        if (externalEnabled.isBlank()) {
            externalEnabled = "false";
        }
        if (!"true".equalsIgnoreCase(externalEnabled)) {
            log.info("[AiNewsService] 外部推荐已关闭 recommend.external.enabled={}，返回空列表（非异常）",
                    externalEnabled);
            return Collections.emptyList();
        }

        // 判断使用哪种模型
        String searchEnabledRaw = firstNonBlankSetting(settings, "ai.search.enabled");
        if (searchEnabledRaw.isBlank()) {
            searchEnabledRaw = "false";
        }
        boolean useSearchModel = "true".equalsIgnoreCase(searchEnabledRaw);

        String apiKey;
        String baseUrl;
        String model;
        final String modelType;

        if (useSearchModel) {
            // 联网搜索模型分支（apiKey 可与文本 AI 共用，避免只配了一处导致永远空列表）
            apiKey = firstNonBlankSetting(settings,
                    "ai.search.apiKey", "ai.text.apiKey", "ai.apiKey", "ai.api.key");
            baseUrl = firstNonBlankSetting(settings, "ai.search.baseUrl", "ai.search.baseurl");
            if (baseUrl.isBlank()) {
                baseUrl = "https://api.minimax.io/anthropic";
            }
            model = firstNonBlankSetting(settings, "ai.search.model");
            modelType = "search";

            if (apiKey.isBlank()) {
                log.warn("[AiNewsService] 联网搜索已启用 (ai.search.enabled=true) 但未配置可用 apiKey（已尝试 ai.search.apiKey / ai.text.apiKey）");
                return Collections.emptyList();
            }
            if (model.isBlank()) {
                // Minimax Anthropic 默认模型；其它兼容端点保留 qwen3-search 默认
                model = baseUrl.toLowerCase().contains("minimaxi.com")
                        || baseUrl.toLowerCase().contains("minimax.io")
                        ? "MiniMax-M2.7"
                        : "qwen3-search";
            }
            log.info("[AiNewsService] 使用[联网搜索模型: {}]", model);
        } else {
            // 文本生成模型分支（兼容旧配置键）
            apiKey = firstNonBlankSetting(settings, "ai.text.apiKey", "ai.apiKey", "ai.api.key");
            baseUrl = firstNonBlankSetting(settings, "ai.text.baseUrl", "ai.baseUrl", "ai.base.url");
            if (baseUrl.isBlank()) {
                baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1";
            }
            model = firstNonBlankSetting(settings, "ai.text.model", "ai.model", "ai.modelName");
            if (model.isBlank()) {
                model = "qwen3-plus";
            }
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
        long fetchStart = System.currentTimeMillis();
        try {
            String limitRaw = firstNonBlankSetting(settings, "recommend.limit");
            int limit = parseLimit(limitRaw.isBlank() ? "8" : limitRaw);
            log.info("[AiNewsService] 开始获取 AI 咨讯: [{}模型: {}], baseUrl={}, limit={}, forceRefresh={}",
                    useSearchModel ? "联网搜索" : "文本生成", model, baseUrl, limit, forceRefresh);

            List<AiNewsItemVO> result = fetchNewsFromAi(apiKey, baseUrl, model, limit, modelType);

            // 更新缓存
            cache = result;
            cacheExpireAt = now + CACHE_TTL_MS;
            long elapsed = System.currentTimeMillis() - fetchStart;
            log.info("[AiNewsService] 拉取完成 modelType={} model={} 条数={} 耗时={}ms 已写入缓存",
                    modelType, model, result.size(), elapsed);
            if (result.isEmpty()) {
                log.warn("[AiNewsService] 本次拉取结果为空（可能为模型返回空数组、联网校验全部过滤或解析失败），仍缓存空列表以避免频繁打爆上游");
            }
            return result;
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - fetchStart;
            log.error("[AiNewsService] 获取 AI 咨讯失败 modelType={} model={} 耗时={}ms: {}",
                    modelType, model, elapsed, e.getMessage(), e);
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
        // Minimax 是文本生成模型，不是真实联网搜索；URL 验证会导致所有条目被过滤，必须跳过
        boolean isMinimax = baseUrl != null
                && (baseUrl.toLowerCase().contains("minimaxi.com")
                    || baseUrl.toLowerCase().contains("minimax.io"));
        // MiniMax-M2.7 是文本生成模型，会编造 URL，必须验证；联网搜索模式本身已做验证；非搜索模式也要验证
        boolean doUrlValidation = isSearchMode || isMinimax;

        String prompt = isSearchMode
                ? "推荐 " + limit + " 条近期热门的 AI、科技、编程领域文章。\n"
                  + "优先选择有效域名：github.com, dev.to, medium.com, react.dev, vite.dev, nextjs.org, huggingface.co/blog。\n"
                  + "只返回 JSON 数组，格式：[{\"title\":\"标题\",\"url\":\"URL\",\"summary\":\"一句话摘要\",\"source\":\"来源网站名\"}]\n"
                  + "不要输出任何其他文字，不要有注释，只有 JSON。"
                : "推荐 " + limit + " 条最新的 AI、科技、编程领域精选文章。\n"
                  + "优先选择有效域名：github.com, dev.to, medium.com, react.dev, vite.dev\n"
                  + "只返回 JSON 数组，格式：[{\"title\":\"标题\",\"url\":\"URL\",\"summary\":\"摘要\",\"source\":\"来源\"}]";

        String content = callAiApi(apiKey, baseUrl, model, prompt, isSearchMode);
        return parseNewsJson(content, limit, doUrlValidation);
    }

    private String callAiApi(String apiKey, String baseUrl, String model, String prompt,
                              boolean enableSearch) throws Exception {
        apiKey = apiKey == null ? "" : apiKey.trim();
        String b = baseUrl == null ? "" : baseUrl.trim();
        while (b.endsWith("/")) {
            b = b.substring(0, b.length() - 1);
        }

        boolean isMinimax = b.toLowerCase().contains("minimaxi.com") || b.toLowerCase().contains("minimax.io");

        String endpoint;
        String requestBody;
        if (isMinimax) {
            // 官方路径为 .../anthropic/v1/messages；MiniMax OpenAPI 不包含 thinking 请求字段，乱传易触发 2013 参数错误
            endpoint = normalizeMinimaxAnthropicEndpoint(b);
            String escapedPrompt = objectMapper.writeValueAsString(prompt);
            // MiniMax-M2.7 会输出较长的 thinking 块（数千 token），需充足输出配额；JSON 数组约 2-3KB，预留足够余量
            requestBody = "{\"model\":\"" + model + "\",\"max_tokens\":128000,"
                    + "\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":"
                    + escapedPrompt + "}]}]}";
        } else {
            // OpenAI 兼容端点：/chat/completions
            endpoint = b.toLowerCase().endsWith("/chat/completions") ? b : b + "/chat/completions";
            String escapedPrompt = objectMapper.writeValueAsString(prompt);
            String searchParam = enableSearch ? ",\"enable_search\":true" : "";
            requestBody = "{\"model\":\"" + model + "\",\"messages\":[{\"role\":\"user\",\"content\":"
                    + escapedPrompt + "}],\"max_tokens\":2048" + searchParam + "}";
        }

        URL url = new URL(endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        if (isMinimax) {
            // Anthropic 风格需要 x-api-key + anthropic-version；同时设置 Authorization 以兼容部分代理
            conn.setRequestProperty("x-api-key", apiKey);
            conn.setRequestProperty("anthropic-version", "2023-06-01");
            conn.setRequestProperty("Authorization", "Bearer " + apiKey);
        } else {
            conn.setRequestProperty("Authorization", "Bearer " + apiKey);
        }
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(60000);
        conn.setDoOutput(true);

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
            log.error("[AiNewsService] AI API 返回错误 HTTP {}: {} (endpoint={}, model={})",
                    statusCode, response, endpoint, model);
            throw new RuntimeException("AI API 返回错误 " + statusCode);
        }

        JsonNode root = objectMapper.readTree(response);
        if (isMinimax) {
            JsonNode baseResp = root.path("base_resp");
            int miniStatus = baseResp.path("status_code").asInt(0);
            if (miniStatus != 0) {
                String miniMsg = baseResp.path("status_msg").asText("");
                log.error("[AiNewsService] MiniMax base_resp 非成功 status_code={} status_msg={} 原始响应前500字: {}",
                        miniStatus, miniMsg, response.length() > 500 ? response.substring(0, 500) + "…" : response);
                throw new RuntimeException("MiniMax API 错误: " + miniMsg + " (code=" + miniStatus + ")");
            }
            return extractAnthropicAssistantText(root);
        }
        return root.path("choices").path(0).path("message").path("content").asText("");
    }

    private String firstNonBlankSetting(Map<String, String> settings, String... keys) {
        for (String key : keys) {
            if (key == null) {
                continue;
            }
            String v = settings.get(key);
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return "";
    }

    /** MiniMax 文档：POST /anthropic/v1/messages */
    private String normalizeMinimaxAnthropicEndpoint(String base) {
        String b = base == null ? "" : base.trim();
        while (b.endsWith("/")) {
            b = b.substring(0, b.length() - 1);
        }
        String lower = b.toLowerCase();
        if (lower.endsWith("/v1/messages") || lower.endsWith("/anthropic/v1/messages")) {
            return b;
        }
        if (lower.contains("/anthropic")) {
            return b + "/v1/messages";
        }
        // 仅填了 host（如 https://api.minimax.io）时补上官方路径前缀
        return b + "/anthropic/v1/messages";
    }

    /** Anthropic 风格响应：合并全部 text 块（模型可能拆成多段） */
    private String extractAnthropicAssistantText(JsonNode root) {
        JsonNode contentArray = root.path("content");
        if (!contentArray.isArray() || contentArray.isEmpty()) {
            contentArray = root.path("message").path("content");
        }
        if (!contentArray.isArray()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (JsonNode block : contentArray) {
            String blockType = block.path("type").asText("");
            // MiniMax 返回 content 数组中：type=thinking 为思考过程（很长），type=text 为实际回复
            // 只需要提取 type=text 的最终回复内容，忽略 thinking 块
            if ("text".equals(blockType)) {
                String t = block.path("text").asText("");
                if (!t.isBlank()) {
                    sb.append(t);
                }
            }
        }
        return sb.toString();
    }

    /** 去掉 ```json ... ``` 等围栏，便于定位 JSON 数组 */
    private String stripMarkdownCodeFence(String raw) {
        if (raw == null) {
            return "";
        }
        String s = raw.trim();
        int fence = s.indexOf("```");
        if (fence < 0) {
            return s;
        }
        int lineEnd = s.indexOf('\n', fence);
        int innerStart = (lineEnd < 0) ? fence + 3 : lineEnd + 1;
        int close = s.indexOf("```", innerStart);
        if (close > innerStart) {
            return s.substring(innerStart, close).trim();
        }
        return s;
    }

    private List<AiNewsItemVO> parseNewsJson(String content, int limit, boolean doUrlValidation) {
        List<AiNewsItemVO> result = new ArrayList<>();
        try {
            String json = stripMarkdownCodeFence(content == null ? "" : content.trim());
            if (json.isEmpty()) {
                log.warn("[AiNewsService] AI 响应为空");
                return result;
            }

            // 定位 JSON 数组：找第一个 '[' 之后的完整数组
            int start = json.indexOf('[');
            int end = json.lastIndexOf(']');
            String jsonArrayStr;
            if (start >= 0 && end > start) {
                jsonArrayStr = json.substring(start, end + 1);
            } else {
                log.warn("[AiNewsService] 未找到 JSON 数组，尝试正则提取: {}", json.substring(0, Math.min(200, json.length())));
                return extractItemsByRegex(json, limit);
            }

            JsonNode array;
            try {
                array = objectMapper.readTree(jsonArrayStr);
            } catch (Exception parseEx) {
                // JSON 数组截断或损坏，尝试用正则逐个提取完整对象
                log.warn("[AiNewsService] JSON 解析失败（可能被截断），改用正则提取: {}", parseEx.getMessage());
                return extractItemsByRegex(json, limit);
            }
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
                vo.setModelSource("ai");
                tempResult.add(vo);
            }

            if (doUrlValidation && !tempResult.isEmpty()) {
                log.info("[AiNewsService] 开始验证 {} 条链接有效性...", tempResult.size());
                List<AiNewsItemVO> validatedResult = validateAndFilterUrls(tempResult);
                log.info("[AiNewsService] 链接验证完成: 有效 {} 条 / 原始 {} 条", validatedResult.size(), tempResult.size());
                return validatedResult;
            }

            log.info("[AiNewsService] 解析完成，共 {} 条推荐（跳过 URL 验证={}）", tempResult.size(), !doUrlValidation);
            return tempResult;
        } catch (Exception e) {
            log.error("[AiNewsService] 解析 AI 咨讯 JSON 失败: {}", e.getMessage(), e);
            return extractItemsByRegex(content, limit);
        }
    }

    /** 截断 JSON 的兜底提取：用正则逐个匹配 {..."title":..."url":...} 对象 */
    private List<AiNewsItemVO> extractItemsByRegex(String content, int limit) {
        List<AiNewsItemVO> result = new ArrayList<>();
        try {
            // 匹配 JSON 对象（可能截断，对象内部字段完整即可）
            java.util.regex.Pattern objPat = java.util.regex.Pattern.compile(
                    "\\{\\s*\"title\"\\s*:\\s*\"([^\"\\\\]*(?:\\\\.[^\"\\\\]*)*)\"\\s*,\\s*\"url\"\\s*:\\s*\"([^\"\\\\]*(?:\\\\.[^\"\\\\]*)*)\"\\s*,\\s*\"summary\"\\s*:\\s*\"([^\"\\\\]*(?:\\\\.[^\"\\\\]*)*)\"\\s*,\\s*\"source\"\\s*:\\s*\"([^\"\\\\]*(?:\\\\.[^\"\\\\]*)*)\"\\s*\\}",
                    java.util.regex.Pattern.MULTILINE);
            java.util.regex.Matcher m = objPat.matcher(content);
            while (m.find() && result.size() < limit) {
                String title = m.group(1).replaceAll("\\\\(.)", "$1");
                String url = m.group(2).replaceAll("\\\\(.)", "$1");
                String summary = m.group(3).replaceAll("\\\\(.)", "$1");
                String source = m.group(4).replaceAll("\\\\(.)", "$1");
                if (!title.isBlank() && !url.isBlank()) {
                    String id = "news_" + Math.abs(url.hashCode());
                    AiNewsItemVO vo = new AiNewsItemVO(id, title, url, summary, source.isBlank() ? null : source);
                    vo.setModelSource("ai");
                    result.add(vo);
                }
            }
            log.info("[AiNewsService] 正则提取完成，共 {} 条（原始内容长度={}）", result.size(), content.length());
        } catch (Exception e) {
            log.error("[AiNewsService] 正则提取失败: {}", e.getMessage());
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
