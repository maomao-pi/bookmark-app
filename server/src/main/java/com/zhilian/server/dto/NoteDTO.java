package com.zhilian.server.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDateTime;

public class NoteDTO {

    /** 创建/更新笔记的请求体 */
    @Data
    public static class Request {
        @NotBlank(message = "笔记内容不能为空")
        private String content;
    }

    /** 返回给前端的笔记响应体 */
    @Data
    public static class Response {
        private Long id;
        private Long bookmarkId;
        private String content;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
