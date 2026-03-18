package com.zhilian.server.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.dto.NoteDTO;
import com.zhilian.server.entity.Article;
import com.zhilian.server.entity.Bookmark;
import com.zhilian.server.entity.Category;
import com.zhilian.server.entity.Note;
import com.zhilian.server.entity.User;
import com.zhilian.server.service.AiAnalysisLogService;
import com.zhilian.server.service.AiNewsService;
import com.zhilian.server.service.ArticleService;
import com.zhilian.server.service.VerificationCodeService;
import com.zhilian.server.service.BookmarkService;
import com.zhilian.server.service.CategoryService;
import com.zhilian.server.service.NoteService;
import com.zhilian.server.service.SystemSettingService;
import com.zhilian.server.service.UserService;
import com.zhilian.server.dto.AiNewsItemVO;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user")
@Validated
public class UserApiController {
    
    private final UserService userService;
    private final CategoryService categoryService;
    private final BookmarkService bookmarkService;
    private final ArticleService articleService;
    private final NoteService noteService;
    private final SystemSettingService systemSettingService;
    private final AiAnalysisLogService aiAnalysisLogService;
    private final VerificationCodeService verificationCodeService;
    private final AiNewsService aiNewsService;
    
    public UserApiController(UserService userService, CategoryService categoryService,
                            BookmarkService bookmarkService, ArticleService articleService,
                            NoteService noteService, SystemSettingService systemSettingService,
                            AiAnalysisLogService aiAnalysisLogService,
                            VerificationCodeService verificationCodeService,
                            AiNewsService aiNewsService) {
        this.userService = userService;
        this.categoryService = categoryService;
        this.bookmarkService = bookmarkService;
        this.articleService = articleService;
        this.noteService = noteService;
        this.systemSettingService = systemSettingService;
        this.aiAnalysisLogService = aiAnalysisLogService;
        this.verificationCodeService = verificationCodeService;
        this.aiNewsService = aiNewsService;
    }
    
