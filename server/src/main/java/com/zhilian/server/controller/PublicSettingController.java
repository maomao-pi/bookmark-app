package com.zhilian.server.controller;

import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.service.SystemSettingService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class PublicSettingController {

    private final SystemSettingService systemSettingService;

    public PublicSettingController(SystemSettingService systemSettingService) {
        this.systemSettingService = systemSettingService;
    }

    @GetMapping("/ai")
    public ApiResponse<Map<String, String>> getAiSettings() {
        Map<String, String> allSettings = systemSettingService.getSettings();
        Map<String, String> aiSettings = new HashMap<>();
        for (Map.Entry<String, String> entry : allSettings.entrySet()) {
            if (entry.getKey().startsWith("ai.")) {
                aiSettings.put(entry.getKey(), entry.getValue());
            }
        }
        return ApiResponse.success(aiSettings);
    }

    @GetMapping("/theme")
    public ApiResponse<Map<String, String>> getThemeSettings() {
        Map<String, String> allSettings = systemSettingService.getSettings();
        Map<String, String> themeSettings = new HashMap<>();
        for (Map.Entry<String, String> entry : allSettings.entrySet()) {
            if (entry.getKey().startsWith("theme.")) {
                themeSettings.put(entry.getKey(), entry.getValue());
            }
        }
        return ApiResponse.success(themeSettings);
    }
}
