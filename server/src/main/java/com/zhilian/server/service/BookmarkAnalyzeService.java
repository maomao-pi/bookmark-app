package com.zhilian.server.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zhilian.server.dto.BookmarkAnalysisResult;
import com.zhilian.server.entity.Article;
import com.zhilian.server.entity.Bookmark;
import com.zhilian.server.entity.Category;
import com.zhilian.server.mapper.ArticleMapper;
import com.zhilian.server.mapper.BookmarkMapper;
import com.zhilian.server.mapper.CategoryMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 收藏夹 AI 智能分析服务
 * <p>
 * 调用 GLM / 智谱AI 对用户的收藏进行深度分析，生成摘要、要点、标签建议等。
 */
@Service
public class BookmarkAnalyzeService {

    private static final Logger log = LoggerFactory.getLogger(BookmarkAnalyzeService.class);

    private final BookmarkMapper bookmarkMapper;
    private final ArticleMapper articleMapper;
    private final CategoryMapper categoryMapper;
    private final SystemSettingService systemSettingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public BookmarkAnalyzeService(BookmarkMapper bookmarkMapper, ArticleMapper articleMapper,
                                 CategoryMapper categoryMapper, SystemSettingService systemSettingService) {
        this.bookmarkMapper = bookmarkMapper;
        this.articleMapper = articleMapper;
        this.categoryMapper = categoryMapper;
        this.systemSettingService = systemSettingService;
    }

    /**
     * 对指定收藏进行 AI 智能分析
     */
    public BookmarkAnalysisResult analyzeBookmark(Long bookmarkId) {
        // 1. 获取收藏信息
        Bookmark bookmark = bookmarkMapper.selectById(bookmarkId);
        if (bookmark == null) {
            throw new RuntimeException("收藏不存在");
        }

        // 2. 获取关联的文章列表
        List<Article> articles = articleMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Article>()
                        .eq(Article::getBookmarkId, bookmarkId)
                        .orderByDesc(Article::getCreatedAt)
                        .last("LIMIT 20")
        );

