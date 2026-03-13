package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.common.ErrorCode;
import com.zhilian.server.entity.Article;
import com.zhilian.server.exception.BizException;
import com.zhilian.server.mapper.ArticleMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.StringJoiner;

@Service
public class ArticleService {

    private static final Set<String> ALLOWED_ARTICLE_TYPES = new HashSet<>(List.of("article", "video", "document", "link"));

    private final ArticleMapper articleMapper;

    public ArticleService(ArticleMapper articleMapper) {
        this.articleMapper = articleMapper;
    }

    public Page<Article> getArticleList(int pageNum, int pageSize, String keyword, Long bookmarkId, String type,
                                        String sortField, String sortOrder) {
        Page<Article> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Article> wrapper = buildListWrapper(keyword, bookmarkId, type, sortField, sortOrder);

        return articleMapper.selectPage(page, wrapper);
    }

    public Page<Article> getUserContentList(int pageNum, int pageSize, String keyword, Long bookmarkId, String type,
                                           Long userId, String sortField, String sortOrder) {
        Page<Article> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Article> wrapper = buildUserContentWrapper(keyword, bookmarkId, type, userId, sortField, sortOrder);

        return articleMapper.selectPage(page, wrapper);
    }

    public Page<Article> getDiscoverContentList(int pageNum, int pageSize, String keyword, Long discoverBookmarkId, String type,
                                               String sortField, String sortOrder) {
        Page<Article> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Article> wrapper = buildDiscoverContentWrapper(keyword, discoverBookmarkId, type, sortField, sortOrder);

        return articleMapper.selectPage(page, wrapper);
    }

    public String exportArticlesAsCsv(String keyword, Long bookmarkId, String type, String sortField, String sortOrder) {
        LambdaQueryWrapper<Article> wrapper = buildListWrapper(keyword, bookmarkId, type, sortField, sortOrder);
        List<Article> articles = articleMapper.selectList(wrapper);

        StringJoiner joiner = new StringJoiner("\n");
        joiner.add("id,bookmarkId,title,url,description,type,createdAt");

        articles.forEach(article -> joiner.add(String.join(",",
                csvValue(article.getId()),
                csvValue(article.getBookmarkId()),
                csvValue(article.getTitle()),
                csvValue(article.getUrl()),
                csvValue(article.getDescription()),
                csvValue(article.getType()),
                csvValue(article.getCreatedAt())
        )));

        return joiner.toString();
    }

    public String exportUserContentAsCsv(String keyword, Long bookmarkId, String type, Long userId, String sortField, String sortOrder) {
        LambdaQueryWrapper<Article> wrapper = buildUserContentWrapper(keyword, bookmarkId, type, userId, sortField, sortOrder);
        List<Article> articles = articleMapper.selectList(wrapper);

        StringJoiner joiner = new StringJoiner("\n");
        joiner.add("id,bookmarkId,title,url,description,type,createdAt");

        articles.forEach(article -> joiner.add(String.join(",",
                csvValue(article.getId()),
                csvValue(article.getBookmarkId()),
                csvValue(article.getTitle()),
                csvValue(article.getUrl()),
                csvValue(article.getDescription()),
                csvValue(article.getType()),
                csvValue(article.getCreatedAt())
        )));

        return joiner.toString();
    }

    public String exportDiscoverContentAsCsv(String keyword, Long discoverBookmarkId, String type, String sortField, String sortOrder) {
        LambdaQueryWrapper<Article> wrapper = buildDiscoverContentWrapper(keyword, discoverBookmarkId, type, sortField, sortOrder);
        List<Article> articles = articleMapper.selectList(wrapper);

        StringJoiner joiner = new StringJoiner("\n");
        joiner.add("id,discoverBookmarkId,title,url,description,type,createdAt");

        articles.forEach(article -> joiner.add(String.join(",",
                csvValue(article.getId()),
                csvValue(article.getDiscoverBookmarkId()),
                csvValue(article.getTitle()),
                csvValue(article.getUrl()),
                csvValue(article.getDescription()),
                csvValue(article.getType()),
                csvValue(article.getCreatedAt())
        )));

        return joiner.toString();
    }

