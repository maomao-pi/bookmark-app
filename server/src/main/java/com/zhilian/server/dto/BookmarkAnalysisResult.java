package com.zhilian.server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookmarkAnalysisResult {

    private String summary;

    private List<String> keyPoints;

    private List<String> suggestedTags;

    private String categoryMatch;

    private List<String> riskNotes;

    private List<String> nextActions;

    private List<RecommendedRead> recommendedReads;

    private Boolean degraded;

    private String degradeReason;

    private LocalDateTime generatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendedRead {
        private String title;
        private String url;
        private String reason;
    }
}