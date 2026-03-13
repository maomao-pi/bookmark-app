package com.zhilian.server.controller;

import com.zhilian.server.dto.AiTestRequest;
import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.dto.SystemSettingsUpdateRequest;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.service.OperationLogService;
import com.zhilian.server.service.SystemSettingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/settings")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SettingController {

    private final SystemSettingService systemSettingService;
    private final OperationLogService operationLogService;

    public SettingController(SystemSettingService systemSettingService, OperationLogService operationLogService) {
        this.systemSettingService = systemSettingService;
        this.operationLogService = operationLogService;
    }

    @GetMapping
    public ApiResponse<Map<String, String>> getSettings() {
        return ApiResponse.success(systemSettingService.getSettings());
    }

    @PutMapping
    public ApiResponse<Map<String, String>> updateSettings(@Valid @RequestBody SystemSettingsUpdateRequest request,
                                                           Authentication authentication,
                                                           HttpServletRequest httpRequest) {
        Map<String, String> updated = systemSettingService.updateSettings(request.getSettings());
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "UPDATE_SETTINGS", "system_setting", null, httpRequest.getRemoteAddr(), "success",
                Map.of("size", request.getSettings().size()));
        return ApiResponse.success(updated);
    }

    @PostMapping("/ai-test")
    public ApiResponse<Map<String, Object>> testAiConnection(@Valid @RequestBody AiTestRequest request,
                                                              Authentication authentication,
                                                              HttpServletRequest httpRequest) {
        Map<String, Object> result = systemSettingService.testAiConnection(request);
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.log(admin.getId(), "TEST_AI_CONNECTION", "system_setting", null, httpRequest.getRemoteAddr(), "success",
                Map.of("connected", result.getOrDefault("connected", false)));
        return ApiResponse.success(result);
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
}
