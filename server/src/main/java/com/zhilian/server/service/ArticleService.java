package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.common.ErrorCode;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.entity.Article;
import com.zhilian.server.entity.Bookmark;
import com.zhilian.server.entity.DiscoverBookmark;
import com.zhilian.server.entity.User;
import com.zhilian.server.exception.BizException;
import com.zhilian.server.mapper.AdminMapper;
import com.zhilian.server.mapper.ArticleMapper;
import com.zhilian.server.mapper.BookmarkMapper;
import com.zhilian.server.mapper.DiscoverBookmarkMapper;
import com.zhilian.server.mapper.UserMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;
import java.util.stream.Collectors;

@Service
public class ArticleService {

    private static final Set<String> ALLOWED_ARTICLE_TYPES = new HashSet<>(List.of("article", "video", "document", "link"));

    private final ArticleMapper articleMapper;
    private final BookmarkMapper bookmarkMapper;
    private final DiscoverBookmarkMapper discoverBookmarkMapper;
    private final UserMapper userMapper;
    private final AdminMapper adminMapper;

    public ArticleService(ArticleMapper articleMapper, BookmarkMapper bookmarkMapper,
                          DiscoverBookmarkMapper discoverBookmarkMapper, UserMapper userMapper,
                          AdminMapper adminMapper) {
        this.articleMapper = articleMapper;
        this.bookmarkMapper = bookmarkMapper;
        this.discoverBookmarkMapper = discoverBookmarkMapper;
        this.userMapper = userMapper;
        this.adminMapper = adminMapper;
    }

    public Page<Article> getArticleList(int pageNum, int pageSize, String keyword, Long bookmarkId, String type,
                                        String sortField, String sortOrder) {
        Page<Article> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Article> wrapper = buildListWrapper(keyword, bookmarkId, type, sortField, sortOrder);

        return articleMapper.selectPage(page, wrapper);
    }

    public Page<Article> getUserContentList(int pageNum, int pageSize, String keyword, Long bookmarkId, String type,
                                           Long userId, String creatorKeyword, String sortField, String sortOrder) {
        Page<Article> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Article> wrapper = buildUserContentWrapper(keyword, bookmarkId, type, userId, creatorKeyword, sortField, sortOrder);
        Page<Article> result = articleMapper.selectPage(page, wrapper);
        enrichArticleRecords(result.getRecords());
        return result;
    }

