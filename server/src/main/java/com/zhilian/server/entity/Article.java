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
    
    private LocalDateTime createdAt;
    
    @TableLogic
    private Integer deleted;
}
