package com.zhilian.server.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("category")
public class Category {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String name;
    
    private String icon;
    
    private Long parentId;
    
    private String type;  // user, discover
    
    private Integer sort;
    
    private String status;  // visible, hidden
    
    private LocalDateTime createdAt;
    
    @TableLogic
    private Integer deleted;
}
