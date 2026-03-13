package com.zhilian.server.controller;

import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.service.ArticleService;
import com.zhilian.server.service.BookmarkService;
import com.zhilian.server.service.CategoryService;
import com.zhilian.server.service.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/stats")
public class StatsController {
    
    private final UserService userService;
    private final BookmarkService bookmarkService;
    private final CategoryService categoryService;
    private final ArticleService articleService;

    public StatsController(UserService userService, BookmarkService bookmarkService,
                           CategoryService categoryService, ArticleService articleService) {
        this.userService = userService;
        this.bookmarkService = bookmarkService;
        this.categoryService = categoryService;
        this.articleService = articleService;
    }
    
    @GetMapping("/overview")
    public ApiResponse<Map<String, Object>> getOverview() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("userCount", userService.getUserCount());
        stats.put("todayLoginUserCount", userService.getTodayLoginUserCount());
        stats.put("bookmarkCount", bookmarkService.getBookmarkCount());
        stats.put("articleCount", articleService.getArticleCount());
        stats.put("categoryCount", categoryService.getAllCategories("user").size());
        stats.put("discoverCategoryCount", categoryService.getAllCategories("discover").size());
        stats.put("todayBookmarkCount", bookmarkService.getTodayBookmarkCount());
        return ApiResponse.success(stats);
    }

    @GetMapping("/users")
    public ApiResponse<Map<String, Object>> getUserStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("status", userService.getUserStatusStats());
        stats.put("recentGrowth", userService.getRecentUserGrowth(7));
        stats.put("topUsers", userService.getTopUsersByBookmarkCount(10));
        return ApiResponse.success(stats);
    }

    @GetMapping("/bookmarks")
    public ApiResponse<Map<String, Object>> getBookmarkStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("visibility", bookmarkService.getBookmarkTypeStats());
        stats.put("categoryDistribution", bookmarkService.getCategoryDistribution());
        stats.put("recentGrowth", bookmarkService.getRecentBookmarkGrowth(7));
        stats.put("topSites", bookmarkService.getTopSites(10));
        return ApiResponse.success(stats);
    }
}
