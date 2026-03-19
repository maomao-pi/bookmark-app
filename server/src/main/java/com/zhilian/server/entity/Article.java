package com.zhilian.server.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("article")
public class Article {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private Long bookmarkId;
    
    private Long discoverBookmarkId;
    
    private String title;
    
    private String url;
    
    private String description;
    
    private String type;  // article, video, document, link

    private Integer pinned;  // 0-否, 1-是
    
    private LocalDateTime createdAt;

    @TableField(exist = false)
    private String createdByName;

    @TableField(exist = false)
    private String sourceType;
    
    @TableLogic
    private Integer deleted;
}
