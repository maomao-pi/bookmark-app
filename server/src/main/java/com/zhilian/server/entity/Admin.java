package com.zhilian.server.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("admin")
public class Admin {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String username;
    
    private String password;
    
    private String avatar;
    
    private String role;  // super_admin, admin
    
    private String status;  // active, disabled
    
    private String permissions;  // JSON array of allowed modules
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    private LocalDateTime lastLoginAt;
    
    @TableLogic
    private Integer deleted;
}