        // 3. 获取用户的分类列表
        List<Category> categories = categoryMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Category>()
                        .eq(Category::getType, "user")
                        .eq(Category::getStatus, "visible")
                        .orderByAsc(Category::getSort)
        );
        List<String> categoryNames = categories.stream()
                .map(Category::getName)
                .collect(Collectors.toList());

        // 4. 读取 AI 配置（与 AiNewsService / 管理后台一致；空白字符串不能用 getOrDefault，否则会误用空 baseUrl）
        Map<String, String> settings = systemSettingService.getSettings();
        String apiKey = firstNonBlankSetting(settings, "ai.text.apiKey", "ai.apiKey", "ai.api.key");
        String baseUrl = firstNonBlankSetting(settings,
                "ai.text.baseUrl", "ai.baseUrl", "ai.base.url");
        if (baseUrl.isBlank()) {
            baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1";
        }
        String model = firstNonBlankSetting(settings, "ai.text.model", "ai.model", "ai.modelName");
        if (model.isBlank()) {
            model = "qwen3-plus";
        }
        model = normalizeDashScopeModelName(model, baseUrl);

        if (apiKey.isBlank()) {
            throw new RuntimeException("未配置 AI API Key，请在系统设置中配置");
        }

        // 5. 构建分析 prompt
        String prompt = buildAnalysisPrompt(bookmark, articles, categoryNames);

        // 6. 调用 AI
        try {
            String response = callAiApi(apiKey, baseUrl, model, prompt);
            return parseAnalysisResponse(response);
        } catch (Exception e) {
            log.error("[BookmarkAnalyzeService] AI 分析失败 bookmarkId={}: {}", bookmarkId, e.getMessage(), e);
            // 返回降级结果
            return buildDegradedResult(e.getMessage());
        }
    }

    private String buildAnalysisPrompt(Bookmark bookmark, List<Article> articles, List<String> categoryNames) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一位专业的网页内容分析师。请根据以下收藏信息，进行深度分析和总结。\n\n");

        // 收藏基本信息
        sb.append("【收藏信息】\n");
        sb.append("标题：").append(nullToEmpty(bookmark.getTitle())).append("\n");
        sb.append("网址：").append(nullToEmpty(bookmark.getUrl())).append("\n");
        sb.append("描述：").append(nullToEmpty(bookmark.getDescription())).append("\n");

        // 已有标签
        String tags = bookmark.getTags();
        if (tags != null && !tags.isBlank() && !"[]".equals(tags)) {
            sb.append("已有标签：").append(tags).append("\n");
        }

        // 关联文章
        if (!articles.isEmpty()) {
            sb.append("\n【关联文章/内容】共 ").append(articles.size()).append(" 条：\n");
            for (int i = 0; i < Math.min(articles.size(), 10); i++) {
                Article a = articles.get(i);
                sb.append("- [").append(nullToEmpty(a.getType())).append("] ");
                sb.append(nullToEmpty(a.getTitle()));
                if (a.getDescription() != null && !a.getDescription().isBlank()) {
                    sb.append("：").append(nullToEmpty(a.getDescription()));
                }
                sb.append("\n");
            }
        }

        // 用户分类
        if (!categoryNames.isEmpty()) {
            sb.append("\n【用户已有分类】：");
            sb.append(String.join("、", categoryNames));
            sb.append("\n");
        }

        sb.append("\n请以 JSON 格式返回分析结果，包含以下字段：\n");
        sb.append("{\n");
        sb.append("  \"summary\": \"内容摘要（50-100字）\",\n");
        sb.append("  \"keyPoints\": [\"要点1\", \"要点2\", \"要点3\"],\n");
        sb.append("  \"suggestedTags\": [\"标签1\", \"标签2\", \"标签3\"],\n");
        sb.append("  \"categoryMatch\": \"推荐的分类名称（从用户已有分类中选择，不存在则给出建议）\",\n");
        sb.append("  \"riskNotes\": [\"风险或注意事项1\"],  // 可选\n");
        sb.append("  \"nextActions\": [\"建议的下一步行动1\"],  // 可选\n");
        sb.append("  \"recommendedReads\": [  // 可选，延伸阅读推荐\n");
        sb.append("    {\"title\": \"标题\", \"url\": \"URL\", \"reason\": \"推荐理由\"}\n");
        sb.append("  ]\n");
        sb.append("}\n\n");
        sb.append("要求：\n");
        sb.append("1. 只返回 JSON，不要其他文字\n");
        sb.append("2. summary 要准确反映内容核心价值\n");
        sb.append("3. keyPoints 列出 3-5 个核心要点\n");
        sb.append("4. suggestedTags 提供 3-5 个简洁标签（2-4字）\n");
        sb.append("5. categoryMatch 优先匹配用户已有分类\n");
        sb.append("6. 如果无法访问网页内容，基于提供的信息进行合理推断");

        return sb.toString();
    }

    private String callAiApi(String apiKey, String baseUrl, String model, String prompt) throws Exception {
        apiKey = apiKey == null ? "" : apiKey.trim();
        baseUrl = baseUrl == null ? "" : baseUrl.trim();
        boolean isMinimax = baseUrl.contains("minimaxi.com") || baseUrl.contains("minimax.io");

        String endpoint;
        String requestBody;

        if (isMinimax) {
            // Minimax Anthropic 兼容 API
            endpoint = resolveMinimaxMessagesEndpoint(baseUrl);
            String escapedContent = objectMapper.writeValueAsString(prompt);
            // 禁用 thinking 以避免额外的内容块干扰 JSON 解析
            requestBody = "{\"model\":\"" + model + "\",\"messages\":[{\"role\":\"user\",\"content\":"
                    + escapedContent + "}],\"max_tokens\":2048,\"thinking\":{\"type\":\"disabled\"}}";
        } else {
            // OpenAI 兼容 API（GLM、DashScope compatible-mode、OpenRouter 等）
            endpoint = resolveOpenAiChatCompletionsEndpoint(baseUrl);
            String escapedPrompt = objectMapper.writeValueAsString(prompt);
            requestBody = "{\"model\":\"" + model + "\",\"messages\":[{\"role\":\"user\",\"content\":"
                    + escapedPrompt + "}],\"max_tokens\":2048}";
        }

        URL url = new URL(endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Authorization", "Bearer " + apiKey);
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
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
            log.error("[BookmarkAnalyzeService] AI API 返回错误 HTTP {}: {}", statusCode, response);
            throw new RuntimeException(formatAiHttpError(statusCode, response));
        }

        if (isMinimax) {
            // Minimax Anthropic 格式：从 content 数组中找到 text 类型的块
            JsonNode root = objectMapper.readTree(response);
            JsonNode contentArray = root.path("content");
            if (contentArray.isArray()) {
                for (JsonNode block : contentArray) {
                    if ("text".equals(block.path("type").asText())) {
                        return block.path("text").asText("");
                    }
                }
            }
            return "";
        } else {
            // OpenAI 兼容格式
            JsonNode root = objectMapper.readTree(response);
            return root.path("choices").path(0).path("message").path("content").asText("");
        }
    }

    private BookmarkAnalysisResult parseAnalysisResponse(String content) {
        BookmarkAnalysisResult result = new BookmarkAnalysisResult();
        result.setGeneratedAt(LocalDateTime.now());

        try {
            String json = content.trim();
            int start = json.indexOf('{');
            int end = json.lastIndexOf('}');
            if (start >= 0 && end > start) {
                json = json.substring(start, end + 1);
            }

            JsonNode node = objectMapper.readTree(json);

            result.setSummary(nullToEmpty(node.path("summary").asText()));
            result.setCategoryMatch(nullToEmpty(node.path("categoryMatch").asText()));

            // keyPoints
            List<String> keyPoints = new ArrayList<>();
            JsonNode kpNode = node.path("keyPoints");
            if (kpNode.isArray()) {
                for (JsonNode n : kpNode) {
                    String s = n.asText();
                    if (!s.isBlank()) keyPoints.add(s);
                }
            }
            result.setKeyPoints(keyPoints);

            // suggestedTags
            List<String> suggestedTags = new ArrayList<>();
            JsonNode stNode = node.path("suggestedTags");
            if (stNode.isArray()) {
                for (JsonNode n : stNode) {
                    String s = n.asText();
                    if (!s.isBlank()) suggestedTags.add(s);
                }
            }
            result.setSuggestedTags(suggestedTags);

            // riskNotes
            List<String> riskNotes = new ArrayList<>();
            JsonNode rnNode = node.path("riskNotes");
            if (rnNode.isArray()) {
                for (JsonNode n : rnNode) {
                    String s = n.asText();
                    if (!s.isBlank()) riskNotes.add(s);
                }
            }
            if (!riskNotes.isEmpty()) result.setRiskNotes(riskNotes);

            // nextActions
            List<String> nextActions = new ArrayList<>();
            JsonNode naNode = node.path("nextActions");
            if (naNode.isArray()) {
                for (JsonNode n : naNode) {
                    String s = n.asText();
                    if (!s.isBlank()) nextActions.add(s);
                }
            }
            if (!nextActions.isEmpty()) result.setNextActions(nextActions);

            // recommendedReads
            JsonNode rrNode = node.path("recommendedReads");
            if (rrNode.isArray()) {
                List<BookmarkAnalysisResult.RecommendedRead> reads = new ArrayList<>();
                for (JsonNode n : rrNode) {
                    String title = n.path("title").asText();
                    String url = n.path("url").asText();
                    if (!title.isBlank() && !url.isBlank()) {
                        BookmarkAnalysisResult.RecommendedRead read =
                                new BookmarkAnalysisResult.RecommendedRead(
                                        title, url, n.path("reason").asText()
                                );
                        reads.add(read);
                    }
                }
                if (!reads.isEmpty()) result.setRecommendedReads(reads);
            }

            result.setDegraded(false);

        } catch (Exception e) {
            log.warn("[BookmarkAnalyzeService] 解析 AI 响应失败，使用降级结果: {}", e.getMessage());
            return buildDegradedResult("AI 响应解析失败: " + e.getMessage());
        }

        return result;
    }

    private BookmarkAnalysisResult buildDegradedResult(String reason) {
        BookmarkAnalysisResult result = new BookmarkAnalysisResult();
        result.setSummary("暂无分析结果，请稍后重试或检查 AI 配置。");
        result.setKeyPoints(new ArrayList<>());
        result.setSuggestedTags(new ArrayList<>());
        result.setCategoryMatch("");
        result.setRiskNotes(new ArrayList<>());
        result.setNextActions(new ArrayList<>());
        result.setRecommendedReads(new ArrayList<>());
        result.setDegraded(true);
        result.setDegradeReason(reason);
        result.setGeneratedAt(LocalDateTime.now());
        return result;
    }

    private String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    /**
     * 阿里云百炼 compatible-mode 下，模型 ID 须与控制台完全一致；常见笔误会导致 HTTP 403。
     */
    private String normalizeDashScopeModelName(String model, String baseUrl) {
        if (model == null || baseUrl == null) {
            return model;
        }
        if (!baseUrl.toLowerCase().contains("dashscope")) {
            return model;
        }
        String m = model.trim();
        if ("qwen3.6-plus".equalsIgnoreCase(m) || "qwen3-6-plus".equalsIgnoreCase(m) || "qwen3.6_plus".equalsIgnoreCase(m)) {
            log.warn("[BookmarkAnalyzeService] 模型名「{}」非百炼标准 ID，已自动更正为 qwen3-plus", model);
            return "qwen3-plus";
        }
        return m;
    }

    /**
     * 按 key 顺序取第一个非空白配置（解决 DB 里存了空字符串时 getOrDefault 不回退的问题）。
     */
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

    private String resolveOpenAiChatCompletionsEndpoint(String raw) {
        String b = raw.trim();
        while (b.endsWith("/")) {
            b = b.substring(0, b.length() - 1);
        }
        String lower = b.toLowerCase();
        if (lower.endsWith("/chat/completions")) {
            return b;
        }
        return b + "/chat/completions";
    }

    private String resolveMinimaxMessagesEndpoint(String raw) {
        String b = raw.trim();
        while (b.endsWith("/")) {
            b = b.substring(0, b.length() - 1);
        }
        String lower = b.toLowerCase();
        if (lower.endsWith("/v1/messages")) {
            return b;
        }
        return b + "/v1/messages";
    }

    /**
     * 从上游 JSON/HTML 中抽取可读说明，便于排查 401/403（Key、模型与地址不匹配等）。
     */
    private String formatAiHttpError(int statusCode, String response) {
        String body = response == null ? "" : response.trim();
        String detail = "";
        if (!body.isEmpty()) {
            try {
                JsonNode root = objectMapper.readTree(body);
                JsonNode err = root.path("error");
                if (err.isTextual() && !err.asText().isBlank()) {
                    detail = err.asText();
                } else if (err.isObject()) {
                    String m = err.path("message").asText("");
                    String c = err.path("code").asText("");
                    if (!m.isBlank()) {
                        detail = m;
                    } else if (!c.isBlank()) {
                        detail = c;
                    }
                }
                if (detail.isBlank() && root.has("message")) {
                    detail = root.path("message").asText("");
                }
            } catch (Exception ignored) {
                detail = body.length() > 220 ? body.substring(0, 220) + "…" : body;
            }
        }
        detail = detail.replace("\n", " ").trim();
        String head = "AI API 返回错误 " + statusCode;
        if (!detail.isEmpty()) {
            return head + "：" + detail;
        }
        if (statusCode == 401 || statusCode == 403) {
            return head + "。请核对管理后台「文本 AI」：API Key 是否有效、模型名是否已开通，且 API 地址与 Key 属同一平台"
                    + "（例如 DashScope 需 https://dashscope.aliyuncs.com/compatible-mode/v1 ，智谱需 https://open.bigmodel.cn/api/paas/v4 ）。";
        }
        return head;
    }
}