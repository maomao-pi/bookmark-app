package com.zhilian.server.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.entity.AiAnalysisLog;
import com.zhilian.server.mapper.AiAnalysisLogMapper;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/ai")
public class AiLogController {

    private final AiAnalysisLogMapper logMapper;

    public AiLogController(AiAnalysisLogMapper logMapper) {
        this.logMapper = logMapper;
    }

    @GetMapping("/logs")
    public ApiResponse<Map<String, Object>> getLogs(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String analysisType) {

        LambdaQueryWrapper<AiAnalysisLog> wrapper = new LambdaQueryWrapper<>();
        if (userId != null) wrapper.eq(AiAnalysisLog::getUserId, userId);
        if (analysisType != null && !analysisType.isBlank()) wrapper.eq(AiAnalysisLog::getAnalysisType, analysisType);
        wrapper.orderByDesc(AiAnalysisLog::getCreatedAt);

        Page<AiAnalysisLog> page = new Page<>(pageNum, pageSize);
        logMapper.selectPage(page, wrapper);

        Map<String, Object> result = new HashMap<>();
        result.put("records", page.getRecords());
        result.put("total", page.getTotal());
        result.put("pageNum", pageNum);
        result.put("pageSize", pageSize);
        return ApiResponse.success(result);
    }
}