    @PostMapping("/register")
    public ApiResponse<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        Map<String, Object> result = userService.registerUser(request.username, request.email, request.password, request.nickname, request.phone);
        return ApiResponse.success(result);
    }
    
    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        try {
            Map<String, Object> result = userService.loginUser(request.username, request.password);
            return ApiResponse.success(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ApiResponse.error("用户名或密码错误");
        }
    }
    
    @GetMapping("/profile")
    public ApiResponse<User> getProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        System.out.println("Profile - Auth: " + (authentication != null ? authentication.getPrincipal() : "null"));
        if (authentication == null || !authentication.isAuthenticated()) {
            return ApiResponse.error("未登录");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof String) {
            Long userId = Long.parseLong((String) principal);
            User user = userService.getUserById(userId);
            if (user != null) {
                user.setPassword(null);
                return ApiResponse.success(user);
            }
        } else if (principal instanceof User) {
            User user = (User) principal;
            user.setPassword(null);
            return ApiResponse.success(user);
        }
        return ApiResponse.error("未登录");
    }
    
    @PutMapping("/profile")
    public ApiResponse<User> updateProfile(Authentication authentication, @RequestBody UpdateProfileRequest request) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        String username = authentication.getName();
        User user = userService.updateUserProfile(username, request);
        return ApiResponse.success(user);
    }
    
    @GetMapping("/categories")
    public ApiResponse<List<Category>> getUserCategories(Authentication authentication) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        List<Category> categories = categoryService.getAllCategories("user");
        return ApiResponse.success(categories);
    }
    
    @PostMapping("/categories")
    public ApiResponse<Category> createCategory(Authentication authentication, @RequestBody Category category) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        Long userId = Long.parseLong(authentication.getName());
        category.setType("user");
        Category created = categoryService.createCategory(category, userId, "user");
        return ApiResponse.success(created);
    }
    
    @PutMapping("/categories/{id}")
    public ApiResponse<Category> updateCategory(Authentication authentication, @PathVariable Long id, @RequestBody Category category) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        Category updated = categoryService.updateCategory(id, category);
        return ApiResponse.success(updated);
    }
    
    @DeleteMapping("/categories/{id}")
    public ApiResponse<Void> deleteCategory(Authentication authentication, @PathVariable Long id) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        categoryService.deleteCategory(id);
        return ApiResponse.success(null);
    }
    
    @GetMapping("/bookmarks")
    public ApiResponse<Page<Bookmark>> getUserBookmarks(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ApiResponse.error("未登录");
        }
        Object principal = authentication.getPrincipal();
        Long userId;
        if (principal instanceof String) {
            userId = Long.parseLong((String) principal);
        } else if (principal instanceof User) {
            userId = ((User) principal).getId();
        } else {
            return ApiResponse.error("未登录");
        }
        Page<Bookmark> page = bookmarkService.getBookmarkList(pageNum, pageSize, keyword, categoryId, userId, null, null, null);
        return ApiResponse.success(page);
    }
    
    @PostMapping("/bookmarks")
    public ApiResponse<Bookmark> createBookmark(@RequestBody Bookmark bookmark) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ApiResponse.error("未登录");
        }
        Object principal = authentication.getPrincipal();
        Long userId;
        if (principal instanceof String) {
            userId = Long.parseLong((String) principal);
        } else if (principal instanceof User) {
            userId = ((User) principal).getId();
        } else {
            return ApiResponse.error("未登录");
        }
        bookmark.setUserId(userId);
        Bookmark created = bookmarkService.createBookmark(bookmark);
        return ApiResponse.success(created);
    }
    
    @PutMapping("/bookmarks/{id}")
    public ApiResponse<Bookmark> updateBookmark(Authentication authentication, @PathVariable Long id, @RequestBody Bookmark bookmark) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        Bookmark updated = bookmarkService.updateBookmark(id, bookmark);
        return ApiResponse.success(updated);
    }
    
    @DeleteMapping("/bookmarks/{id}")
    public ApiResponse<Void> deleteBookmark(Authentication authentication, @PathVariable Long id) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        bookmarkService.deleteBookmark(id);
        return ApiResponse.success(null);
    }
    
    @GetMapping("/bookmarks/{bookmarkId}/articles")
    public ApiResponse<List<Article>> getArticles(Authentication authentication, @PathVariable Long bookmarkId) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        List<Article> articles = articleService.getArticlesByBookmarkId(bookmarkId);
        return ApiResponse.success(articles);
    }
    
    @PostMapping("/bookmarks/{bookmarkId}/articles")
    public ApiResponse<Article> createArticle(Authentication authentication, @PathVariable Long bookmarkId, @RequestBody Article article) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        article.setBookmarkId(bookmarkId);
        Article created = articleService.createArticle(article);
        return ApiResponse.success(created);
    }

    @PutMapping("/bookmarks/{bookmarkId}/articles/{articleId}")
    public ApiResponse<Article> updateArticle(Authentication authentication,
                                              @PathVariable Long bookmarkId,
                                              @PathVariable Long articleId,
                                              @RequestBody Article article) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        article.setBookmarkId(bookmarkId);
        Article updated = articleService.updateArticle(articleId, article);
        return ApiResponse.success(updated);
    }

    @DeleteMapping("/bookmarks/{bookmarkId}/articles/{articleId}")
    public ApiResponse<Void> deleteArticle(Authentication authentication,
                                           @PathVariable Long bookmarkId,
                                           @PathVariable Long articleId) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        articleService.deleteArticle(articleId);
        return ApiResponse.success(null);
    }

    // -------------------- Notes --------------------

    @GetMapping("/bookmarks/{bookmarkId}/notes")
    public ApiResponse<List<Note>> getNotes(Authentication authentication, @PathVariable Long bookmarkId) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        Long userId = extractUserId(authentication);
        if (userId == null) return ApiResponse.error("未登录");
        List<Note> notes = noteService.getNotes(bookmarkId, userId);
        return ApiResponse.success(notes);
    }

    @PostMapping("/bookmarks/{bookmarkId}/notes")
    public ApiResponse<Note> createNote(Authentication authentication,
                                        @PathVariable Long bookmarkId,
                                        @Valid @RequestBody NoteDTO.Request req) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        Long userId = extractUserId(authentication);
        if (userId == null) return ApiResponse.error("未登录");
        Note note = noteService.createNote(bookmarkId, userId, req.getContent());
        return ApiResponse.success(note);
    }

    @PutMapping("/bookmarks/{bookmarkId}/notes/{noteId}")
    public ApiResponse<Void> updateNote(Authentication authentication,
                                        @PathVariable Long bookmarkId,
                                        @PathVariable Long noteId,
                                        @Valid @RequestBody NoteDTO.Request req) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        Long userId = extractUserId(authentication);
        if (userId == null) return ApiResponse.error("未登录");
        noteService.updateNote(noteId, userId, req.getContent());
        return ApiResponse.success(null);
    }

    @DeleteMapping("/bookmarks/{bookmarkId}/notes/{noteId}")
    public ApiResponse<Void> deleteNote(Authentication authentication,
                                        @PathVariable Long bookmarkId,
                                        @PathVariable Long noteId) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        Long userId = extractUserId(authentication);
        if (userId == null) return ApiResponse.error("未登录");
        noteService.deleteNote(noteId, userId);
        return ApiResponse.success(null);
    }

    // -------------------- AI 分析 --------------------

    @PostMapping("/bookmarks/{bookmarkId}/analyze")
    public ApiResponse<Map<String, Object>> analyzeBookmark(Authentication authentication,
                                                             @PathVariable Long bookmarkId) {
        Long userId = extractUserId(authentication);
        if (userId == null) return ApiResponse.error("未登录");

        Map<String, String> settings = systemSettingService.getSettings();
        String apiKey = settings.getOrDefault("ai.apiKey", "");
        String baseUrl = settings.getOrDefault("ai.baseUrl", "https://open.bigmodel.cn/api/paas/v4");
        String model = settings.getOrDefault("ai.model", "glm-4");

        if (apiKey == null || apiKey.isBlank()) {
            return ApiResponse.error("未配置 AI API Key，请在系统设置中配置");
        }

        Bookmark bookmark = bookmarkService.getBookmarkById(bookmarkId);
        if (bookmark == null) {
            return ApiResponse.error("收藏不存在");
        }

        List<Article> articles = articleService.getArticlesByBookmarkId(bookmarkId);
        String articleSummary = articles.stream()
                .map(a -> "- [" + a.getType() + "] " + a.getTitle() + (a.getDescription() != null ? ": " + a.getDescription() : ""))
                .collect(Collectors.joining("\n"));

        String prompt = "你是一个智能内容分析助手。请分析以下收藏内容并以JSON格式返回分析报告。\n\n" +
                "收藏信息：\n" +
                "- 标题：" + bookmark.getTitle() + "\n" +
                "- 网址：" + bookmark.getUrl() + "\n" +
                "- 描述：" + (bookmark.getDescription() != null ? bookmark.getDescription() : "无") + "\n" +
                "- 标签：" + (bookmark.getTags() != null ? bookmark.getTags() : "无") + "\n" +
                (articleSummary.isBlank() ? "" : "- 关联内容：\n" + articleSummary + "\n") +
                "\n请返回如下JSON结构（只返回JSON，不要其他文字）：\n" +
                "{\n" +
                "  \"summary\": \"100字以内的内容摘要\",\n" +
                "  \"keyPoints\": [\"要点1\", \"要点2\", \"要点3\"],\n" +
                "  \"suggestedTags\": [\"标签1\", \"标签2\", \"标签3\"],\n" +
                "  \"categoryMatch\": \"与用户分类的匹配建议（一句话）\"\n" +
                "}";

        long startMs = System.currentTimeMillis();
        try {
            String aiResponse = callGlmApi(apiKey, baseUrl, model, prompt);
            long durationMs = System.currentTimeMillis() - startMs;

            // 提取JSON
            String json = aiResponse;
            int jsonStart = aiResponse.indexOf('{');
            int jsonEnd = aiResponse.lastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                json = aiResponse.substring(jsonStart, jsonEnd + 1);
            }

            // 简单解析，避免引入 Jackson 依赖（已有）
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            @SuppressWarnings("unchecked")
            Map<String, Object> result = mapper.readValue(json, Map.class);
            result.put("generatedAt", LocalDateTime.now().toString());

            aiAnalysisLogService.log(userId, "bookmark_analysis", "user_action", model, 0, (int) durationMs, true, null);
            return ApiResponse.success(result);

        } catch (Exception e) {
            long durationMs = System.currentTimeMillis() - startMs;
            e.printStackTrace();
            aiAnalysisLogService.log(userId, "bookmark_analysis", "user_action", model, 0, (int) durationMs, false, e.getMessage());
            return ApiResponse.error("分析失败，请稍后重试");
        }
    }

    // -------------------- 扩展认证 --------------------

    @PostMapping("/auth/send-code")
    public ApiResponse<String> sendVerificationCode(@RequestBody Map<String, String> body) {
        String target = body.get("target");
        String codeType = body.getOrDefault("codeType", "login");
        if (target == null || target.isBlank()) return ApiResponse.error("target 必填");
        String code = verificationCodeService.generateCode(target, codeType);
        verificationCodeService.send(target, codeType, code);
        return ApiResponse.success("验证码已发送");
    }

    @PostMapping("/auth/login-email")
    public ApiResponse<Map<String, Object>> loginByEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        String code = body.get("code");
        if (email == null || email.isBlank()) return ApiResponse.error("邮箱必填");
        if (code != null && !code.isBlank()) {
            return ApiResponse.success(userService.loginByEmailCode(email, code, verificationCodeService));
        }
        if (password == null || password.isBlank()) return ApiResponse.error("密码或验证码必填");
        return ApiResponse.success(userService.loginByEmail(email, password));
    }

    @PostMapping("/auth/change-password")
    public ApiResponse<String> changePassword(Authentication authentication, @RequestBody Map<String, String> body) {
        Long userId = extractUserId(authentication);
        if (userId == null) return ApiResponse.error("未登录");
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");
        userService.changePassword(userId, oldPassword, newPassword);
        return ApiResponse.success("密码修改成功");
    }

    // -------------------- 个人资料 --------------------

    @PutMapping("/profile/extended")
    public ApiResponse<Object> updateExtendedProfile(Authentication authentication, @RequestBody Map<String, String> body) {
        Long userId = extractUserId(authentication);
        if (userId == null) return ApiResponse.error("未登录");
        String nickname = body.get("nickname");
        String bio = body.get("bio");
        String avatar = body.get("avatar");
        var user = userService.updateExtendedProfile(userId, nickname, bio, avatar);
        return ApiResponse.success(user);
    }

    @PostMapping("/profile/avatar")
    public ApiResponse<Map<String, String>> uploadAvatar(Authentication authentication,
                                                          @org.springframework.web.bind.annotation.RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        Long userId = extractUserId(authentication);
        if (userId == null) return ApiResponse.error("未登录");
        if (file == null || file.isEmpty()) return ApiResponse.error("文件不能为空");

        try {
            String uploadDir = System.getProperty("user.dir") + java.io.File.separator + "uploads" + java.io.File.separator + "avatars";
            java.io.File dir = new java.io.File(uploadDir);
            if (!dir.exists()) dir.mkdirs();

            String ext = "";
            String original = file.getOriginalFilename();
            if (original != null && original.contains(".")) ext = original.substring(original.lastIndexOf('.'));
            String filename = "avatar_" + userId + "_" + System.currentTimeMillis() + ext;
            java.io.File dest = new java.io.File(dir, filename);
            file.transferTo(dest);

            String avatarUrl = "/uploads/avatars/" + filename;
            userService.updateExtendedProfile(userId, null, null, avatarUrl);

            Map<String, String> result = new HashMap<>();
            result.put("avatarUrl", avatarUrl);
            return ApiResponse.success(result);
        } catch (Exception e) {
            return ApiResponse.error("上传失败：" + e.getMessage());
        }
    }

    // -------------------- 收藏统计 --------------------

    @GetMapping("/stats/bookmarks")
    public ApiResponse<Map<String, Object>> getBookmarkStats(Authentication authentication) {
        Long userId = extractUserId(authentication);
        if (userId == null) return ApiResponse.error("未登录");
        try {
            Map<String, Object> stats = bookmarkService.getBookmarkStats(userId);
            return ApiResponse.success(stats);
        } catch (Throwable e) {
            e.printStackTrace();
            return ApiResponse.error("获取统计失败：" + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
        }
    }

    // -------------------- AI 咨讯 --------------------

    @GetMapping("/ai/news")
    public ApiResponse<List<AiNewsItemVO>> getAiNews(
            Authentication authentication,
            @RequestParam(value = "refresh", defaultValue = "false") boolean refresh) {
        if (authentication == null) {
            return ApiResponse.error("未登录");
        }
        try {
            if (refresh) {
                aiNewsService.clearCache();
            }
            List<AiNewsItemVO> news = aiNewsService.getNews();
            return ApiResponse.success(news);
        } catch (Exception e) {
            e.printStackTrace();
            return ApiResponse.error("AI 咨讯获取失败: " + e.getMessage());
        }
    }

    @GetMapping("/ai/news/debug")
    public ApiResponse<Object> getAiNewsDebug(Authentication authentication) {
        Map<String, Object> debug = new HashMap<>();
        try {
            Map<String, String> settings = systemSettingService.getSettings();
            debug.put("settings", settings);
            debug.put("externalEnabled", settings.getOrDefault("recommend.external.enabled", 
                settings.getOrDefault("recommend.externalEnabled", "false")));
            debug.put("apiKeyPresent", !settings.getOrDefault("ai.apiKey", "").isBlank());
            debug.put("model", settings.getOrDefault("ai.model", ""));
            debug.put("baseUrl", settings.getOrDefault("ai.baseUrl", ""));
            debug.put("limit", settings.getOrDefault("recommend.limit", ""));
            return ApiResponse.success(debug);
        } catch (Exception e) {
            debug.put("error", e.getMessage());
            return ApiResponse.error(e.getMessage());
        }
    }

    @GetMapping("/ai/news/clear-cache")
    public ApiResponse<String> clearAiNewsCache() {
        aiNewsService.clearCache();
        return ApiResponse.success("缓存已清除");
    }

    @GetMapping("/ai/news/test-connection")
    public ApiResponse<Object> testAiConnection() {
        Map<String, Object> result = new HashMap<>();
        try {
            URL url = new URL("https://dashscope.aliyuncs.com/compatible-mode/v1/models");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer sk-9a78f4d0176b4194a6ee5019eb6b9c0b");
            conn.setConnectTimeout(10000);
            int code = conn.getResponseCode();
            result.put("httpCode", code);
            result.put("message", "HTTP " + code);
            return ApiResponse.success(result);
        } catch (Exception e) {
            result.put("error", e.getMessage());
            return ApiResponse.error("连接失败: " + e.getMessage());
        }
    }

    /** 简单调用 GLM Chat API */
    private String callGlmApi(String apiKey, String baseUrl, String model, String prompt) throws Exception {
        String endpoint = baseUrl.endsWith("/") ? baseUrl + "chat/completions" : baseUrl + "/chat/completions";
        URL url = new URL(endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Authorization", "Bearer " + apiKey);
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(25000);
        conn.setDoOutput(true);

        String requestBody = "{\"model\":\"" + model + "\",\"messages\":[{\"role\":\"user\",\"content\":"
                + com.fasterxml.jackson.databind.json.JsonMapper.builder().build()
                        .writeValueAsString(prompt)
                + "}],\"max_tokens\":1024}";

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
            throw new RuntimeException("GLM API 返回错误 " + statusCode + ": " + response);
        }

        // 从 choices[0].message.content 提取内容
        com.fasterxml.jackson.databind.JsonNode root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(response);
        return root.path("choices").path(0).path("message").path("content").asText();
    }

    private Long extractUserId(Authentication authentication) {
        if (authentication == null) return null;
        Object principal = authentication.getPrincipal();
        if (principal instanceof String) {
            return Long.parseLong((String) principal);
        } else if (principal instanceof User) {
            return ((User) principal).getId();
        }
        return null;
    }

    public static class LoginRequest {
        @NotBlank(message = "用户名不能为空")
        public String username;
        @NotBlank(message = "密码不能为空")
        public String password;
    }
    
    public static class RegisterRequest {
        @NotBlank(message = "用户名不能为空")
        @Pattern(regexp = "^[a-zA-Z0-9_]{3,20}$", message = "用户名只能包含字母、数字、下划线，长度3-20")
        public String username;
        @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", message = "邮箱格式不正确")
        public String email;
        @NotBlank(message = "密码不能为空")
        @Pattern(regexp = "^.{6,}$", message = "密码长度至少6位")
        public String password;
        @NotBlank(message = "姓名不能为空")
        public String nickname;
        @NotBlank(message = "手机号不能为空")
        @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
        public String phone;
    }
    
    public static class UpdateProfileRequest {
        public String username;
        public String email;
        public String avatar;
    }
}
