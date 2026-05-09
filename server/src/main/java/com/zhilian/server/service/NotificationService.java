package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhilian.server.entity.Notification;
import com.zhilian.server.mapper.NotificationMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationMapper notificationMapper;

    public NotificationService(NotificationMapper notificationMapper) {
        this.notificationMapper = notificationMapper;
    }

    /** 创建通知 */
    public Notification create(String type, String title, String content,
                               String targetType, Long targetId,
                               Long relatedUserId, String relatedUsername) {
        Notification notification = new Notification();
        notification.setType(type);
        notification.setTitle(title);
        notification.setContent(content);
        notification.setTargetType(targetType);
        notification.setTargetId(targetId);
        notification.setRelatedUserId(relatedUserId);
        notification.setRelatedUsername(relatedUsername);
        notification.setIsRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        notificationMapper.insert(notification);
        return notification;
    }

    /** 创建用户注册通知 */
    public void notifyUserRegister(Long userId, String username) {
        create(
            "user_register",
            "新用户注册",
            "用户「" + username + "」刚刚注册了账号",
            "user",
            userId,
            userId,
            username
        );
    }

    /** 创建新收藏通知 */
    public void notifyNewBookmark(Long bookmarkId, String title, Long userId, String username) {
        create(
            "new_bookmark",
            "新收藏上线",
            "用户「" + username + "」添加了新收藏：「" + title + "」",
            "bookmark",
            bookmarkId,
            userId,
            username
        );
    }

    /** 创建新内容通知 */
    public void notifyNewArticle(Long articleId, String title, Long userId, String username) {
        create(
            "new_article",
            "新内容添加",
            "用户「" + username + "」添加了新内容：「" + title + "」",
            "article",
            articleId,
            userId,
            username
        );
    }

    /** 创建系统告警通知 */
    public void notifySystemAlert(String title, String content) {
        create(
            "system_alert",
            title,
            content,
            null,
            null,
            null,
            null
        );
    }

    /** 分页查询最近通知 (默认按 createdAt desc) */
    public Page<Notification> getNotifications(int pageNum, int pageSize) {
        Page<Notification> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByDesc(Notification::getCreatedAt);
        return notificationMapper.selectPage(page, wrapper);
    }

    /** 查询未读通知数量 */
    public long getUnreadCount() {
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Notification::getIsRead, false);
        return notificationMapper.selectCount(wrapper);
    }

    /** 获取最近 N 条未读通知 */
    public List<Notification> getRecentUnread(int limit) {
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Notification::getIsRead, false)
               .orderByDesc(Notification::getCreatedAt)
               .last("LIMIT " + limit);
        return notificationMapper.selectList(wrapper);
    }

    /** 标记单条为已读 */
    public void markAsRead(Long id) {
        Notification notification = notificationMapper.selectById(id);
        if (notification != null) {
            notification.setIsRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationMapper.updateById(notification);
        }
    }

    /** 标记所有为已读 */
    public void markAllAsRead() {
        Notification notification = new Notification();
        notification.setIsRead(true);
        notification.setReadAt(LocalDateTime.now());
        notificationMapper.update(notification,
            new LambdaQueryWrapper<Notification>().eq(Notification::getIsRead, false));
    }
}
