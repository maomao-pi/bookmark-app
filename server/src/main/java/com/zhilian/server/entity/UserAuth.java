package com.zhilian.server.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("user_auth")
public class UserAuth {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    /** 认证类型：phone / email / wechat / qq */
    private String authType;

    /** 认证标识：手机号 / 邮箱地址 / 第三方 openid */
    private String authKey;

    /** 附加信息（JSON字符串，存储 OAuth token 等） */
    private String authExtra;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}
