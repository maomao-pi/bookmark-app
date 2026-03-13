package com.zhilian.server.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.dto.PageData;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.entity.Bookmark;
import com.zhilian.server.service.BookmarkService;
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
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/bookmarks")
@Validated
public class BookmarkController {
    
    private final BookmarkService bookmarkService;
    private final OperationLogService operationLogService;

    public BookmarkController(BookmarkService bookmarkService, OperationLogService operationLogService) {
        this.bookmarkService = bookmarkService;
        this.operationLogService = operationLogService;
    }
    
    @GetMapping
    public ApiResponse<PageData<Bookmark>> getBookmarkList(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "pageNum 必须大于等于 1") int pageNum,
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "pageSize 必须大于等于 1") @Max(value = 100, message = "pageSize 不能超过 100") int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @Positive(message = "categoryId 必须大于 0") Long categoryId,
            @RequestParam(required = false) @Positive(message = "userId 必须大于 0") Long userId,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder) {
        Page<Bookmark> page = bookmarkService.getBookmarkList(pageNum, pageSize, keyword, categoryId, userId, source, sortField, sortOrder);
        return ApiResponse.success(PageData.from(page));
    }
    
    @GetMapping("/{id}")
    public ApiResponse<Bookmark> getBookmark(@PathVariable @Positive(message = "id 必须大于 0") Long id) {
        Bookmark bookmark = bookmarkService.getBookmarkById(id);
        return ApiResponse.success(bookmark);
    }
    
    @PostMapping
    public ApiResponse<Bookmark> createBookmark(@RequestBody Bookmark bookmark,
                                                Authentication authentication,
                                                HttpServletRequest request) {
        Bookmark created = bookmarkService.createBookmark(bookmark);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "CREATE_BOOKMARK", "bookmark", created.getId(), request.getRemoteAddr(), "success",
                Map.of("title", created.getTitle()));
        return ApiResponse.success(created);
    }
    
    @PutMapping("/{id}")
    public ApiResponse<Bookmark> updateBookmark(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                                @RequestBody Bookmark bookmark,
                                                Authentication authentication,
                                                HttpServletRequest request) {
        Bookmark updated = bookmarkService.updateBookmark(id, bookmark);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "UPDATE_BOOKMARK", "bookmark", id, request.getRemoteAddr(), "success",
                Map.of("updatedFields", "partial"));
        return ApiResponse.success(updated);
    }
    
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteBookmark(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                            Authentication authentication,
                                            HttpServletRequest request) {
        bookmarkService.deleteBookmark(id);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "DELETE_BOOKMARK", "bookmark", id, request.getRemoteAddr(), "success");
        return ApiResponse.success();
    }
    
    @PostMapping("/batch-delete")
    public ApiResponse<Void> batchDelete(@RequestBody List<Long> ids,
                                         Authentication authentication,
                                         HttpServletRequest request) {
        bookmarkService.batchDelete(ids);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "BATCH_DELETE_BOOKMARK", "bookmark", null, request.getRemoteAddr(), "success",
                Map.of("count", ids.size()));
        return ApiResponse.success();
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportBookmarks(@RequestParam(required = false) String keyword,
                                                  @RequestParam(required = false) @Positive(message = "categoryId 必须大于 0") Long categoryId,
                                                  @RequestParam(required = false) @Positive(message = "userId 必须大于 0") Long userId,
                                                  @RequestParam(required = false) String source,
                                                  @RequestParam(required = false) String sortField,
                                                  @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder,
                                                  Authentication authentication,
                                                  HttpServletRequest request) {
        String csv = bookmarkService.exportBookmarksAsCsv(keyword, categoryId, userId, source, sortField, sortOrder);
        byte[] body = csv.getBytes(StandardCharsets.UTF_8);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "EXPORT_BOOKMARK", "bookmark", null, request.getRemoteAddr(), "success",
                Map.of("filtered", true));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=bookmarks.csv")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(body);
    }

    @GetMapping("/all")
    public ApiResponse<List<Bookmark>> getAllBookmarks() {
        List<Bookmark> bookmarks = bookmarkService.getAllBookmarks();
        return ApiResponse.success(bookmarks);
    }
}
