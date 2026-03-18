package com.zhilian.server.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("ai_organize_suggestion")
public class AiOrganizeSuggestion {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    /** 建议类型：uncategorized / tag_merge / stale_content / general */
    private String suggestionType;

    /** 建议内容（JSON 字符串） */
    private String content;

    /** 涉及收藏ID列表（JSON 数组字符串） */
    private String bookmarkIds;

    /** 状态：unread / applied / ignored */
    private String status;

    /** AI 原始分析结果（JSON 字符串） */
    private String aiAnalysis;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}
