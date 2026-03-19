package com.zhilian.server.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("ai_analysis_log")
public class AiAnalysisLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 触发用户ID（null 表示系统触发） */
    private Long userId;

    /** 分析类型：bookmark_analysis / organize_suggestion / category_recommend / tag_suggest */
    private String analysisType;

    /** 触发来源：user_action / system_auto */
    private String source;

    /** 输入摘要（不含敏感数据） */
    private String inputSummary;

    /** 使用的AI模型 */
    private String model;

    /** 消耗 Token 数 */
    private Integer tokensUsed;

    /** 耗时（毫秒） */
    private Integer durationMs;

    /** 是否成功：1-成功，0-失败 */
    private Integer success;

    private String errorMessage;

    private LocalDateTime createdAt;
}
