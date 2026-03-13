package com.zhilian.server.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminProfileUpdateRequest {
    @Size(max = 50, message = "用户名长度不能超过 50")
    private String username;

    @Size(max = 500, message = "头像地址长度不能超过 500")
    private String avatar;
}
