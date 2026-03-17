package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.common.ErrorCode;
import com.zhilian.server.entity.Article;
import com.zhilian.server.entity.Bookmark;
import com.zhilian.server.exception.BizException;
import com.zhilian.server.mapper.ArticleMapper;
import com.zhilian.server.mapper.BookmarkMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;
import java.util.stream.Collectors;

@Service
public class BookmarkService {

    private static final Set<String> ALLOWED_SOURCES = new HashSet<>(Arrays.asList("user", "discover"));
    
    private final BookmarkMapper bookmarkMapper;
    private final ArticleMapper articleMapper;

    public BookmarkService(BookmarkMapper bookmarkMapper, ArticleMapper articleMapper) {
        this.bookmarkMapper = bookmarkMapper;
        this.articleMapper = articleMapper;
    }
    
    public Page<Bookmark> getBookmarkList(int pageNum, int pageSize, String keyword, Long categoryId, Long userId,
                                          String source, String sortField, String sortOrder) {
        Page<Bookmark> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Bookmark> wrapper = buildListWrapper(keyword, categoryId, userId, source, sortField, sortOrder);
        return bookmarkMapper.selectPage(page, wrapper);
    }
    
    public Bookmark getBookmarkById(Long id) {
        Bookmark bookmark = bookmarkMapper.selectById(id);
        if (bookmark == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "收藏不存在");
        }
        return bookmark;
    }
    
    public Bookmark createBookmark(Bookmark bookmark) {
        validateCreateRequest(bookmark);
        bookmark.setCreatedAt(LocalDateTime.now());
        bookmark.setUpdatedAt(LocalDateTime.now());
        if (bookmark.getTags() == null || bookmark.getTags().isBlank()) {
            bookmark.setTags("[]");
        }
        if (bookmark.getFavicon() == null) {
            bookmark.setFavicon("");
        }
        bookmarkMapper.insert(bookmark);
        return bookmark;
    }
    
    public Bookmark updateBookmark(Long id, Bookmark bookmark) {
        Bookmark existing = bookmarkMapper.selectById(id);
        if (existing == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "收藏不存在");
        }

        validateUpdateRequest(bookmark);
        
        if (bookmark.getTitle() != null) existing.setTitle(bookmark.getTitle());
        if (bookmark.getUrl() != null) existing.setUrl(bookmark.getUrl());
        if (bookmark.getDescription() != null) existing.setDescription(bookmark.getDescription());
        if (bookmark.getCategoryId() != null) existing.setCategoryId(bookmark.getCategoryId());
        if (bookmark.getTags() != null) {
            existing.setTags(bookmark.getTags().isBlank() ? "[]" : bookmark.getTags());
        }
        if (bookmark.getSource() != null) existing.setSource(bookmark.getSource());
        if (bookmark.getIsPublic() != null) existing.setIsPublic(bookmark.getIsPublic());
        if (bookmark.getFavicon() != null) existing.setFavicon(bookmark.getFavicon());
        
        existing.setUpdatedAt(LocalDateTime.now());
        bookmarkMapper.updateById(existing);
        return existing;
    }
    
    public void deleteBookmark(Long id) {
        Bookmark existing = bookmarkMapper.selectById(id);
        if (existing == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "收藏不存在");
        }

        LambdaQueryWrapper<Article> articleWrapper = new LambdaQueryWrapper<>();
        articleWrapper.eq(Article::getBookmarkId, id);
        articleMapper.delete(articleWrapper);

        bookmarkMapper.deleteById(id);
    }
    
    public void batchDelete(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new BizException(ErrorCode.BAD_REQUEST, "ids 不能为空");
        }

        LambdaQueryWrapper<Article> articleWrapper = new LambdaQueryWrapper<>();
        articleWrapper.in(Article::getBookmarkId, ids);
        articleMapper.delete(articleWrapper);

        bookmarkMapper.deleteBatchIds(ids);
    }
    
    public long getBookmarkCount() {
        return bookmarkMapper.selectCount(null);
    }
    
    public long getBookmarkCountByUser(Long userId) {
        LambdaQueryWrapper<Bookmark> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Bookmark::getUserId, userId);
        return bookmarkMapper.selectCount(wrapper);
    }

    public long getTodayBookmarkCount() {
        LocalDateTime start = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LambdaQueryWrapper<Bookmark> wrapper = new LambdaQueryWrapper<>();
        wrapper.ge(Bookmark::getCreatedAt, start);
        return bookmarkMapper.selectCount(wrapper);
    }

    public Map<String, Long> getBookmarkTypeStats() {
        LambdaQueryWrapper<Bookmark> publicWrapper = new LambdaQueryWrapper<>();
        publicWrapper.eq(Bookmark::getIsPublic, true);
        long publicCount = bookmarkMapper.selectCount(publicWrapper);

        LambdaQueryWrapper<Bookmark> privateWrapper = new LambdaQueryWrapper<>();
        privateWrapper.eq(Bookmark::getIsPublic, false);
        long privateCount = bookmarkMapper.selectCount(privateWrapper);

        Map<String, Long> stats = new HashMap<>();
        stats.put("total", publicCount + privateCount);
        stats.put("public", publicCount);
        stats.put("private", privateCount);
        return stats;
    }

    public Map<String, Long> getCategoryDistribution() {
        List<Bookmark> bookmarks = bookmarkMapper.selectList(null);
        Map<String, Long> distribution = new HashMap<>();
        bookmarks.forEach(bookmark -> {
            String key = bookmark.getCategoryId() == null ? "uncategorized" : String.valueOf(bookmark.getCategoryId());
            distribution.put(key, distribution.getOrDefault(key, 0L) + 1);
        });
        return distribution;
    }

    public Map<String, Long> getCategoryDistributionByUser(Long userId) {
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

    public List<Bookmark> getRecentBookmarksByUser(Long userId, int limit) {
        LambdaQueryWrapper<Bookmark> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Bookmark::getUserId, userId)
                .orderByDesc(Bookmark::getCreatedAt)
                .last("LIMIT " + Math.max(1, limit));
        return bookmarkMapper.selectList(wrapper);
    }

    public Map<String, Long> getRecentBookmarkGrowth(int days) {
        LocalDateTime start = LocalDateTime.now().minusDays(days - 1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LambdaQueryWrapper<Bookmark> wrapper = new LambdaQueryWrapper<>();
        wrapper.ge(Bookmark::getCreatedAt, start);
        List<Bookmark> bookmarks = bookmarkMapper.selectList(wrapper);

        Map<String, Long> trend = new HashMap<>();
        bookmarks.forEach(bookmark -> {
            String day = bookmark.getCreatedAt().toLocalDate().toString();
            trend.put(day, trend.getOrDefault(day, 0L) + 1);
        });
        return trend;
    }

    public List<Map<String, Object>> getTopSites(int limit) {
        List<Bookmark> bookmarks = bookmarkMapper.selectList(null);
        Map<String, Long> counter = new HashMap<>();
        bookmarks.forEach(bookmark -> {
            String key = resolveSiteKey(bookmark);
            counter.put(key, counter.getOrDefault(key, 0L) + 1);
        });

        return counter.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(Math.max(1, limit))
                .map(entry -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("site", entry.getKey());
                    item.put("count", entry.getValue());
                    return item;
                })
                .collect(Collectors.toList());
    }

    public String exportBookmarksAsCsv(String keyword, Long categoryId, Long userId, String source,
                                       String sortField, String sortOrder) {
        LambdaQueryWrapper<Bookmark> wrapper = buildListWrapper(keyword, categoryId, userId, source, sortField, sortOrder);
        List<Bookmark> bookmarks = bookmarkMapper.selectList(wrapper);

        StringJoiner joiner = new StringJoiner("\n");
        joiner.add("id,userId,title,url,description,categoryId,source,isPublic,createdAt,updatedAt");

        bookmarks.forEach(bookmark -> joiner.add(String.join(",",
                csvValue(bookmark.getId()),
                csvValue(bookmark.getUserId()),
                csvValue(bookmark.getTitle()),
                csvValue(bookmark.getUrl()),
                csvValue(bookmark.getDescription()),
                csvValue(bookmark.getCategoryId()),
                csvValue(bookmark.getSource()),
                csvValue(bookmark.getIsPublic()),
                csvValue(bookmark.getCreatedAt()),
                csvValue(bookmark.getUpdatedAt())
        )));

        return joiner.toString();
    }

    private String csvValue(Object value) {
        if (value == null) {
            return "\"\"";
        }
        String raw = value.toString().replace("\"", "\"\"");
        return "\"" + raw + "\"";
    }

    private String resolveSiteKey(Bookmark bookmark) {
        if (bookmark.getSource() != null && !bookmark.getSource().isBlank()) {
            return bookmark.getSource();
        }
        if (bookmark.getUrl() == null || bookmark.getUrl().isBlank()) {
            return "unknown";
        }
        try {
            String host = new java.net.URI(bookmark.getUrl()).getHost();
            if (host == null || host.isBlank()) {
                return "unknown";
            }
            return host.startsWith("www.") ? host.substring(4) : host;
        } catch (Exception e) {
            return "unknown";
        }
    }

    private LambdaQueryWrapper<Bookmark> buildListWrapper(String keyword, Long categoryId, Long userId, String source,
                                                           String sortField, String sortOrder) {
        LambdaQueryWrapper<Bookmark> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(Bookmark::getTitle, keyword)
                    .or().like(Bookmark::getDescription, keyword)
                    .or().like(Bookmark::getUrl, keyword));
        }
        if (categoryId != null) {
            wrapper.eq(Bookmark::getCategoryId, categoryId);
        }
        if (userId != null) {
            wrapper.eq(Bookmark::getUserId, userId);
        }
        if (source != null && !source.isBlank()) {
            wrapper.eq(Bookmark::getSource, source);
        }
        applySort(wrapper, sortField, sortOrder);
        return wrapper;
    }

    private void applySort(LambdaQueryWrapper<Bookmark> wrapper, String sortField, String sortOrder) {
        boolean asc = "asc".equalsIgnoreCase(sortOrder) || "ascend".equalsIgnoreCase(sortOrder);
        String field = sortField == null ? "createdAt" : sortField;

        switch (field) {
            case "title" -> {
                if (asc) wrapper.orderByAsc(Bookmark::getTitle);
                else wrapper.orderByDesc(Bookmark::getTitle);
            }
            case "updatedAt" -> {
                if (asc) wrapper.orderByAsc(Bookmark::getUpdatedAt);
                else wrapper.orderByDesc(Bookmark::getUpdatedAt);
            }
            case "userId" -> {
                if (asc) wrapper.orderByAsc(Bookmark::getUserId);
                else wrapper.orderByDesc(Bookmark::getUserId);
            }
            case "categoryId" -> {
                if (asc) wrapper.orderByAsc(Bookmark::getCategoryId);
                else wrapper.orderByDesc(Bookmark::getCategoryId);
            }
            case "source" -> {
                if (asc) wrapper.orderByAsc(Bookmark::getSource);
                else wrapper.orderByDesc(Bookmark::getSource);
            }
            default -> {
                if (asc) wrapper.orderByAsc(Bookmark::getCreatedAt);
                else wrapper.orderByDesc(Bookmark::getCreatedAt);
            }
        }
    }

    private void validateCreateRequest(Bookmark bookmark) {
        if (bookmark.getUserId() == null || bookmark.getUserId() <= 0) {
            throw new RuntimeException("userId 必填且必须大于 0");
        }
        if (bookmark.getTitle() == null || bookmark.getTitle().isBlank()) {
            throw new RuntimeException("title 必填");
        }
        if (bookmark.getUrl() == null || bookmark.getUrl().isBlank()) {
            throw new RuntimeException("url 必填");
        }
        validateSource(bookmark.getSource());
    }

    private void validateUpdateRequest(Bookmark bookmark) {
        if (bookmark.getTitle() != null && bookmark.getTitle().isBlank()) {
            throw new RuntimeException("title 不能为空字符串");
        }
        if (bookmark.getUrl() != null && bookmark.getUrl().isBlank()) {
            throw new RuntimeException("url 不能为空字符串");
        }
        validateSource(bookmark.getSource());
    }

    private void validateSource(String source) {
        if (source != null && !source.isBlank() && !ALLOWED_SOURCES.contains(source)) {
            throw new RuntimeException("source 仅支持 user/discover");
        }
    }

    public List<Bookmark> getAllBookmarks() {
        return bookmarkMapper.selectList(null);
    }

    public Map<String, Object> getBookmarkStats(Long userId) {
        LambdaQueryWrapper<Bookmark> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Bookmark::getUserId, userId);
        List<Bookmark> all = bookmarkMapper.selectList(wrapper);

        long total = all.size();

        // 分类分布（使用 String 键便于 JSON 序列化与前端一致）
        Map<String, Long> categoryDist = new HashMap<>();
        all.stream()
                .filter(b -> b.getCategoryId() != null)
                .collect(Collectors.groupingBy(Bookmark::getCategoryId, Collectors.counting()))
                .forEach((k, v) -> categoryDist.put(String.valueOf(k), v));

        // 标签频率
        Map<String, Long> tagFreq = new HashMap<>();
        for (Bookmark b : all) {
            if (b.getTags() != null && !b.getTags().isBlank()) {
                String tags = b.getTags().trim();
                List<String> tagList;
                if (tags.startsWith("[")) {
                    // JSON 数组格式
                    tags = tags.replaceAll("[\\[\\]\"\\s]", "");
                    tagList = Arrays.asList(tags.split(","));
                } else {
                    tagList = Arrays.asList(tags.split(","));
                }
                tagList.stream().map(String::trim).filter(t -> !t.isBlank())
                        .forEach(t -> tagFreq.merge(t, 1L, Long::sum));
            }
        }

        // 近7天趋势
        List<Map<String, Object>> trendList = new java.util.ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            java.time.LocalDate day = java.time.LocalDate.now().minusDays(i);
            long count = all.stream()
                    .filter(b -> b.getCreatedAt() != null && b.getCreatedAt().toLocalDate().equals(day))
                    .count();
            Map<String, Object> entry = new HashMap<>();
            entry.put("date", day.toString());
            entry.put("count", count);
            trendList.add(entry);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("total", total);
        result.put("categoryDistribution", categoryDist);
        result.put("tagFrequency", tagFreq);
        result.put("recentTrend", trendList);
        return result;
    }
}
