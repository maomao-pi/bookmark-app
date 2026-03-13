package com.zhilian.server.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiTestRequest {
    @NotBlank(message = "API Key 不能为空")
    private String apiKey;

    private String baseUrl;

    private String model;
}
