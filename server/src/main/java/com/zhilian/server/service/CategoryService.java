package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.common.ErrorCode;
import com.zhilian.server.entity.Category;
import com.zhilian.server.entity.DiscoverBookmark;
import com.zhilian.server.entity.Bookmark;
import com.zhilian.server.exception.BizException;
import com.zhilian.server.mapper.CategoryMapper;
import com.zhilian.server.mapper.DiscoverBookmarkMapper;
import com.zhilian.server.mapper.BookmarkMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class CategoryService {

    private static final Set<String> ALLOWED_CATEGORY_TYPES = new HashSet<>(List.of("user", "discover"));
    private static final Set<String> ALLOWED_CATEGORY_STATUS = new HashSet<>(List.of("visible", "hidden"));
    
    private final CategoryMapper categoryMapper;
    private final BookmarkMapper bookmarkMapper;
    private final DiscoverBookmarkMapper discoverBookmarkMapper;

    public CategoryService(CategoryMapper categoryMapper, BookmarkMapper bookmarkMapper,
                           DiscoverBookmarkMapper discoverBookmarkMapper) {
        this.categoryMapper = categoryMapper;
        this.bookmarkMapper = bookmarkMapper;
        this.discoverBookmarkMapper = discoverBookmarkMapper;
    }
    
    public Page<Category> getCategoryList(int pageNum, int pageSize, String type, String sortField, String sortOrder) {
        Page<Category> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Category> wrapper = new LambdaQueryWrapper<>();
        if (type != null && !type.isEmpty()) {
            wrapper.eq(Category::getType, type);
        }
        applySort(wrapper, sortField, sortOrder);
        return categoryMapper.selectPage(page, wrapper);
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
    
    public Category createCategory(Category category, Long userId) {
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
        category.setCreatedAt(LocalDateTime.now());
        categoryMapper.insert(category);
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

    public void batchDelete(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        for (Long id : ids) {
            deleteCategory(id);
        }
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
