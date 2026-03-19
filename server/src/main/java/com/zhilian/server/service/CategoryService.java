package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.common.ErrorCode;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.entity.Category;
import com.zhilian.server.entity.DiscoverBookmark;
import com.zhilian.server.entity.Bookmark;
import com.zhilian.server.entity.User;
import com.zhilian.server.exception.BizException;
import com.zhilian.server.mapper.AdminMapper;
import com.zhilian.server.mapper.CategoryMapper;
import com.zhilian.server.mapper.DiscoverBookmarkMapper;
import com.zhilian.server.mapper.BookmarkMapper;
import com.zhilian.server.mapper.UserMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    private static final Set<String> ALLOWED_CATEGORY_TYPES = new HashSet<>(List.of("user", "discover"));
    private static final Set<String> ALLOWED_CATEGORY_STATUS = new HashSet<>(List.of("visible", "hidden"));
    
    private final CategoryMapper categoryMapper;
    private final BookmarkMapper bookmarkMapper;
    private final DiscoverBookmarkMapper discoverBookmarkMapper;
    private final UserMapper userMapper;
    private final AdminMapper adminMapper;

    public CategoryService(CategoryMapper categoryMapper, BookmarkMapper bookmarkMapper,
                           DiscoverBookmarkMapper discoverBookmarkMapper,
                           UserMapper userMapper,
                           AdminMapper adminMapper) {
        this.categoryMapper = categoryMapper;
        this.bookmarkMapper = bookmarkMapper;
        this.discoverBookmarkMapper = discoverBookmarkMapper;
        this.userMapper = userMapper;
        this.adminMapper = adminMapper;
    }
    
    public Page<Category> getCategoryList(int pageNum, int pageSize, String type, String creatorKeyword, String sortField, String sortOrder) {
        Page<Category> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Category> wrapper = new LambdaQueryWrapper<>();
        if (type != null && !type.isEmpty()) {
            wrapper.eq(Category::getType, type);
        }
        applyCreatorFilter(wrapper, creatorKeyword);
        applySort(wrapper, sortField, sortOrder);
        Page<Category> result = categoryMapper.selectPage(page, wrapper);
        enrichCreatorNames(result.getRecords());
        return result;
    }
    
    public List<Category> getAllCategories(String type) {
        LambdaQueryWrapper<Category> wrapper = new LambdaQueryWrapper<>();
        if (type != null && !type.isEmpty()) {
            wrapper.eq(Category::getType, type);
        }
        wrapper.eq(Category::getStatus, "visible");
        wrapper.orderByAsc(Category::getSort);
        return categoryMapper.selectList(wrapper);
    }
    
    public Category getCategoryById(Long id) {
        Category category = categoryMapper.selectById(id);
        if (category == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "分类不存在");
        }
        return category;
    }
    
    public Category createCategory(Category category, Long creatorId, String creatorType) {
        if (category.getName() == null || category.getName().isBlank()) {
            throw new RuntimeException("name 必填");
        }
        if (category.getType() != null && !ALLOWED_CATEGORY_TYPES.contains(category.getType())) {
            throw new RuntimeException("type 仅支持 user/discover");
        }
        if (category.getStatus() != null && !ALLOWED_CATEGORY_STATUS.contains(category.getStatus())) {
            throw new RuntimeException("status 仅支持 visible/hidden");
        }

        String normalizedName = category.getName().trim().toLowerCase();
        String type = category.getType() != null ? category.getType() : "user";
        
        LambdaQueryWrapper<Category> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Category::getType, type);
        wrapper.and(w -> w.eq(Category::getName, normalizedName));
        Category existing = categoryMapper.selectOne(wrapper);
        if (existing != null) {
            return existing;
        }

        category.setName(category.getName().trim());
        category.setType(type);
        category.setCreatedById(creatorId);
        category.setCreatedByType(creatorType);
        category.setCreatedAt(LocalDateTime.now());
        categoryMapper.insert(category);
        category.setCreatedByName(resolveCreatorName(category.getCreatedById(), category.getCreatedByType()));
        return category;
    }
    
    public Category updateCategory(Long id, Category category) {
        Category existing = categoryMapper.selectById(id);
        if (existing == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "分类不存在");
        }

        if (category.getName() != null && category.getName().isBlank()) {
            throw new RuntimeException("name 不能为空字符串");
        }
        if (category.getType() != null && !ALLOWED_CATEGORY_TYPES.contains(category.getType())) {
            throw new RuntimeException("type 仅支持 user/discover");
        }
        if (category.getStatus() != null && !ALLOWED_CATEGORY_STATUS.contains(category.getStatus())) {
            throw new RuntimeException("status 仅支持 visible/hidden");
        }
        
        if (category.getName() != null) existing.setName(category.getName());
        if (category.getIcon() != null) existing.setIcon(category.getIcon());
        if (category.getParentId() != null) existing.setParentId(category.getParentId());
        if (category.getSort() != null) existing.setSort(category.getSort());
        if (category.getStatus() != null) existing.setStatus(category.getStatus());
        
        categoryMapper.updateById(existing);
        existing.setCreatedByName(resolveCreatorName(existing.getCreatedById(), existing.getCreatedByType()));
        return existing;
    }
    
    public void deleteCategory(Long id) {
        Category existing = categoryMapper.selectById(id);
        if (existing == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "分类不存在");
        }

        if ("discover".equals(existing.getType())) {
            LambdaQueryWrapper<DiscoverBookmark> discoverWrapper = new LambdaQueryWrapper<>();
            discoverWrapper.eq(DiscoverBookmark::getCategoryId, id);
            discoverBookmarkMapper.delete(discoverWrapper);
        } else {
            LambdaUpdateWrapper<Bookmark> bookmarkWrapper = new LambdaUpdateWrapper<>();
            bookmarkWrapper.eq(Bookmark::getCategoryId, id)
                    .set(Bookmark::getCategoryId, null);
            bookmarkMapper.update(null, bookmarkWrapper);
        }

        categoryMapper.deleteById(id);
    }

    public Category updateCategorySort(Long id, Integer sort) {
        Category existing = categoryMapper.selectById(id);
        if (existing == null) {
            throw new RuntimeException("分类不存在");
        }
        existing.setSort(sort);
        categoryMapper.updateById(existing);
        return existing;
    }

    public int removeDuplicates(String type) {
        LambdaQueryWrapper<Category> wrapper = new LambdaQueryWrapper<>();
        if (type != null && !type.isEmpty()) {
            wrapper.eq(Category::getType, type);
        }
        List<Category> all = categoryMapper.selectList(wrapper);
        Set<String> seenNames = new HashSet<>();
        int deletedCount = 0;
        
        for (Category item : all) {
            if (item.getName() == null || item.getName().isBlank()) {
                continue;
            }
            String normalizedName = item.getName().trim().toLowerCase();
            if (seenNames.contains(normalizedName)) {
                categoryMapper.deleteById(item.getId());
                deletedCount++;
            } else {
                seenNames.add(normalizedName);
            }
        }
        return deletedCount;
    }

    private void applyCreatorFilter(LambdaQueryWrapper<Category> wrapper, String creatorKeyword) {
        if (creatorKeyword == null || creatorKeyword.isBlank()) {
            return;
        }
        List<Long> userIds = userMapper.selectList(new LambdaQueryWrapper<User>()
                .and(w -> w.like(User::getUsername, creatorKeyword).or().like(User::getNickname, creatorKeyword)))
                .stream()
                .map(User::getId)
                .toList();
        List<Long> adminIds = adminMapper.selectList(new LambdaQueryWrapper<Admin>()
                .like(Admin::getUsername, creatorKeyword))
                .stream()
                .map(Admin::getId)
                .toList();
        if (userIds.isEmpty() && adminIds.isEmpty()) {
            wrapper.eq(Category::getId, -1L);
            return;
        }
        wrapper.and(w -> {
            boolean appended = false;
            if (!userIds.isEmpty()) {
                w.and(x -> x.eq(Category::getCreatedByType, "user").in(Category::getCreatedById, userIds));
                appended = true;
            }
            if (!adminIds.isEmpty()) {
                if (appended) {
                    w.or();
                }
                w.and(x -> x.eq(Category::getCreatedByType, "admin").in(Category::getCreatedById, adminIds));
            }
        });
    }

    private void enrichCreatorNames(List<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            return;
        }
        Map<Long, String> userNameMap = userMapper.selectList(new LambdaQueryWrapper<User>()
                        .select(User::getId, User::getUsername))
                .stream()
                .collect(Collectors.toMap(User::getId, User::getUsername, (a, b) -> a));
        Map<Long, String> adminNameMap = adminMapper.selectList(new LambdaQueryWrapper<Admin>()
                        .select(Admin::getId, Admin::getUsername))
                .stream()
                .collect(Collectors.toMap(Admin::getId, Admin::getUsername, (a, b) -> a, java.util.HashMap::new));
        categories.forEach(category -> category.setCreatedByName(resolveCreatorName(category.getCreatedById(), category.getCreatedByType(), userNameMap, adminNameMap)));
    }

    private String resolveCreatorName(Long creatorId, String creatorType) {
        return resolveCreatorName(creatorId, creatorType,
                userMapper.selectList(new LambdaQueryWrapper<User>().select(User::getId, User::getUsername)).stream()
                        .collect(Collectors.toMap(User::getId, User::getUsername, (a, b) -> a)),
                adminMapper.selectList(new LambdaQueryWrapper<Admin>().select(Admin::getId, Admin::getUsername)).stream()
                        .collect(Collectors.toMap(Admin::getId, Admin::getUsername, (a, b) -> a)));
    }

    private String resolveCreatorName(Long creatorId, String creatorType, Map<Long, String> userNameMap, Map<Long, String> adminNameMap) {
        if (creatorId == null || creatorType == null) {
            return "-";
        }
        if ("user".equalsIgnoreCase(creatorType)) {
            return userNameMap.getOrDefault(creatorId, "用户(" + creatorId + ")");
        }
        if ("admin".equalsIgnoreCase(creatorType)) {
            return adminNameMap.getOrDefault(creatorId, "管理员(" + creatorId + ")");
        }
        return "-";
    }

    private void applySort(LambdaQueryWrapper<Category> wrapper, String sortField, String sortOrder) {
        boolean asc = "asc".equalsIgnoreCase(sortOrder) || "ascend".equalsIgnoreCase(sortOrder);
        String field = sortField == null ? "sort" : sortField;

        switch (field) {
            case "name" -> {
                if (asc) wrapper.orderByAsc(Category::getName);
                else wrapper.orderByDesc(Category::getName);
            }
            case "createdAt" -> {
                if (asc) wrapper.orderByAsc(Category::getCreatedAt);
                else wrapper.orderByDesc(Category::getCreatedAt);
            }
            case "status" -> {
                if (asc) wrapper.orderByAsc(Category::getStatus);
                else wrapper.orderByDesc(Category::getStatus);
            }
            default -> {
                if (asc) wrapper.orderByAsc(Category::getSort);
                else wrapper.orderByDesc(Category::getSort);
            }
        }
    }
}
