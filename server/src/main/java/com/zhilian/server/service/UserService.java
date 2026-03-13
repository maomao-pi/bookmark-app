package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.common.ErrorCode;
import com.zhilian.server.controller.UserApiController;
import com.zhilian.server.dto.UserDetailResponse;
import com.zhilian.server.entity.Article;
import com.zhilian.server.entity.Bookmark;
import com.zhilian.server.entity.User;
import com.zhilian.server.exception.BizException;
import com.zhilian.server.mapper.ArticleMapper;
import com.zhilian.server.mapper.BookmarkMapper;
import com.zhilian.server.mapper.UserMapper;
import com.zhilian.server.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final Set<String> ALLOWED_USER_STATUS = new HashSet<>(List.of("active", "disabled"));
    
    private final UserMapper userMapper;
    private final BookmarkMapper bookmarkMapper;
    private final ArticleMapper articleMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public UserService(UserMapper userMapper, BookmarkMapper bookmarkMapper,
                       ArticleMapper articleMapper, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userMapper = userMapper;
        this.bookmarkMapper = bookmarkMapper;
        this.articleMapper = articleMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }
    
    public Page<User> getUserList(int pageNum, int pageSize, String keyword, String sortField, String sortOrder) {
        Page<User> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.like(User::getUsername, keyword)
                   .or()
                   .like(User::getEmail, keyword);
        }
        applySort(wrapper, sortField, sortOrder);
        Page<User> result = userMapper.selectPage(page, wrapper);
        result.getRecords().forEach(u -> {
            u.setPassword(null);
            u.setBookmarkCount(countBookmarks(u.getId()));
        });
        return result;
    }
    
    public User getUserById(Long id) {
        User user = userMapper.selectById(id);
        if (user == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "用户不存在");
        }
        user.setPassword(null);
        user.setBookmarkCount(countBookmarks(user.getId()));
        return user;
    }

    public UserDetailResponse getUserDetail(Long id) {
        User user = getUserById(id);

        Map<String, Long> categoryDistribution = getCategoryDistributionByUser(id);
        List<Bookmark> recentBookmarks = getRecentBookmarksByUser(id, 20);
        return new UserDetailResponse(user, user.getBookmarkCount(), categoryDistribution, recentBookmarks);
    }
    
    public User getUserByUsername(String username) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, username);
        User user = userMapper.selectOne(wrapper);
        if (user != null) {
            user.setPassword(null);
        }
        return user;
    }
    
    public Map<String, Object> registerUser(String username, String email, String password) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, username);
        if (userMapper.selectCount(wrapper) > 0) {
            throw new BizException(ErrorCode.BAD_REQUEST, "用户名已存在");
        }
        
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole("user");
        user.setStatus("active");
        user.setCreatedAt(LocalDateTime.now());
        
        userMapper.insert(user);
        user.setPassword(null);
        
        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        Map<String, Object> result = new HashMap<>();
        result.put("user", user);
        result.put("token", token);
        return result;
    }
    
    public Map<String, Object> loginUser(String username, String password) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, username);
        User user = userMapper.selectOne(wrapper);
        
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "用户名或密码错误");
        }
        
        if ("disabled".equals(user.getStatus())) {
            throw new BizException(ErrorCode.FORBIDDEN, "账号已被禁用");
        }
        
        user.setLastLoginAt(LocalDateTime.now());
        userMapper.updateById(user);
        
        user.setPassword(null);
        
        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        Map<String, Object> result = new HashMap<>();
        result.put("user", user);
        result.put("token", token);
        return result;
    }
    
    public User updateUserProfile(String username, UserApiController.UpdateProfileRequest request) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, username);
        User user = userMapper.selectOne(wrapper);
        
        if (user == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "用户不存在");
        }
        
        if (request.username != null) {
            user.setUsername(request.username);
        }
        if (request.email != null) {
            user.setEmail(request.email);
        }
        if (request.avatar != null) {
            user.setAvatar(request.avatar);
        }
        
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        user.setPassword(null);
        return user;
    }
     
    public User createUser(User user) {
        if (user.getUsername() == null || user.getUsername().isBlank()) {
            throw new RuntimeException("username 必填");
        }
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new RuntimeException("password 必填");
        }

        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, user.getUsername());
        if (userMapper.selectCount(wrapper) > 0) {
            throw new RuntimeException("用户名已存在");
        }
        
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setStatus("active");
        user.setCreatedAt(LocalDateTime.now());
        userMapper.insert(user);
        user.setPassword(null);
        user.setBookmarkCount(0L);
        return user;
    }
    
    public User updateUser(Long id, User user) {
        User existing = userMapper.selectById(id);
        if (existing == null) {
            throw new RuntimeException("用户不存在");
        }

        if (user.getUsername() != null && user.getUsername().isBlank()) {
            throw new RuntimeException("username 不能为空字符串");
        }
        if (user.getStatus() != null && !ALLOWED_USER_STATUS.contains(user.getStatus())) {
            throw new RuntimeException("status 仅支持 active/disabled");
        }
        
        if (user.getUsername() != null) {
            existing.setUsername(user.getUsername());
        }
        if (user.getEmail() != null) {
            existing.setEmail(user.getEmail());
        }
        if (user.getAvatar() != null) {
            existing.setAvatar(user.getAvatar());
        }
        if (user.getStatus() != null) {
            existing.setStatus(user.getStatus());
        }
        
        existing.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(existing);
        existing.setPassword(null);
        existing.setBookmarkCount(countBookmarks(existing.getId()));
        return existing;
    }
    
    public void deleteUser(Long id) {
        User user = userMapper.selectById(id);
        if (user == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "用户不存在");
        }

        LambdaQueryWrapper<Bookmark> bookmarkWrapper = new LambdaQueryWrapper<>();
        bookmarkWrapper.eq(Bookmark::getUserId, id).select(Bookmark::getId);
        List<Bookmark> bookmarks = bookmarkMapper.selectList(bookmarkWrapper);
        List<Long> bookmarkIds = bookmarks.stream().map(Bookmark::getId).collect(Collectors.toList());

        if (!bookmarkIds.isEmpty()) {
            LambdaQueryWrapper<Article> articleWrapper = new LambdaQueryWrapper<>();
            articleWrapper.in(Article::getBookmarkId, bookmarkIds);
            articleMapper.delete(articleWrapper);
        }

        LambdaQueryWrapper<Bookmark> deleteBookmarkWrapper = new LambdaQueryWrapper<>();
        deleteBookmarkWrapper.eq(Bookmark::getUserId, id);
        bookmarkMapper.delete(deleteBookmarkWrapper);

        userMapper.deleteById(id);
    }
    
    public void updateStatus(Long id, String status) {
        if (!ALLOWED_USER_STATUS.contains(status)) {
            throw new RuntimeException("status 仅支持 active/disabled");
        }
        User user = userMapper.selectById(id);
        if (user != null) {
            user.setStatus(status);
            user.setUpdatedAt(LocalDateTime.now());
            userMapper.updateById(user);
        }
    }
    
    public long getUserCount() {
        return userMapper.selectCount(null);
    }

    public long getTodayLoginUserCount() {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.ge(User::getLastLoginAt, startOfDay);
        return userMapper.selectCount(wrapper);
    }

    public Map<String, Long> getUserStatusStats() {
        LambdaQueryWrapper<User> activeWrapper = new LambdaQueryWrapper<>();
        activeWrapper.eq(User::getStatus, "active");
        long active = userMapper.selectCount(activeWrapper);

        LambdaQueryWrapper<User> disabledWrapper = new LambdaQueryWrapper<>();
        disabledWrapper.eq(User::getStatus, "disabled");
        long disabled = userMapper.selectCount(disabledWrapper);

        Map<String, Long> stats = new HashMap<>();
        stats.put("total", active + disabled);
        stats.put("active", active);
        stats.put("disabled", disabled);
        return stats;
    }

    public Map<String, Long> getRecentUserGrowth(int days) {
        LocalDateTime start = LocalDateTime.now().minusDays(days - 1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.ge(User::getCreatedAt, start);
        List<User> users = userMapper.selectList(wrapper);

        Map<String, Long> trend = new HashMap<>();
        users.forEach(user -> {
            String day = user.getCreatedAt().toLocalDate().toString();
            trend.put(day, trend.getOrDefault(day, 0L) + 1);
        });
        return trend;
    }

    public List<Map<String, Object>> getTopUsersByBookmarkCount(int limit) {
        List<User> users = userMapper.selectList(null);
        return users.stream()
                .map(user -> {
                    Map<String, Object> item = new HashMap<>();
                    long count = countBookmarks(user.getId());
                    item.put("userId", user.getId());
                    item.put("username", user.getUsername());
                    item.put("bookmarkCount", count);
                    return item;
                })
                .sorted(Comparator.comparingLong((Map<String, Object> item) -> (Long) item.get("bookmarkCount")).reversed())
                .limit(Math.max(1, limit))
                .collect(Collectors.toList());
    }

    private long countBookmarks(Long userId) {
        LambdaQueryWrapper<Bookmark> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Bookmark::getUserId, userId);
        return bookmarkMapper.selectCount(wrapper);
    }

    private Map<String, Long> getCategoryDistributionByUser(Long userId) {
        LambdaQueryWrapper<Bookmark> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Bookmark::getUserId, userId);
        List<Bookmark> bookmarks = bookmarkMapper.selectList(wrapper);

        Map<String, Long> distribution = new HashMap<>();
        bookmarks.forEach(bookmark -> {
            String key = bookmark.getCategoryId() == null ? "uncategorized" : String.valueOf(bookmark.getCategoryId());
            distribution.put(key, distribution.getOrDefault(key, 0L) + 1);
        });
        return distribution;
    }

    private List<Bookmark> getRecentBookmarksByUser(Long userId, int limit) {
        LambdaQueryWrapper<Bookmark> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Bookmark::getUserId, userId)
                .orderByDesc(Bookmark::getCreatedAt)
                .last("LIMIT " + Math.max(1, limit));
        return bookmarkMapper.selectList(wrapper);
    }

    private void applySort(LambdaQueryWrapper<User> wrapper, String sortField, String sortOrder) {
        boolean asc = "asc".equalsIgnoreCase(sortOrder) || "ascend".equalsIgnoreCase(sortOrder);
        String field = sortField == null ? "createdAt" : sortField;

        switch (field) {
            case "username" -> {
                if (asc) wrapper.orderByAsc(User::getUsername);
                else wrapper.orderByDesc(User::getUsername);
            }
            case "email" -> {
                if (asc) wrapper.orderByAsc(User::getEmail);
                else wrapper.orderByDesc(User::getEmail);
            }
            case "lastLoginAt" -> {
                if (asc) wrapper.orderByAsc(User::getLastLoginAt);
                else wrapper.orderByDesc(User::getLastLoginAt);
            }
            case "status" -> {
                if (asc) wrapper.orderByAsc(User::getStatus);
                else wrapper.orderByDesc(User::getStatus);
            }
            default -> {
                if (asc) wrapper.orderByAsc(User::getCreatedAt);
                else wrapper.orderByDesc(User::getCreatedAt);
            }
        }
    }
}
