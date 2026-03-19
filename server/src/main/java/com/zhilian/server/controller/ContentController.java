package com.zhilian.server.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.dto.PageData;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.entity.Article;
import com.zhilian.server.service.ArticleService;
import com.zhilian.server.service.OperationLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/contents")
@Validated
public class ContentController {

    private final ArticleService articleService;
    private final OperationLogService operationLogService;

    public ContentController(ArticleService articleService, OperationLogService operationLogService) {
        this.articleService = articleService;
        this.operationLogService = operationLogService;
    }

    @GetMapping("/user")
    public ApiResponse<PageData<Article>> getUserContentList(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "pageNum 必须大于等于 1") int pageNum,
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "pageSize 必须大于等于 1") @Max(value = 100, message = "pageSize 不能超过 100") int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @Positive(message = "bookmarkId 必须大于 0") Long bookmarkId,
            @RequestParam(required = false) @Pattern(regexp = "^(article|video|document|link)$", message = "type 仅支持 article/video/document/link") String type,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String creatorKeyword,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder) {
        Page<Article> page = articleService.getUserContentList(pageNum, pageSize, keyword, bookmarkId, type, userId, creatorKeyword, sortField, sortOrder);
        return ApiResponse.success(PageData.from(page));
    }

    @GetMapping("/discover")
    public ApiResponse<PageData<Article>> getDiscoverContentList(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "pageNum 必须大于等于 1") int pageNum,
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "pageSize 必须大于等于 1") @Max(value = 100, message = "pageSize 不能超过 100") int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @Positive(message = "discoverBookmarkId 必须大于 0") Long discoverBookmarkId,
            @RequestParam(required = false) @Pattern(regexp = "^(article|video|document|link)$", message = "type 仅支持 article/video/document/link") String type,
            @RequestParam(required = false) String creatorKeyword,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder) {
        Page<Article> page = articleService.getDiscoverContentList(pageNum, pageSize, keyword, discoverBookmarkId, type, creatorKeyword, sortField, sortOrder);
        return ApiResponse.success(PageData.from(page));
    }

    @GetMapping("/user/export")
    public ResponseEntity<byte[]> exportUserContent(@RequestParam(required = false) String keyword,
                                                  @RequestParam(required = false) @Positive(message = "bookmarkId 必须大于 0") Long bookmarkId,
                                                  @RequestParam(required = false) @Pattern(regexp = "^(article|video|document|link)$", message = "type 仅支持 article/video/document/link") String type,
                                                  @RequestParam(required = false) Long userId,
                                                  @RequestParam(required = false) String sortField,
                                                  @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder,
                                                  Authentication authentication,
                                                  HttpServletRequest request) {
        String csv = articleService.exportUserContentAsCsv(keyword, bookmarkId, type, userId, sortField, sortOrder);
        byte[] body = csv.getBytes(StandardCharsets.UTF_8);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "EXPORT_USER_CONTENT", "article", null, request.getRemoteAddr(), "success",
                Map.of("filtered", true));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=user-contents.csv")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(body);
    }

    @GetMapping("/discover/export")
    public ResponseEntity<byte[]> exportDiscoverContent(@RequestParam(required = false) String keyword,
                                                       @RequestParam(required = false) @Positive(message = "discoverBookmarkId 必须大于 0") Long discoverBookmarkId,
                                                       @RequestParam(required = false) @Pattern(regexp = "^(article|video|document|link)$", message = "type 仅支持 article/video/document/link") String type,
                                                       @RequestParam(required = false) String sortField,
                                                       @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder,
                                                       Authentication authentication,
                                                       HttpServletRequest request) {
        String csv = articleService.exportDiscoverContentAsCsv(keyword, discoverBookmarkId, type, sortField, sortOrder);
        byte[] body = csv.getBytes(StandardCharsets.UTF_8);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "EXPORT_DISCOVER_CONTENT", "article", null, request.getRemoteAddr(), "success",
                Map.of("filtered", true));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=discover-contents.csv")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(body);
    }

    @GetMapping("/user/{id}")
    public ApiResponse<Article> getUserContent(@PathVariable @Positive(message = "id 必须大于 0") Long id) {
        return ApiResponse.success(articleService.getArticleById(id));
    }

    @GetMapping("/discover/{id}")
    public ApiResponse<Article> getDiscoverContent(@PathVariable @Positive(message = "id 必须大于 0") Long id) {
        return ApiResponse.success(articleService.getArticleById(id));
    }

    @PostMapping("/user")
    public ApiResponse<Article> createUserContent(@RequestBody Article article,
                                                  Authentication authentication,
                                                  HttpServletRequest request) {
        article.setBookmarkId(article.getBookmarkId());
        article.setDiscoverBookmarkId(null);
        Article created = articleService.createArticle(article);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "CREATE_USER_CONTENT", "article", created.getId(), request.getRemoteAddr(), "success",
                Map.of("title", created.getTitle()));
        return ApiResponse.success(created);
    }

    @PostMapping("/discover")
    public ApiResponse<Article> createDiscoverContent(@RequestBody Article article,
                                                      Authentication authentication,
                                                      HttpServletRequest request) {
        article.setBookmarkId(null);
        article.setDiscoverBookmarkId(article.getDiscoverBookmarkId());
        Article created = articleService.createArticle(article);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "CREATE_DISCOVER_CONTENT", "article", created.getId(), request.getRemoteAddr(), "success",
                Map.of("title", created.getTitle()));
        return ApiResponse.success(created);
    }

    @PutMapping("/user/{id}")
    public ApiResponse<Article> updateUserContent(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                                  @RequestBody Article article,
                                                  Authentication authentication,
                                                  HttpServletRequest request) {
        Article existing = articleService.getArticleById(id);
        if (existing.getBookmarkId() == null) {
            throw new RuntimeException("只能修改用户内容");
        }
        Article updated = articleService.updateArticle(id, article);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "UPDATE_USER_CONTENT", "article", id, request.getRemoteAddr(), "success",
                Map.of("updatedFields", "partial"));
        return ApiResponse.success(updated);
    }

    @PutMapping("/discover/{id}")
    public ApiResponse<Article> updateDiscoverContent(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                                      @RequestBody Article article,
                                                      Authentication authentication,
                                                      HttpServletRequest request) {
        Article existing = articleService.getArticleById(id);
        if (existing.getDiscoverBookmarkId() == null) {
            throw new RuntimeException("只能修改发现内容");
        }
        Article updated = articleService.updateArticle(id, article);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "UPDATE_DISCOVER_CONTENT", "article", id, request.getRemoteAddr(), "success",
                Map.of("updatedFields", "partial"));
        return ApiResponse.success(updated);
    }

    @DeleteMapping("/user/{id}")
    public ApiResponse<Void> deleteUserContent(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                               Authentication authentication,
                                               HttpServletRequest request) {
        Article existing = articleService.getArticleById(id);
        if (existing.getBookmarkId() == null) {
            throw new RuntimeException("只能删除用户内容");
        }
        articleService.deleteArticle(id);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.logRevocable(admin.getId(), "DELETE_USER_CONTENT", "article", id, request.getRemoteAddr(), "success",
                Map.of("title", existing.getTitle()));
        return ApiResponse.success();
    }

    @DeleteMapping("/discover/{id}")
    public ApiResponse<Void> deleteDiscoverContent(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                                    Authentication authentication,
                                                    HttpServletRequest request) {
        Article existing = articleService.getArticleById(id);
        if (existing.getDiscoverBookmarkId() == null) {
            throw new RuntimeException("只能删除发现内容");
        }
        articleService.deleteArticle(id);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.logRevocable(admin.getId(), "DELETE_DISCOVER_CONTENT", "article", id, request.getRemoteAddr(), "success",
                Map.of("title", existing.getTitle()));
        return ApiResponse.success();
    }
}
