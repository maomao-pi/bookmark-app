package com.zhilian.server.controller;

import com.zhilian.server.dto.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/")
    public ApiResponse<Map<String, String>> root() {
        return ApiResponse.success(Map.of("service", "zhilian-server", "status", "running"));
    }

    @GetMapping("/api/health")
    public ApiResponse<Map<String, String>> health() {
        return ApiResponse.success(Map.of("service", "zhilian-server", "status", "running"));
    }
}
