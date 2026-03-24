package com.zhilian.server.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.dto.PageData;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.entity.DiscoverBookmark;
import com.zhilian.server.service.DiscoverService;
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
@RequestMapping("/api/admin/discover")
@Validated
public class DiscoverController {

    private final DiscoverService discoverService;
    private final OperationLogService operationLogService;

    public DiscoverController(DiscoverService discoverService, OperationLogService operationLogService) {
        this.discoverService = discoverService;
        this.operationLogService = operationLogService;
    }

    @GetMapping
    public ApiResponse<PageData<DiscoverBookmark>> getDiscoverList(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "pageNum 必须大于等于 1") int pageNum,
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "pageSize 必须大于等于 1") @Max(value = 100, message = "pageSize 不能超过 100") int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @Positive(message = "categoryId 必须大于 0") Long categoryId,
            @RequestParam(required = false) @Pattern(regexp = "^(visible|hidden)$", message = "status 仅支持 visible/hidden") String status,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder) {
        Page<DiscoverBookmark> page = discoverService.getDiscoverList(pageNum, pageSize, keyword, categoryId, status, sortField, sortOrder);
        return ApiResponse.success(PageData.from(page));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportDiscover(@RequestParam(required = false) String keyword,
                                                  @RequestParam(required = false) @Positive(message = "categoryId 必须大于 0") Long categoryId,
                                                  @RequestParam(required = false) @Pattern(regexp = "^(visible|hidden)$", message = "status 仅支持 visible/hidden") String status,
                                                  @RequestParam(required = false) String sortField,
                                                  @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder,
                                                  Authentication authentication,
                                                  HttpServletRequest request) {
        String csv = discoverService.exportDiscoverAsCsv(keyword, categoryId, status, sortField, sortOrder);
        byte[] body = csv.getBytes(StandardCharsets.UTF_8);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "EXPORT_DISCOVER", "discover", null, request.getRemoteAddr(), "success",
                Map.of("filtered", true));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=discover.csv")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(body);
    }

    @GetMapping("/{id}")
    public ApiResponse<DiscoverBookmark> getDiscover(@PathVariable @Positive(message = "id 必须大于 0") Long id) {
        return ApiResponse.success(discoverService.getDiscoverById(id));
    }

    @PostMapping
    public ApiResponse<DiscoverBookmark> createDiscover(@RequestBody DiscoverBookmark discoverBookmark,
                                                        Authentication authentication,
                                                        HttpServletRequest request) {
        DiscoverBookmark created = discoverService.createDiscover(discoverBookmark);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "CREATE_DISCOVER", "discover", created.getId(), request.getRemoteAddr(), "success",
                Map.of("title", created.getTitle()));
        return ApiResponse.success(created);
    }

    @PutMapping("/{id}")
    public ApiResponse<DiscoverBookmark> updateDiscover(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                                        @RequestBody DiscoverBookmark discoverBookmark,
                                                        Authentication authentication,
                                                        HttpServletRequest request) {
        DiscoverBookmark updated = discoverService.updateDiscover(id, discoverBookmark);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "UPDATE_DISCOVER", "discover", id, request.getRemoteAddr(), "success",
                Map.of("updatedFields", "partial"));
        return ApiResponse.success(updated);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteDiscover(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                            Authentication authentication,
                                            HttpServletRequest request) {
        discoverService.deleteDiscover(id);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "DELETE_DISCOVER", "discover", id, request.getRemoteAddr(), "success");
        return ApiResponse.success();
    }

    @PostMapping("/remove-duplicates")
    public ApiResponse<Map<String, Integer>> removeDuplicates(Authentication authentication,
                                                             HttpServletRequest request) {
        int deletedCount = discoverService.removeDuplicates();
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "REMOVE_DUPLICATES", "discover", null, request.getRemoteAddr(), "success",
                Map.of("deletedCount", deletedCount));
        return ApiResponse.success(Map.of("deleted", deletedCount));
    }

    @PostMapping("/batch-delete")
    public ApiResponse<Void> batchDelete(@RequestBody List<Long> ids,
                                         Authentication authentication,
                                         HttpServletRequest request) {
        discoverService.batchDelete(ids);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "BATCH_DELETE_DISCOVER", "discover", null, request.getRemoteAddr(), "success",
                Map.of("count", ids.size()));
        return ApiResponse.success();
    }

    @PutMapping("/batch-status")
    public ApiResponse<Map<String, Integer>> batchUpdateStatus(@RequestBody Map<String, Object> requestBody,
                                                                Authentication authentication,
                                                                HttpServletRequest request) {
        List<Long> ids = (List<Long>) requestBody.get("ids");
        String status = (String) requestBody.get("status");
        int updated = discoverService.batchUpdateStatus(ids, status);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "BATCH_UPDATE_STATUS", "discover", null, request.getRemoteAddr(), "success",
                Map.of("count", updated, "status", status));
        return ApiResponse.success(Map.of("updated", updated));
    }

    @PutMapping("/batch-category")
    public ApiResponse<Map<String, Integer>> batchUpdateCategory(@RequestBody Map<String, Object> requestBody,
                                                                   Authentication authentication,
                                                                   HttpServletRequest request) {
        List<Long> ids = (List<Long>) requestBody.get("ids");
        Long categoryId = ((Number) requestBody.get("categoryId")).longValue();
        int updated = discoverService.batchUpdateCategory(ids, categoryId);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "BATCH_UPDATE_CATEGORY", "discover", null, request.getRemoteAddr(), "success",
                Map.of("count", updated, "categoryId", categoryId));
        return ApiResponse.success(Map.of("updated", updated));
    }
}
