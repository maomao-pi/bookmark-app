package com.zhilian.server.controller;

import com.zhilian.server.dto.ApiResponse;
import com.zhilian.server.dto.PageData;
import com.zhilian.server.entity.Notification;
import com.zhilian.server.service.NotificationService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/notifications")
@Validated
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /** 获取通知列表 (分页) */
    @GetMapping
    public ApiResponse<PageData<Notification>> getNotifications(
            @RequestParam(defaultValue = "1") @Min(1) int pageNum,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int pageSize) {
        return ApiResponse.success(PageData.from(notificationService.getNotifications(pageNum, pageSize)));
    }

    /** 获取未读数量 */
    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> getUnreadCount() {
        Map<String, Long> result = new HashMap<>();
        result.put("count", notificationService.getUnreadCount());
        return ApiResponse.success(result);
    }

    /** 获取最近未读通知 (用于面板展示) */
    @GetMapping("/recent")
    public ApiResponse<List<Notification>> getRecentUnread(
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.success(notificationService.getRecentUnread(Math.min(limit, 20)));
    }

    /** 标记单条已读 */
    @PutMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ApiResponse.success();
    }

    /** 标记全部已读 */
    @PutMapping("/read-all")
    public ApiResponse<Void> markAllAsRead() {
        notificationService.markAllAsRead();
        return ApiResponse.success();
    }
}
