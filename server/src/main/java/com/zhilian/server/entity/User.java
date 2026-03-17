package com.zhilian.server.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("app_user")
public class User {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String username;
    
    private String email;
    
    private String password;
    
    private String avatar;
    
    private String nickname;

    private String bio;

    private String phone;

    private String role;  // admin, user
    
    private String status;  // active, disabled
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    private LocalDateTime lastLoginAt;

    private LocalDateTime deletePendingAt;

    @TableField(exist = false)
    private Long bookmarkCount;
    
    @TableLogic
    private Integer deleted;
}
