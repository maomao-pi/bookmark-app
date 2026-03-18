package com.zhilian.server.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.dto.PageData;
import com.zhilian.server.entity.Admin;
import com.zhilian.server.entity.OperationLog;
import com.zhilian.server.service.OperationLogService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/logs")
@Validated
public class LogController {

    private final OperationLogService operationLogService;

    public LogController(OperationLogService operationLogService) {
        this.operationLogService = operationLogService;
    }

    @GetMapping
    public ApiResponse<PageData<OperationLog>> getLogs(
            @RequestParam(defaultValue = "1") @Min(value = 1, message = "pageNum 必须大于等于 1") int pageNum,
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "pageSize 必须大于等于 1") @Max(value = 100, message = "pageSize 不能超过 100") int pageSize,
            @RequestParam(required = false) @Positive(message = "adminId 必须大于 0") Long adminId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime endTime,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) @Pattern(regexp = "^(asc|desc|ascend|descend)$", message = "sortOrder 仅支持 asc/desc/ascend/descend") String sortOrder) {
        Page<OperationLog> page = operationLogService.getLogs(pageNum, pageSize, adminId, action, startTime, endTime, sortField, sortOrder);
        return ApiResponse.success(PageData.from(page));
    }

    @PostMapping("/{id}/revert")
    public ApiResponse<Void> revertLog(@PathVariable @Positive(message = "id 必须大于 0") Long id,
                                       Authentication authentication) {
        Admin admin = (Admin) authentication.getPrincipal();
        operationLogService.revertLog(id, admin.getId());
        return ApiResponse.success();
    }
}
