package com.zhilian.server.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("bookmark")
public class Bookmark {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private Long userId;
    
    private String title;
    
    private String url;
    
    private String description;
    
    private Long categoryId;
    
    private String favicon;
    
    private String thumbnail;
    
    private String source;
    
    private String tags;  // JSON 字符串存储
    
    private Boolean isPublic;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    @TableLogic
    private Integer deleted;
}
