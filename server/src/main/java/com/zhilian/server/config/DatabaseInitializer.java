package com.zhilian.server.config;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void init() {
        ensureColumn("app_user", "permissions",
                "ALTER TABLE app_user ADD COLUMN permissions TEXT DEFAULT NULL COMMENT '权限模块JSON'");
        ensureColumn("app_user", "nickname",
                "ALTER TABLE app_user ADD COLUMN nickname VARCHAR(100) DEFAULT NULL COMMENT '昵称/姓名' AFTER avatar");
        ensureColumn("app_user", "bio",
                "ALTER TABLE app_user ADD COLUMN bio VARCHAR(500) DEFAULT NULL COMMENT '个人简介' AFTER nickname");
    }

    private void ensureColumn(String table, String column, String alterSql) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
                Integer.class,
                table,
                column
        );
        if (count != null && count > 0) {
            return;
        }
        try {
            jdbcTemplate.execute(alterSql);
            System.out.println("[DatabaseInitializer] Added '" + column + "' column to " + table + " table");
        } catch (Exception ex) {
            System.err.println("[DatabaseInitializer] Failed to add " + column + " column: " + ex.getMessage());
        }
    }
}
