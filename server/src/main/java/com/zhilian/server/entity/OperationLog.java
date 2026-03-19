package com.zhilian.server.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("operation_log")
public class OperationLog {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private Long adminId;
    
    private String action;
    
    private String target;
    
    private Long targetId;
    
    private String detail;  // JSON 字符串
    
    private String ip;
    
    private String result;  // success, failed

    private Integer revocable;

    private Integer reverted;

    private Long revertParentId;

    private LocalDateTime revertedAt;
    
    private LocalDateTime createdAt;

    @TableField(exist = false)
    private String operatorName;

    @TableField(exist = false)
    private String actionText;
}
