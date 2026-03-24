package com.zhilian.server.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.entity.Article;
import com.zhilian.server.entity.Bookmark;
import com.zhilian.server.entity.Category;
import com.zhilian.server.entity.User;
import com.zhilian.server.service.ArticleService;
import com.zhilian.server.service.BookmarkService;
import com.zhilian.server.service.CategoryService;
import com.zhilian.server.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@Validated
public class UserApiController {
    
    private final UserService userService;
    private final CategoryService categoryService;
    private final BookmarkService bookmarkService;
    private final ArticleService articleService;
    
    public UserApiController(UserService userService, CategoryService categoryService,
                            BookmarkService bookmarkService, ArticleService articleService) {
        this.userService = userService;
        this.categoryService = categoryService;
        this.bookmarkService = bookmarkService;
        this.articleService = articleService;
    }
    
    @PostMapping("/register")
    public ApiResponse<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        Map<String, Object> result = userService.registerUser(request.username, request.email, request.password);
        return ApiResponse.success(result);
    }
    
    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        Map<String, Object> result = userService.loginUser(request.username, request.password);
        return ApiResponse.success(result);
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
        Category created = categoryService.createCategory(category, userId);
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
    }
    
    public static class UpdateProfileRequest {
        public String username;
        public String email;
        public String avatar;
    }
}
