package com.zhilian.server.controller;

import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.entity.Category;
import com.zhilian.server.entity.DiscoverBookmark;
import com.zhilian.server.service.CategoryService;
import com.zhilian.server.service.DiscoverService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/discover")
@Validated
public class PublicDiscoverController {
    
    private final DiscoverService discoverService;
    private final CategoryService categoryService;
    
    public PublicDiscoverController(DiscoverService discoverService, CategoryService categoryService) {
        this.discoverService = discoverService;
        this.categoryService = categoryService;
    }
    
    @GetMapping("/categories")
    public ApiResponse<List<Category>> getDiscoverCategories() {
        List<Category> categories = categoryService.getAllCategories("discover");
        return ApiResponse.success(categories);
    }
    
    @GetMapping("/bookmarks")
    public ApiResponse<List<DiscoverBookmark>> getDiscoverBookmarks(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId) {
        List<DiscoverBookmark> bookmarks = discoverService.getPublicDiscoverList(keyword, categoryId);
        return ApiResponse.success(bookmarks);
    }
}
