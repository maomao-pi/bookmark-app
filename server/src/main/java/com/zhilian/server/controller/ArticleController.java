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
@RequestMapping("/api/admin/articles")
@Validated
public class ArticleController {

    private final ArticleService articleService;
    private final OperationLogService operationLogService;

    public ArticleController(ArticleService articleService, OperationLogService operationLogService) {
        this.articleService = articleService;
        this.operationLogService = operationLogService;
    }

    @GetMapping
    public ApiResponse<PageData<Article>> getArticleList(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "pageNum 必须大于等于 1") int pageNum,
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "pageSize 必须大于等于 1") @Max(value = 100, message = "pageSize 不能超过 100") int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @Positive(message = "bookmarkId 必须大于 0") Long bookmarkId,
            @RequestParam(required = false) @Pattern(regexp = "^(article|video|document|link)$", message = "type 仅支持 article/video/document/link") String type,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder) {
        Page<Article> page = articleService.getArticleList(pageNum, pageSize, keyword, bookmarkId, type, sortField, sortOrder);
        return ApiResponse.success(PageData.from(page));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportArticles(@RequestParam(required = false) String keyword,
                                                  @RequestParam(required = false) @Positive(message = "bookmarkId 必须大于 0") Long bookmarkId,
                                                  @RequestParam(required = false) @Pattern(regexp = "^(article|video|document|link)$", message = "type 仅支持 article/video/document/link") String type,
                                                  @RequestParam(required = false) String sortField,
                                                  @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder,
                                                  Authentication authentication,
                                                  HttpServletRequest request) {
        String csv = articleService.exportArticlesAsCsv(keyword, bookmarkId, type, sortField, sortOrder);
        byte[] body = csv.getBytes(StandardCharsets.UTF_8);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "EXPORT_ARTICLE", "article", null, request.getRemoteAddr(), "success",
                Map.of("filtered", true));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=articles.csv")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(body);
    }

    @GetMapping("/{id}")
    public ApiResponse<Article> getArticle(@PathVariable @Positive(message = "id 必须大于 0") Long id) {
        return ApiResponse.success(articleService.getArticleById(id));
    }

    @PostMapping
    public ApiResponse<Article> createArticle(@RequestBody Article article,
                                              Authentication authentication,
                                              HttpServletRequest request) {
        Article created = articleService.createArticle(article);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "CREATE_ARTICLE", "article", created.getId(), request.getRemoteAddr(), "success",
                Map.of("title", created.getTitle()));
        return ApiResponse.success(created);
    }

    @PutMapping("/{id}")
    public ApiResponse<Article> updateArticle(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                              @RequestBody Article article,
                                              Authentication authentication,
                                              HttpServletRequest request) {
        Article updated = articleService.updateArticle(id, article);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "UPDATE_ARTICLE", "article", id, request.getRemoteAddr(), "success",
                Map.of("updatedFields", "partial"));
        return ApiResponse.success(updated);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteArticle(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                           Authentication authentication,
                                           HttpServletRequest request) {
        articleService.deleteArticle(id);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "DELETE_ARTICLE", "article", id, request.getRemoteAddr(), "success");
        return ApiResponse.success();
    }
}