    private LambdaQueryWrapper<Article> buildListWrapper(String keyword, Long bookmarkId, String type,
                                                         String sortField, String sortOrder) {
        LambdaQueryWrapper<Article> wrapper = new LambdaQueryWrapper<>();

        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(Article::getTitle, keyword)
                    .or().like(Article::getDescription, keyword)
                    .or().like(Article::getUrl, keyword));
        }
        if (bookmarkId != null) {
            wrapper.eq(Article::getBookmarkId, bookmarkId);
        }
        if (type != null && !type.isBlank()) {
            wrapper.eq(Article::getType, type);
        }

        applySort(wrapper, sortField, sortOrder);
        return wrapper;
    }

    private LambdaQueryWrapper<Article> buildUserContentWrapper(String keyword, Long bookmarkId, String type, Long userId,
                                                               String sortField, String sortOrder) {
        LambdaQueryWrapper<Article> wrapper = new LambdaQueryWrapper<>();

        wrapper.isNotNull(Article::getBookmarkId);
        
        if (bookmarkId != null) {
            wrapper.eq(Article::getBookmarkId, bookmarkId);
        }

        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(Article::getTitle, keyword)
                    .or().like(Article::getDescription, keyword)
                    .or().like(Article::getUrl, keyword));
        }
        if (type != null && !type.isBlank()) {
            wrapper.eq(Article::getType, type);
        }

        applySort(wrapper, sortField, sortOrder);
        return wrapper;
    }

    private LambdaQueryWrapper<Article> buildDiscoverContentWrapper(String keyword, Long discoverBookmarkId, String type,
                                                                    String sortField, String sortOrder) {
        LambdaQueryWrapper<Article> wrapper = new LambdaQueryWrapper<>();

        wrapper.isNotNull(Article::getDiscoverBookmarkId);

        if (discoverBookmarkId != null) {
            wrapper.eq(Article::getDiscoverBookmarkId, discoverBookmarkId);
        }
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(Article::getTitle, keyword)
                    .or().like(Article::getDescription, keyword)
                    .or().like(Article::getUrl, keyword));
        }
        if (type != null && !type.isBlank()) {
            wrapper.eq(Article::getType, type);
        }

        applySort(wrapper, sortField, sortOrder);
        return wrapper;
    }

    public Article getArticleById(Long id) {
        Article article = articleMapper.selectById(id);
        if (article == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "文章不存在");
        }
        return article;
    }
    
    public List<Article> getArticlesByBookmarkId(Long bookmarkId) {
        LambdaQueryWrapper<Article> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Article::getBookmarkId, bookmarkId);
        return articleMapper.selectList(wrapper);
    }

    public Article createArticle(Article article) {
        if (article.getBookmarkId() == null || article.getBookmarkId() <= 0) {
            throw new RuntimeException("bookmarkId 必填且必须大于 0");
        }
        if (article.getTitle() == null || article.getTitle().isBlank()) {
            throw new RuntimeException("title 必填");
        }
        if (article.getUrl() == null || article.getUrl().isBlank()) {
            throw new RuntimeException("url 必填");
        }
        validateType(article.getType());

        article.setCreatedAt(LocalDateTime.now());
        if (article.getType() == null || article.getType().isBlank()) {
            article.setType("link");
        }
        articleMapper.insert(article);
        return article;
    }

    public Article updateArticle(Long id, Article article) {
        Article existing = articleMapper.selectById(id);
        if (existing == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "文章不存在");
        }

        if (article.getTitle() != null && article.getTitle().isBlank()) {
            throw new RuntimeException("title 不能为空字符串");
        }
        if (article.getUrl() != null && article.getUrl().isBlank()) {
            throw new RuntimeException("url 不能为空字符串");
        }
        validateType(article.getType());

        if (article.getBookmarkId() != null) existing.setBookmarkId(article.getBookmarkId());
        if (article.getTitle() != null) existing.setTitle(article.getTitle());
        if (article.getUrl() != null) existing.setUrl(article.getUrl());
        if (article.getDescription() != null) existing.setDescription(article.getDescription());
        if (article.getType() != null) existing.setType(article.getType());

        articleMapper.updateById(existing);
        return existing;
    }

    public void deleteArticle(Long id) {
        Article existing = articleMapper.selectById(id);
        if (existing == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "文章不存在");
        }
        articleMapper.deleteById(id);
    }

    public long getArticleCount() {
        return articleMapper.selectCount(null);
    }

    private void applySort(LambdaQueryWrapper<Article> wrapper, String sortField, String sortOrder) {
        boolean asc = "asc".equalsIgnoreCase(sortOrder) || "ascend".equalsIgnoreCase(sortOrder);
        String field = sortField == null ? "createdAt" : sortField;

        switch (field) {
            case "title" -> {
                if (asc) wrapper.orderByAsc(Article::getTitle);
                else wrapper.orderByDesc(Article::getTitle);
            }
            case "type" -> {
                if (asc) wrapper.orderByAsc(Article::getType);
                else wrapper.orderByDesc(Article::getType);
            }
            case "bookmarkId" -> {
                if (asc) wrapper.orderByAsc(Article::getBookmarkId);
                else wrapper.orderByDesc(Article::getBookmarkId);
            }
            default -> {
                if (asc) wrapper.orderByAsc(Article::getCreatedAt);
                else wrapper.orderByDesc(Article::getCreatedAt);
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

    private void validateType(String type) {
        if (type != null && !type.isBlank() && !ALLOWED_ARTICLE_TYPES.contains(type)) {
            throw new RuntimeException("type 仅支持 article/video/document/link");
        }
    }
}
