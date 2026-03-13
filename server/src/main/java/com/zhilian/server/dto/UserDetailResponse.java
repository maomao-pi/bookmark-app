package com.zhilian.server.dto;

import com.zhilian.server.entity.Bookmark;
import com.zhilian.server.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
public class UserDetailResponse {

    private User user;
    private Long bookmarkCount;
    private Map<String, Long> categoryDistribution;
    private List<Bookmark> recentBookmarks;
}