    public Page<Article> getDiscoverContentList(int pageNum, int pageSize, String keyword, Long discoverBookmarkId, String type,
                                               String creatorKeyword, String sortField, String sortOrder) {
        Page<Article> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Article> wrapper = buildDiscoverContentWrapper(keyword, discoverBookmarkId, type, creatorKeyword, sortField, sortOrder);
        Page<Article> result = articleMapper.selectPage(page, wrapper);
        enrichArticleRecords(result.getRecords());
        return result;
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
        LambdaQueryWrapper<Article> wrapper = buildUserContentWrapper(keyword, bookmarkId, type, userId, null, sortField, sortOrder);
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
        LambdaQueryWrapper<Article> wrapper = buildDiscoverContentWrapper(keyword, discoverBookmarkId, type, null, sortField, sortOrder);
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

    private LambdaQueryWrapper<Article> buildUserContentWrapper(String keyword, Long bookmarkId, String type, Long userId, String creatorKeyword,
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
        applyUserContentCreatorFilter(wrapper, userId, creatorKeyword);
        wrapper.orderByDesc(Article::getPinned);
        applySort(wrapper, sortField, sortOrder);
        return wrapper;
    }

    private LambdaQueryWrapper<Article> buildDiscoverContentWrapper(String keyword, Long discoverBookmarkId, String type, String creatorKeyword,
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
        applyDiscoverContentCreatorFilter(wrapper, creatorKeyword);
        wrapper.orderByDesc(Article::getPinned);
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
        wrapper.orderByDesc(Article::getPinned).orderByDesc(Article::getCreatedAt);
        return articleMapper.selectList(wrapper);
    }

    public Article createArticle(Article article) {
        boolean hasBookmark = article.getBookmarkId() != null && article.getBookmarkId() > 0;
        boolean hasDiscoverBookmark = article.getDiscoverBookmarkId() != null && article.getDiscoverBookmarkId() > 0;
        if (!hasBookmark && !hasDiscoverBookmark) {
            throw new RuntimeException("bookmarkId 或 discoverBookmarkId 必填且必须大于 0");
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
        if (article.getPinned() == null) {
            article.setPinned(0);
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
        if (article.getPinned() != null) existing.setPinned(article.getPinned());

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

    public int restoreDeletedArticle(Long id) {
        return articleMapper.restoreDeletedById(id);
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

    private void applyUserContentCreatorFilter(LambdaQueryWrapper<Article> wrapper, Long userId, String creatorKeyword) {
        Set<Long> userIds = new HashSet<>();
        if (userId != null) {
            userIds.add(userId);
        }
        if (creatorKeyword != null && !creatorKeyword.isBlank()) {
            userIds.addAll(userMapper.selectList(new LambdaQueryWrapper<User>()
                            .and(w -> w.like(User::getUsername, creatorKeyword).or().like(User::getNickname, creatorKeyword)))
                    .stream()
                    .map(User::getId)
                    .collect(Collectors.toSet()));
        }
        if (!userIds.isEmpty()) {
            List<Long> bookmarkIds = bookmarkMapper.selectList(new LambdaQueryWrapper<Bookmark>()
                            .in(Bookmark::getUserId, userIds)
                            .select(Bookmark::getId))
                    .stream()
                    .map(Bookmark::getId)
                    .toList();
            if (bookmarkIds.isEmpty()) {
                wrapper.eq(Article::getId, -1L);
            } else {
                wrapper.in(Article::getBookmarkId, bookmarkIds);
            }
        }
    }

    private void applyDiscoverContentCreatorFilter(LambdaQueryWrapper<Article> wrapper, String creatorKeyword) {
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
        LambdaQueryWrapper<DiscoverBookmark> discoverWrapper = new LambdaQueryWrapper<>();
        if (userIds.isEmpty() && adminIds.isEmpty()) {
            wrapper.eq(Article::getId, -1L);
            return;
        }
        discoverWrapper.and(w -> {
            boolean appended = false;
            if (!userIds.isEmpty()) {
                w.and(x -> x.eq(DiscoverBookmark::getCreatedByType, "user").in(DiscoverBookmark::getCreatedById, userIds));
                appended = true;
            }
            if (!adminIds.isEmpty()) {
                if (appended) {
                    w.or();
                }
                w.and(x -> x.eq(DiscoverBookmark::getCreatedByType, "admin").in(DiscoverBookmark::getCreatedById, adminIds));
            }
        });
        List<Long> discoverIds = discoverBookmarkMapper.selectList(discoverWrapper)
                .stream()
                .map(DiscoverBookmark::getId)
                .toList();
        if (discoverIds.isEmpty()) {
            wrapper.eq(Article::getId, -1L);
        } else {
            wrapper.in(Article::getDiscoverBookmarkId, discoverIds);
        }
    }

    private void enrichArticleRecords(List<Article> records) {
        if (records == null || records.isEmpty()) {
            return;
        }
        Map<Long, Bookmark> bookmarkMap = bookmarkMapper.selectList(new LambdaQueryWrapper<Bookmark>()
                        .select(Bookmark::getId, Bookmark::getUserId))
                .stream()
                .collect(Collectors.toMap(Bookmark::getId, bookmark -> bookmark, (a, b) -> a));
        Map<Long, DiscoverBookmark> discoverMap = discoverBookmarkMapper.selectList(new LambdaQueryWrapper<DiscoverBookmark>()
                        .select(DiscoverBookmark::getId, DiscoverBookmark::getCreatedById, DiscoverBookmark::getCreatedByType))
                .stream()
                .collect(Collectors.toMap(DiscoverBookmark::getId, bookmark -> bookmark, (a, b) -> a));
        Map<Long, String> userNames = userMapper.selectList(new LambdaQueryWrapper<User>().select(User::getId, User::getUsername))
                .stream()
                .collect(Collectors.toMap(User::getId, User::getUsername, (a, b) -> a));
        Map<Long, String> adminNames = adminMapper.selectList(new LambdaQueryWrapper<Admin>().select(Admin::getId, Admin::getUsername))
                .stream()
                .collect(Collectors.toMap(Admin::getId, Admin::getUsername, (a, b) -> a));

        for (Article record : records) {
            if (record.getBookmarkId() != null) {
                Bookmark bookmark = bookmarkMap.get(record.getBookmarkId());
                record.setSourceType("user");
                record.setCreatedByName(bookmark == null ? "-" : userNames.getOrDefault(bookmark.getUserId(), "用户(" + bookmark.getUserId() + ")"));
            } else if (record.getDiscoverBookmarkId() != null) {
                DiscoverBookmark discover = discoverMap.get(record.getDiscoverBookmarkId());
                record.setSourceType("discover");
                if (discover == null) {
                    record.setCreatedByName("-");
                } else if ("admin".equalsIgnoreCase(discover.getCreatedByType())) {
                    record.setCreatedByName(adminNames.getOrDefault(discover.getCreatedById(), "管理员(" + discover.getCreatedById() + ")"));
                } else {
                    record.setCreatedByName(userNames.getOrDefault(discover.getCreatedById(), "用户(" + discover.getCreatedById() + ")"));
                }
            }
        }
    }
}
