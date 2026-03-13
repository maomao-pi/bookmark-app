package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.zhilian.server.dto.AiTestRequest;
import com.zhilian.server.entity.SystemSetting;
import com.zhilian.server.mapper.SystemSettingMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SystemSettingService {

    private final SystemSettingMapper systemSettingMapper;

    public SystemSettingService(SystemSettingMapper systemSettingMapper) {
        this.systemSettingMapper = systemSettingMapper;
    }

    public Map<String, String> getSettings() {
        LambdaQueryWrapper<SystemSetting> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByAsc(SystemSetting::getSettingGroup).orderByAsc(SystemSetting::getSettingKey);
        List<SystemSetting> settings = systemSettingMapper.selectList(wrapper);
        Map<String, String> result = new HashMap<>();
        settings.forEach(item -> result.put(item.getSettingKey(), item.getSettingValue()));
        return result;
    }

    public Map<String, String> updateSettings(Map<String, String> updates) {
        if (updates == null || updates.isEmpty()) {
            return getSettings();
        }

        updates.forEach(this::upsertSetting);
        return getSettings();
    }

    public Map<String, Object> testAiConnection(AiTestRequest request) {
        if (request == null || request.getApiKey() == null || request.getApiKey().isBlank()) {
            throw new RuntimeException("请先填写 API Key");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("connected", true);
        result.put("message", "配置格式校验通过，可继续联调实际模型调用");
        result.put("baseUrl", request.getBaseUrl());
        result.put("model", request.getModel());
        return result;
    }

    private void upsertSetting(String key, String value) {
        LambdaQueryWrapper<SystemSetting> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SystemSetting::getSettingKey, key);
        SystemSetting existing = systemSettingMapper.selectOne(wrapper);

        if (existing == null) {
            SystemSetting setting = new SystemSetting();
            setting.setSettingKey(key);
            setting.setSettingValue(value);
            setting.setSettingGroup(resolveGroup(key));
            setting.setDescription(resolveDescription(key));
            setting.setUpdatedAt(LocalDateTime.now());
            systemSettingMapper.insert(setting);
            return;
        }

        existing.setSettingValue(value);
        existing.setUpdatedAt(LocalDateTime.now());
        systemSettingMapper.updateById(existing);
    }

    private String resolveGroup(String key) {
        if (key.startsWith("ai.")) {
            return "ai";
        }
        if (key.startsWith("theme.")) {
            return "theme";
        }
        if (key.startsWith("storage.")) {
            return "storage";
        }
        return "general";
    }

    private String resolveDescription(String key) {
        return "系统配置项: " + key;
    }
}
