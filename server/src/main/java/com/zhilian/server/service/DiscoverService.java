package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.common.ErrorCode;
import com.zhilian.server.entity.DiscoverBookmark;
import com.zhilian.server.exception.BizException;
import com.zhilian.server.mapper.DiscoverBookmarkMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.StringJoiner;

@Service
public class DiscoverService {

    private static final Set<String> ALLOWED_DISCOVER_STATUS = new HashSet<>(List.of("visible", "hidden"));

    private final DiscoverBookmarkMapper discoverBookmarkMapper;

    public DiscoverService(DiscoverBookmarkMapper discoverBookmarkMapper) {
        this.discoverBookmarkMapper = discoverBookmarkMapper;
    }

    public Page<DiscoverBookmark> getDiscoverList(int pageNum, int pageSize, String keyword, Long categoryId, String status,
                                                  String sortField, String sortOrder) {
        Page<DiscoverBookmark> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<DiscoverBookmark> wrapper = buildListWrapper(keyword, categoryId, status, sortField, sortOrder);

        return discoverBookmarkMapper.selectPage(page, wrapper);
    }

    public List<DiscoverBookmark> getPublicDiscoverList(String keyword, Long categoryId) {
        LambdaQueryWrapper<DiscoverBookmark> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DiscoverBookmark::getStatus, "visible");
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(DiscoverBookmark::getTitle, keyword)
                    .or().like(DiscoverBookmark::getDescription, keyword));
        }
        if (categoryId != null) {
            wrapper.eq(DiscoverBookmark::getCategoryId, categoryId);
        }
        wrapper.orderByAsc(DiscoverBookmark::getSort);
        return discoverBookmarkMapper.selectList(wrapper);
    }

    public String exportDiscoverAsCsv(String keyword, Long categoryId, String status, String sortField, String sortOrder) {
        LambdaQueryWrapper<DiscoverBookmark> wrapper = buildListWrapper(keyword, categoryId, status, sortField, sortOrder);
        List<DiscoverBookmark> discoverList = discoverBookmarkMapper.selectList(wrapper);

        StringJoiner joiner = new StringJoiner("\n");
        joiner.add("id,categoryId,title,url,description,source,status,sort,createdAt,updatedAt");

        discoverList.forEach(item -> joiner.add(String.join(",",
                csvValue(item.getId()),
                csvValue(item.getCategoryId()),
                csvValue(item.getTitle()),
                csvValue(item.getUrl()),
                csvValue(item.getDescription()),
                csvValue(item.getSource()),
                csvValue(item.getStatus()),
                csvValue(item.getSort()),
                csvValue(item.getCreatedAt()),
                csvValue(item.getUpdatedAt())
        )));

        return joiner.toString();
    }

    private LambdaQueryWrapper<DiscoverBookmark> buildListWrapper(String keyword, Long categoryId, String status,
                                                                  String sortField, String sortOrder) {
        LambdaQueryWrapper<DiscoverBookmark> wrapper = new LambdaQueryWrapper<>();

        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(DiscoverBookmark::getTitle, keyword)
                    .or().like(DiscoverBookmark::getDescription, keyword)
                    .or().like(DiscoverBookmark::getUrl, keyword));
        }
        if (categoryId != null) {
            wrapper.eq(DiscoverBookmark::getCategoryId, categoryId);
        }
        if (status != null && !status.isBlank()) {
            wrapper.eq(DiscoverBookmark::getStatus, status);
        }

        applySort(wrapper, sortField, sortOrder);
        return wrapper;
    }

    public DiscoverBookmark getDiscoverById(Long id) {
        DiscoverBookmark discover = discoverBookmarkMapper.selectById(id);
        if (discover == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "发现内容不存在");
        }
        return discover;
    }

    public DiscoverBookmark createDiscover(DiscoverBookmark discoverBookmark) {
        if (discoverBookmark.getCategoryId() == null || discoverBookmark.getCategoryId() <= 0) {
            throw new RuntimeException("categoryId 必填且必须大于 0");
        }
        if (discoverBookmark.getTitle() == null || discoverBookmark.getTitle().isBlank()) {
            throw new RuntimeException("title 必填");
        }
        if (discoverBookmark.getUrl() == null || discoverBookmark.getUrl().isBlank()) {
            throw new RuntimeException("url 必填");
        }
        validateStatus(discoverBookmark.getStatus());

        String normalizedUrl = normalizeUrl(discoverBookmark.getUrl());
        LambdaQueryWrapper<DiscoverBookmark> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DiscoverBookmark::getUrl, normalizedUrl);
        DiscoverBookmark existing = discoverBookmarkMapper.selectOne(wrapper);
        if (existing != null) {
            existing.setTitle(discoverBookmark.getTitle());
            existing.setDescription(discoverBookmark.getDescription());
            existing.setCategoryId(discoverBookmark.getCategoryId());
            existing.setFavicon(discoverBookmark.getFavicon());
            existing.setThumbnail(discoverBookmark.getThumbnail());
            existing.setUpdatedAt(LocalDateTime.now());
            discoverBookmarkMapper.updateById(existing);
            return existing;
        }

        discoverBookmark.setUrl(normalizedUrl);
        discoverBookmark.setCreatedAt(LocalDateTime.now());
        discoverBookmark.setUpdatedAt(LocalDateTime.now());
        if (discoverBookmark.getSort() == null) {
            discoverBookmark.setSort(0);
        }
        if (discoverBookmark.getStatus() == null || discoverBookmark.getStatus().isBlank()) {
            discoverBookmark.setStatus("visible");
        }
        if (discoverBookmark.getFavicon() == null || discoverBookmark.getFavicon().isBlank()) {
            discoverBookmark.setFavicon(buildFaviconUrl(normalizedUrl));
        }
        discoverBookmarkMapper.insert(discoverBookmark);
        return discoverBookmark;
    }

    public DiscoverBookmark updateDiscover(Long id, DiscoverBookmark discoverBookmark) {
        DiscoverBookmark existing = discoverBookmarkMapper.selectById(id);
        if (existing == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "发现内容不存在");
        }

        if (discoverBookmark.getTitle() != null && discoverBookmark.getTitle().isBlank()) {
            throw new RuntimeException("title 不能为空字符串");
        }
        if (discoverBookmark.getUrl() != null && discoverBookmark.getUrl().isBlank()) {
            throw new RuntimeException("url 不能为空字符串");
        }
        validateStatus(discoverBookmark.getStatus());

        if (discoverBookmark.getCategoryId() != null) existing.setCategoryId(discoverBookmark.getCategoryId());
        if (discoverBookmark.getTitle() != null) existing.setTitle(discoverBookmark.getTitle());
        if (discoverBookmark.getUrl() != null) existing.setUrl(discoverBookmark.getUrl());
        if (discoverBookmark.getDescription() != null) existing.setDescription(discoverBookmark.getDescription());
        if (discoverBookmark.getFavicon() != null) existing.setFavicon(discoverBookmark.getFavicon());
        if (discoverBookmark.getThumbnail() != null) existing.setThumbnail(discoverBookmark.getThumbnail());
        if (discoverBookmark.getSource() != null) existing.setSource(discoverBookmark.getSource());
        if (discoverBookmark.getTags() != null) existing.setTags(discoverBookmark.getTags());
        if (discoverBookmark.getSort() != null) existing.setSort(discoverBookmark.getSort());
        if (discoverBookmark.getStatus() != null) existing.setStatus(discoverBookmark.getStatus());

        existing.setUpdatedAt(LocalDateTime.now());
        discoverBookmarkMapper.updateById(existing);
        return existing;
    }

    public void deleteDiscover(Long id) {
        DiscoverBookmark existing = discoverBookmarkMapper.selectById(id);
        if (existing == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "发现内容不存在");
        }
        discoverBookmarkMapper.deleteById(id);
    }

    public int batchDelete(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        return discoverBookmarkMapper.deleteBatchIds(ids);
    }

    public int batchUpdateStatus(List<Long> ids, String status) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        if (!ALLOWED_DISCOVER_STATUS.contains(status)) {
            throw new BizException(ErrorCode.BAD_REQUEST, "状态仅支持 visible/hidden");
        }
        List<DiscoverBookmark> items = discoverBookmarkMapper.selectBatchIds(ids);
        for (DiscoverBookmark item : items) {
            item.setStatus(status);
            item.setUpdatedAt(LocalDateTime.now());
            discoverBookmarkMapper.updateById(item);
        }
        return items.size();
    }

    public int batchUpdateCategory(List<Long> ids, Long categoryId) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        List<DiscoverBookmark> items = discoverBookmarkMapper.selectBatchIds(ids);
        for (DiscoverBookmark item : items) {
            item.setCategoryId(categoryId);
            item.setUpdatedAt(LocalDateTime.now());
            discoverBookmarkMapper.updateById(item);
        }
        return items.size();
    }

    public int removeDuplicates() {
        List<DiscoverBookmark> all = discoverBookmarkMapper.selectList(null);
        Set<String> seenUrls = new HashSet<>();
        int deletedCount = 0;
        
        for (DiscoverBookmark item : all) {
            if (item.getUrl() == null || item.getUrl().isBlank()) {
                continue;
            }
            String normalizedUrl = normalizeUrl(item.getUrl());
            if (seenUrls.contains(normalizedUrl)) {
                discoverBookmarkMapper.deleteById(item.getId());
                deletedCount++;
            } else {
                seenUrls.add(normalizedUrl);
            }
        }
        return deletedCount;
    }

    private String buildFaviconUrl(String url) {
        try {
            java.net.URI uri = new java.net.URI(url);
            String host = uri.getHost();
            if (host == null || host.isBlank()) return "";
            return "https://www.google.com/s2/favicons?domain=" + host + "&sz=64";
        } catch (Exception e) {
            return "";
        }
    }

    private String normalizeUrl(String url) {
        try {
            String normalized = url.toLowerCase().trim();
            if (normalized.startsWith("http://")) {
                normalized = "https://" + normalized.substring(7);
            }
            if (normalized.startsWith("https://www.")) {
                normalized = "https://" + normalized.substring(12);
            }
            if (normalized.endsWith("/")) {
                normalized = normalized.substring(0, normalized.length() - 1);
            }
            return normalized;
        } catch (Exception e) {
            return url.toLowerCase().trim();
        }
    }

    private void applySort(LambdaQueryWrapper<DiscoverBookmark> wrapper, String sortField, String sortOrder) {
        boolean asc = "asc".equalsIgnoreCase(sortOrder) || "ascend".equalsIgnoreCase(sortOrder);
        String field = sortField == null ? "sort" : sortField;

        switch (field) {
            case "title" -> {
                if (asc) wrapper.orderByAsc(DiscoverBookmark::getTitle);
                else wrapper.orderByDesc(DiscoverBookmark::getTitle);
            }
            case "status" -> {
                if (asc) wrapper.orderByAsc(DiscoverBookmark::getStatus);
                else wrapper.orderByDesc(DiscoverBookmark::getStatus);
            }
            case "createdAt" -> {
                if (asc) wrapper.orderByAsc(DiscoverBookmark::getCreatedAt);
                else wrapper.orderByDesc(DiscoverBookmark::getCreatedAt);
            }
            default -> {
                if (asc) wrapper.orderByAsc(DiscoverBookmark::getSort);
                else wrapper.orderByDesc(DiscoverBookmark::getSort);
            }
        }
    }

    private String csvValue(Object value) {
        if (value == null) {
            return "\"\"";
        }
        String raw = value.toString().replace("\"", "\"\"");
        return "\"" + raw + "\"";
    }

    private void validateStatus(String status) {
        if (status != null && !status.isBlank() && !ALLOWED_DISCOVER_STATUS.contains(status)) {
            throw new RuntimeException("status 仅支持 visible/hidden");
        }
    }
}
