package com.zhilian.server.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.dto.PageData;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.entity.Category;
import com.zhilian.server.service.CategoryService;
import com.zhilian.server.service.OperationLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/categories")
@Validated
public class CategoryController {
    
    private final CategoryService categoryService;
    private final OperationLogService operationLogService;

    public CategoryController(CategoryService categoryService, OperationLogService operationLogService) {
        this.categoryService = categoryService;
        this.operationLogService = operationLogService;
    }
    
    @GetMapping
    public ApiResponse<PageData<Category>> getCategoryList(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "pageNum 必须大于等于 1") int pageNum,
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "pageSize 必须大于等于 1") @Max(value = 100, message = "pageSize 不能超过 100") int pageSize,
            @RequestParam(required = false) @Pattern(regexp = "^(user|discover)$", message = "type 仅支持 user/discover") String type,
            @RequestParam(required = false) String creatorKeyword,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder) {
        Page<Category> page = categoryService.getCategoryList(pageNum, pageSize, type, creatorKeyword, sortField, sortOrder);
        return ApiResponse.success(PageData.from(page));
    }
    
    @GetMapping("/all")
    public ApiResponse<List<Category>> getAllCategories(@RequestParam(required = false) @Pattern(regexp = "^(user|discover)$", message = "type 仅支持 user/discover") String type) {
        List<Category> categories = categoryService.getAllCategories(type);
        return ApiResponse.success(categories);
    }
    
    @GetMapping("/{id}")
    public ApiResponse<Category> getCategory(@PathVariable @Positive(message = "id 必须大于 0") Long id) {
        Category category = categoryService.getCategoryById(id);
        return ApiResponse.success(category);
    }
    
    @PostMapping
    public ApiResponse<Category> createCategory(@RequestBody Category category,
                                                Authentication authentication,
                                                HttpServletRequest request) {
        Admin admin = (Admin) authentication.getPrincipal();
        Category created = categoryService.createCategory(category, admin.getId(), "admin");
        operationLogService.log(admin.getId(), "CREATE_CATEGORY", "category", created.getId(), request.getRemoteAddr(), "success",
                Map.of("name", created.getName()));
        return ApiResponse.success(created);
    }
    
    @PutMapping("/{id}")
    public ApiResponse<Category> updateCategory(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                                @RequestBody Category category,
                                                Authentication authentication,
                                                HttpServletRequest request) {
        Category updated = categoryService.updateCategory(id, category);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "UPDATE_CATEGORY", "category", id, request.getRemoteAddr(), "success",
                Map.of("updatedFields", "partial"));
        return ApiResponse.success(updated);
    }

    @PutMapping("/{id}/sort")
    public ApiResponse<Category> updateCategorySort(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                                    @RequestParam @Min(value = 0, message = "sort 不能小于 0") Integer sort,
                                                    Authentication authentication,
                                                    HttpServletRequest request) {
        Category updated = categoryService.updateCategorySort(id, sort);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "SORT_CATEGORY", "category", id, request.getRemoteAddr(), "success",
                Map.of("sort", sort));
        return ApiResponse.success(updated);
    }
    
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                            Authentication authentication,
                                            HttpServletRequest request) {
        categoryService.deleteCategory(id);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "DELETE_CATEGORY", "category", id, request.getRemoteAddr(), "success");
        return ApiResponse.success();
    }

    @PostMapping("/remove-duplicates")
    public ApiResponse<Map<String, Integer>> removeDuplicates(
            @RequestParam(required = false) @Pattern(regexp = "^(user|discover)$", message = "type 仅支持 user/discover") String type,
            Authentication authentication,
            HttpServletRequest request) {
        int deletedCount = categoryService.removeDuplicates(type);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "REMOVE_DUPLICATES", "category", null, request.getRemoteAddr(), "success",
                Map.of("deletedCount", deletedCount));
        return ApiResponse.success(Map.of("deleted", deletedCount));
    }
}
