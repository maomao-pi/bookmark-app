package com.zhilian.server.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("notification")
public class Notification {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 通知类型: user_register, new_bookmark, new_article, system_alert */
    private String type;

    /** 通知标题 */
    private String title;

    /** 通知内容 */
    private String content;

    /** 关联目标类型: user, bookmark, article, discover, null */
    private String targetType;

    /** 关联目标ID */
    private Long targetId;

    /** 关联用户ID (谁触发了这个事件, 可为空) */
    private Long relatedUserId;

    /** 关联用户名 */
    private String relatedUsername;

    /** 是否已读 */
    private Boolean isRead;

    /** 阅读时间 */
    private LocalDateTime readAt;

    /** 创建时间 */
    private LocalDateTime createdAt;
}
