package com.zhilian.server.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class SystemSettingsUpdateRequest {
    @NotNull(message = "settings 不能为空")
    private Map<String, String> settings;
}
