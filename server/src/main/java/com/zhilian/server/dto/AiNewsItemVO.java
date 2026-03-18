package com.zhilian.server.dto;

/**
 * AI 推荐咨讯条目 VO（前端展示用）
 */
public class AiNewsItemVO {

    /** 唯一标识（URL 的 hashCode 字符串） */
    private String id;

    /** 文章标题 */
    private String title;

    /** 文章链接 */
    private String url;

    /** 一句话摘要（100字以内） */
    private String summary;

    /** 来源网站名称（可为空） */
    private String source;

    public AiNewsItemVO() {}

    public AiNewsItemVO(String id, String title, String url, String summary, String source) {
        this.id = id;
        this.title = title;
        this.url = url;
        this.summary = summary;
        this.source = source;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
