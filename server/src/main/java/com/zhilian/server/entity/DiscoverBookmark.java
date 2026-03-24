package com.zhilian.server.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("discover_bookmark")
public class DiscoverBookmark {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private Long categoryId;
    
    private String title;
    
    private String url;
    
    private String description;
    
    private String favicon;
    
    private String thumbnail;
    
    private String source;
    
    private String tags;  // JSON 字符串
    
    private Integer sort;
    
    private String status;  // visible, hidden
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    @TableLogic
    private Integer deleted;
}
