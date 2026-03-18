package com.zhilian.server.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("verification_code")
public class VerificationCode {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 手机号或邮箱 */
    private String target;

    /** 6位数字验证码 */
    private String code;

    /** 用途：login / register / bind / change_password */
    private String purpose;

    /** 过期时间（5分钟后） */
    private LocalDateTime expiresAt;

    /** 是否已使用：0-未使用，1-已使用 */
    private Integer used;

    private LocalDateTime createdAt;
}
