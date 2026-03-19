package com.zhilian.server.service;

import com.zhilian.server.entity.AiAnalysisLog;
import com.zhilian.server.mapper.AiAnalysisLogMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AiAnalysisLogService {

    private final AiAnalysisLogMapper logMapper;

    public AiAnalysisLogService(AiAnalysisLogMapper logMapper) {
        this.logMapper = logMapper;
    }

    public void log(Long userId, String analysisType, String source, String model,
                    Integer tokensUsed, Integer durationMs, boolean success, String errorMessage) {
        AiAnalysisLog log = new AiAnalysisLog();
        log.setUserId(userId);
        log.setAnalysisType(analysisType);
        log.setSource(source);
        log.setModel(model != null ? model : "unknown");
        log.setTokensUsed(tokensUsed != null ? tokensUsed : 0);
        log.setDurationMs(durationMs != null ? durationMs : 0);
        log.setSuccess(success ? 1 : 0);
        log.setErrorMessage(errorMessage);
        log.setCreatedAt(LocalDateTime.now());
        try {
            logMapper.insert(log);
        } catch (Exception e) {
            // 日志写入失败不影响主流程
        }
    }
}
