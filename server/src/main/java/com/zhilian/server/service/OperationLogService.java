package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.entity.OperationLog;
import com.zhilian.server.mapper.ArticleMapper;
import com.zhilian.server.mapper.AdminMapper;
import com.zhilian.server.mapper.OperationLogMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class OperationLogService {

    private final OperationLogMapper operationLogMapper;
    private final AdminMapper adminMapper;
    private final ArticleMapper articleMapper;
    private final ObjectMapper objectMapper;

    public OperationLogService(OperationLogMapper operationLogMapper, AdminMapper adminMapper, ArticleMapper articleMapper, ObjectMapper objectMapper) {
        this.operationLogMapper = operationLogMapper;
        this.adminMapper = adminMapper;
        this.articleMapper = articleMapper;
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
        log(adminId, action, target, targetId, ip, result, detail, false, null);
    }

    public void logRevocable(Long adminId, String action, String target, Long targetId, String ip, String result, Map<String, Object> detail) {
        log(adminId, action, target, targetId, ip, result, detail, true, null);
    }

    public void logRevert(Long adminId, String action, String target, Long targetId, String ip, String result, Map<String, Object> detail, Long revertParentId) {
        log(adminId, action, target, targetId, ip, result, detail, false, revertParentId);
    }

    private void log(Long adminId, String action, String target, Long targetId, String ip, String result, Map<String, Object> detail,
                     boolean revocable, Long revertParentId) {
        OperationLog log = new OperationLog();
        log.setAdminId(adminId);
        log.setAction(action);
        log.setTarget(target);
        log.setTargetId(targetId);
        log.setIp(ip);
        log.setResult(result);
        log.setRevocable(revocable ? 1 : 0);
        log.setReverted(0);
        log.setRevertParentId(revertParentId);
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
        Page<OperationLog> result = operationLogMapper.selectPage(page, wrapper);
        enrichLogRecords(result.getRecords());
        return result;
    }

    public void revertLog(Long logId, Long operatorAdminId) {
        OperationLog log = operationLogMapper.selectById(logId);
        if (log == null) {
            throw new RuntimeException("日志不存在");
        }
        if (log.getRevocable() == null || log.getRevocable() != 1) {
            throw new RuntimeException("该日志不支持撤回");
        }
        if (log.getReverted() != null && log.getReverted() == 1) {
            throw new RuntimeException("该日志已撤回");
        }
        if (log.getCreatedAt() == null || ChronoUnit.MINUTES.between(log.getCreatedAt(), LocalDateTime.now()) > 30) {
            throw new RuntimeException("已超过撤回时间窗口");
        }

        if ("DELETE_USER_CONTENT".equals(log.getAction()) || "DELETE_DISCOVER_CONTENT".equals(log.getAction())) {
            articleMapper.restoreDeletedById(log.getTargetId());
        } else {
            throw new RuntimeException("当前仅支持撤回删除内容操作");
        }

        log.setReverted(1);
        log.setRevertedAt(LocalDateTime.now());
        operationLogMapper.updateById(log);
        logRevert(operatorAdminId, "REVERT_OPERATION", log.getTarget(), log.getTargetId(), null, "success",
                Map.of("originalLogId", logId, "originalAction", log.getAction()), logId);
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

    private void enrichLogRecords(List<OperationLog> records) {
        if (records == null || records.isEmpty()) {
            return;
        }
        List<Long> adminIds = records.stream()
                .map(OperationLog::getAdminId)
                .filter(id -> id != null)
                .distinct()
                .collect(Collectors.toList());
        Map<Long, String> adminNames = adminIds.isEmpty()
                ? Map.of()
                : adminMapper.selectBatchIds(adminIds).stream()
                .collect(Collectors.toMap(Admin::getId, Admin::getUsername, (a, b) -> a));
        records.forEach(record -> {
            record.setOperatorName(adminNames.getOrDefault(record.getAdminId(), record.getAdminId() == null ? "系统" : "管理员(" + record.getAdminId() + ")"));
            record.setActionText(buildActionText(record));
        });
    }

    private String buildActionText(OperationLog record) {
        String base = switch (record.getAction()) {
            case "CREATE_USER" -> "创建用户";
            case "UPDATE_USER" -> "更新用户";
            case "DELETE_USER" -> "删除用户";
            case "CREATE_CATEGORY" -> "创建分类";
            case "UPDATE_CATEGORY" -> "更新分类";
            case "DELETE_CATEGORY" -> "删除分类";
            case "CREATE_USER_CONTENT" -> "创建用户内容";
            case "UPDATE_USER_CONTENT" -> "更新用户内容";
            case "DELETE_USER_CONTENT" -> "删除用户内容";
            case "CREATE_DISCOVER_CONTENT" -> "创建发现内容";
            case "UPDATE_DISCOVER_CONTENT" -> "更新发现内容";
            case "DELETE_DISCOVER_CONTENT" -> "删除发现内容";
            case "CREATE_DISCOVER" -> "创建发现收藏";
            case "UPDATE_DISCOVER" -> "更新发现收藏";
            case "DELETE_DISCOVER" -> "删除发现收藏";
            case "REVERT_OPERATION" -> "撤回操作";
            default -> record.getAction();
        };
        if (record.getTargetId() != null) {
            return base + " #" + record.getTargetId();
        }
        return base;
    }
}
