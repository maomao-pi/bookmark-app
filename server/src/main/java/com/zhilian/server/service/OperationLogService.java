package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.entity.OperationLog;
import com.zhilian.server.mapper.AdminMapper;
import com.zhilian.server.mapper.OperationLogMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class OperationLogService {

    private final OperationLogMapper operationLogMapper;
    private final AdminMapper adminMapper;
    private final ObjectMapper objectMapper;

    public OperationLogService(OperationLogMapper operationLogMapper, AdminMapper adminMapper, ObjectMapper objectMapper) {
        this.operationLogMapper = operationLogMapper;
        this.adminMapper = adminMapper;
        this.objectMapper = objectMapper;
    }

    public void log(Long adminId, String action, String target, Long targetId, String ip, String result) {
        log(adminId, action, target, targetId, ip, result, (Map<String, Object>) null);
    }

    public void log(Long adminId, String action, String target, Long targetId, String ip, String result, String detail) {
        Map<String, Object> detailMap = toStructuredDetail(detail);
        log(adminId, action, target, targetId, ip, result, detailMap);
    }

    public void log(Long adminId, String action, String target, Long targetId, String ip, String result, Map<String, Object> detail) {
        OperationLog log = new OperationLog();
        log.setAdminId(adminId);
        log.setAction(action);
        log.setTarget(target);
        log.setTargetId(targetId);
        log.setIp(ip);
        log.setResult(result);
        log.setDetail(toJson(detail));
        log.setCreatedAt(LocalDateTime.now());
        operationLogMapper.insert(log);
    }

    public void logByUsername(String username, String action, String target, Long targetId, String result, String detail) {
        LambdaQueryWrapper<Admin> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Admin::getUsername, username);
        Admin admin = adminMapper.selectOne(wrapper);
        Long adminId = admin == null ? null : admin.getId();
        log(adminId, action, target, targetId, null, result, detail);
    }

    public void logByUsername(String username, String action, String target, Long targetId, String result, Map<String, Object> detail) {
        LambdaQueryWrapper<Admin> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Admin::getUsername, username);
        Admin admin = adminMapper.selectOne(wrapper);
        Long adminId = admin == null ? null : admin.getId();
        log(adminId, action, target, targetId, null, result, detail);
    }

    public Page<OperationLog> getLogs(int pageNum, int pageSize, Long adminId, String action,
                                      LocalDateTime startTime, LocalDateTime endTime,
                                      String sortField, String sortOrder) {
        Page<OperationLog> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<OperationLog> wrapper = new LambdaQueryWrapper<>();
        if (adminId != null) {
            wrapper.eq(OperationLog::getAdminId, adminId);
        }
        if (action != null && !action.isBlank()) {
            wrapper.eq(OperationLog::getAction, action);
        }
        if (startTime != null) {
            wrapper.ge(OperationLog::getCreatedAt, startTime);
        }
        if (endTime != null) {
            wrapper.le(OperationLog::getCreatedAt, endTime);
        }
        applySort(wrapper, sortField, sortOrder);
        return operationLogMapper.selectPage(page, wrapper);
    }

    private void applySort(LambdaQueryWrapper<OperationLog> wrapper, String sortField, String sortOrder) {
        boolean asc = "asc".equalsIgnoreCase(sortOrder) || "ascend".equalsIgnoreCase(sortOrder);
        String field = sortField == null ? "createdAt" : sortField;

        switch (field) {
            case "adminId" -> {
                if (asc) wrapper.orderByAsc(OperationLog::getAdminId);
                else wrapper.orderByDesc(OperationLog::getAdminId);
            }
            case "action" -> {
                if (asc) wrapper.orderByAsc(OperationLog::getAction);
                else wrapper.orderByDesc(OperationLog::getAction);
            }
            default -> {
                if (asc) wrapper.orderByAsc(OperationLog::getCreatedAt);
                else wrapper.orderByDesc(OperationLog::getCreatedAt);
            }
        }
    }

    private String toJson(Map<String, Object> detail) {
        if (detail == null || detail.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(detail);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("日志 detail 序列化失败");
        }
    }

    private Map<String, Object> toStructuredDetail(String detail) {
        if (detail == null || detail.isBlank()) {
            return null;
        }

        String trimmed = detail.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
                return objectMapper.readValue(trimmed, Map.class);
            } catch (JsonProcessingException e) {
                Map<String, Object> fallback = new HashMap<>();
                fallback.put("message", detail);
                return fallback;
            }
        }

        if (trimmed.contains("=") && !trimmed.contains(" ")) {
            String[] kv = trimmed.split("=", 2);
            Map<String, Object> parsed = new HashMap<>();
            parsed.put(kv[0], kv.length > 1 ? kv[1] : "");
            return parsed;
        }

        Map<String, Object> wrapped = new HashMap<>();
        wrapped.put("message", detail);
        return wrapped;
    }
}
