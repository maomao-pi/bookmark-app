-- 知链方舟数据库初始化脚本 (MySQL版本)

-- 管理员表
CREATE TABLE IF NOT EXISTS admin (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码',
    avatar VARCHAR(500) DEFAULT NULL COMMENT '头像',
    role VARCHAR(20) DEFAULT 'admin' COMMENT '角色: super_admin, admin',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active, disabled',
    permissions TEXT DEFAULT NULL COMMENT '权限模块JSON数组',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_login_at DATETIME DEFAULT NULL COMMENT '最后登录时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- 用户表
CREATE TABLE IF NOT EXISTS app_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    password VARCHAR(255) NOT NULL COMMENT '密码',
    avatar VARCHAR(500) DEFAULT NULL COMMENT '头像',
    nickname VARCHAR(20) DEFAULT NULL COMMENT '昵称',
    bio VARCHAR(200) DEFAULT NULL COMMENT '个人简介',
    phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    role VARCHAR(20) DEFAULT 'user' COMMENT '角色: admin, user',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active, disabled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_login_at DATETIME DEFAULT NULL COMMENT '最后登录时间',
    delete_pending_at DATETIME DEFAULT NULL COMMENT '注销申请时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 分类表
CREATE TABLE IF NOT EXISTS category (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL COMMENT '分类名称',
    icon VARCHAR(500) DEFAULT NULL COMMENT '图标',
    parent_id BIGINT DEFAULT NULL COMMENT '父分类ID',
    type VARCHAR(20) DEFAULT 'user' COMMENT '类型: user-用户分类, discover-发现分类',
    created_by_id BIGINT DEFAULT NULL COMMENT '创建者ID',
    created_by_type VARCHAR(20) DEFAULT NULL COMMENT '创建者类型: user/admin',
    sort INT DEFAULT 0 COMMENT '排序',
    status VARCHAR(20) DEFAULT 'visible' COMMENT '状态: visible-显示, hidden-隐藏',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分类表';

ALTER TABLE category ADD COLUMN IF NOT EXISTS created_by_id BIGINT DEFAULT NULL COMMENT '创建者ID';
ALTER TABLE category ADD COLUMN IF NOT EXISTS created_by_type VARCHAR(20) DEFAULT NULL COMMENT '创建者类型: user/admin';

-- 收藏表
CREATE TABLE IF NOT EXISTS bookmark (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    title VARCHAR(200) NOT NULL COMMENT '标题',
    url VARCHAR(2000) NOT NULL COMMENT '网址',
    description TEXT DEFAULT NULL COMMENT '描述',
    category_id BIGINT DEFAULT NULL COMMENT '分类ID',
    favicon VARCHAR(500) DEFAULT NULL COMMENT '网站图标',
    thumbnail VARCHAR(500) DEFAULT NULL COMMENT '缩略图',
    source VARCHAR(200) DEFAULT NULL COMMENT '来源',
    tags JSON DEFAULT NULL COMMENT '标签(JSON数组)',
    is_public TINYINT DEFAULT 1 COMMENT '是否公开: 0-私有, 1-公开',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    INDEX idx_user_id (user_id),
    INDEX idx_category_id (category_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收藏表';

-- 文章表（用户内容用 bookmark_id，发现内容用 discover_bookmark_id，二者其一必填）
CREATE TABLE IF NOT EXISTS article (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bookmark_id BIGINT NULL COMMENT '收藏ID',
    discover_bookmark_id BIGINT NULL COMMENT '发现收藏ID',
    title VARCHAR(200) NOT NULL COMMENT '标题',
    url VARCHAR(2000) NOT NULL COMMENT '网址',
    description TEXT DEFAULT NULL COMMENT '描述',
    type VARCHAR(20) DEFAULT 'link' COMMENT '类型: article-文章, video-视频, document-文档, link-链接',
    pinned TINYINT DEFAULT 0 COMMENT '是否置顶: 0-否, 1-是',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    INDEX idx_bookmark_id (bookmark_id),
    INDEX idx_discover_bookmark_id (discover_bookmark_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章表';

-- 迁移：为已有 article 表增加 pinned 字段（新部署时 CREATE TABLE 已含此列，可跳过）
ALTER TABLE article ADD COLUMN IF NOT EXISTS pinned TINYINT DEFAULT 0 COMMENT '是否置顶: 0-否, 1-是';
-- 迁移：支持发现内容（旧表无 discover_bookmark_id 时取消下行注释执行；bookmark_id 改为可空）
-- ALTER TABLE article ADD COLUMN discover_bookmark_id BIGINT DEFAULT NULL COMMENT '发现收藏ID';
ALTER TABLE article MODIFY COLUMN bookmark_id BIGINT NULL COMMENT '收藏ID';

-- 发现内容表
CREATE TABLE IF NOT EXISTS discover_bookmark (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT NOT NULL COMMENT '分类ID',
    title VARCHAR(200) NOT NULL COMMENT '标题',
    url VARCHAR(2000) NOT NULL COMMENT '网址',
    description TEXT DEFAULT NULL COMMENT '描述',
    favicon VARCHAR(500) DEFAULT NULL COMMENT '网站图标',
    thumbnail VARCHAR(500) DEFAULT NULL COMMENT '缩略图',
    source VARCHAR(200) DEFAULT NULL COMMENT '来源',
    tags JSON DEFAULT NULL COMMENT '标签(JSON数组)',
    sort INT DEFAULT 0 COMMENT '排序',
    status VARCHAR(20) DEFAULT 'visible' COMMENT '状态: visible-显示, hidden-隐藏',
    created_by_id BIGINT DEFAULT NULL COMMENT '创建者ID',
    created_by_type VARCHAR(20) DEFAULT NULL COMMENT '创建者类型: user/admin',
    pinned TINYINT DEFAULT 0 COMMENT '是否置顶: 0-否, 1-是',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    INDEX idx_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发现内容表';

-- 迁移：为已有 discover_bookmark 表增加 pinned 字段（新部署时 CREATE TABLE 已含此列，可跳过）
ALTER TABLE discover_bookmark ADD COLUMN IF NOT EXISTS pinned TINYINT DEFAULT 0 COMMENT '是否置顶: 0-否, 1-是';
ALTER TABLE discover_bookmark ADD COLUMN IF NOT EXISTS created_by_id BIGINT DEFAULT NULL COMMENT '创建者ID';
ALTER TABLE discover_bookmark ADD COLUMN IF NOT EXISTS created_by_type VARCHAR(20) DEFAULT NULL COMMENT '创建者类型: user/admin';

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT NOT NULL COMMENT '管理员ID',
    action VARCHAR(50) NOT NULL COMMENT '操作类型',
    target VARCHAR(50) DEFAULT NULL COMMENT '操作对象',
    target_id BIGINT DEFAULT NULL COMMENT '操作对象ID',
    detail JSON DEFAULT NULL COMMENT '详细信息',
    ip VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
    result VARCHAR(20) DEFAULT 'success' COMMENT '结果: success, failed',
    revocable TINYINT DEFAULT 0 COMMENT '是否可撤回',
    reverted TINYINT DEFAULT 0 COMMENT '是否已撤回',
    revert_parent_id BIGINT DEFAULT NULL COMMENT '对应原始日志ID',
    reverted_at DATETIME DEFAULT NULL COMMENT '撤回时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_admin_id (admin_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

ALTER TABLE operation_log ADD COLUMN IF NOT EXISTS revocable TINYINT DEFAULT 0 COMMENT '是否可撤回';
ALTER TABLE operation_log ADD COLUMN IF NOT EXISTS reverted TINYINT DEFAULT 0 COMMENT '是否已撤回';
ALTER TABLE operation_log ADD COLUMN IF NOT EXISTS revert_parent_id BIGINT DEFAULT NULL COMMENT '对应原始日志ID';
ALTER TABLE operation_log ADD COLUMN IF NOT EXISTS reverted_at DATETIME DEFAULT NULL COMMENT '撤回时间';

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_setting (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    setting_value TEXT DEFAULT NULL COMMENT '配置值',
    setting_group VARCHAR(50) DEFAULT 'general' COMMENT '配置分组',
    description VARCHAR(255) DEFAULT NULL COMMENT '配置说明',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 插入默认超级管理员 (密码: admin123)
INSERT INTO admin (username, password, role, status, avatar) 
VALUES ('admin', '$2a$10$Ax4GYpe/ctRolCwZ7PBXM.4whnKGOFWrkcgraIKJHuaU3PY8MEB.q', 'super_admin', 'active', NULL)
ON DUPLICATE KEY UPDATE username=username;

-- 插入默认用户分类
INSERT INTO category (name, type, sort, status) VALUES 
('笔记', 'user', 1, 'visible'),
('学习', 'user', 2, 'visible'),
('工具', 'user', 3, 'visible')
ON DUPLICATE KEY UPDATE name=name;

-- 插入发现分类
INSERT INTO category (name, type, sort, status) VALUES 
('技术博客', 'discover', 1, 'visible'),
('开发工具', 'discover', 2, 'visible'),
('文档', 'discover', 3, 'visible'),
('设计资源', 'discover', 4, 'visible')
ON DUPLICATE KEY UPDATE name=name;

-- 插入默认系统配置
INSERT INTO system_setting (setting_key, setting_value, setting_group, description) VALUES
('ai.enabled', 'true', 'ai', 'AI 功能开关'),
('ai.autoExtract', 'true', 'ai', '自动提取元数据'),
('ai.autoGenerateDescription', 'false', 'ai', '自动生成描述'),
('ai.timeout', '15000', 'ai', 'AI 请求超时时间(ms)'),
('ai.cacheHours', '24', 'ai', 'AI 缓存时长(小时)'),
('ai.apiKey', '', 'ai', 'AI API密钥'),
('ai.baseUrl', 'https://open.bigmodel.cn/api/paas/v4', 'ai', 'AI服务地址'),
('ai.model', 'glm-4', 'ai', 'AI模型名称'),
('theme.defaultMode', 'light', 'theme', '默认主题'),
('theme.allowUserSwitch', 'true', 'theme', '允许用户切换主题'),
('storage.strategy', 'mysql', 'storage', '存储策略')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- 用户笔记表
CREATE TABLE IF NOT EXISTS note (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bookmark_id BIGINT NOT NULL COMMENT '关联收藏ID',
    user_id BIGINT NOT NULL COMMENT '所属用户ID',
    content TEXT NOT NULL COMMENT '笔记内容',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted INT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=删除',
    INDEX idx_bookmark_user (bookmark_id, user_id),
    INDEX idx_note_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户笔记表';

-- T003: app_user 表扩展（手机号/昵称/简介/注销冷静期）
-- 对已存在的数据库执行以下迁移（新部署时 CREATE TABLE 已包含这些列，可跳过）：
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL COMMENT '手机号';
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS nickname VARCHAR(20) DEFAULT NULL COMMENT '昵称';
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS bio VARCHAR(200) DEFAULT NULL COMMENT '个人简介';
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS delete_pending_at DATETIME DEFAULT NULL COMMENT '注销申请时间';

-- T004: 用户多认证方式表
CREATE TABLE IF NOT EXISTS user_auth (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '关联用户ID',
    auth_type VARCHAR(20) NOT NULL COMMENT '认证类型: phone/email/wechat/qq',
    auth_key VARCHAR(200) NOT NULL COMMENT '认证标识（手机号/邮箱/openid）',
    auth_extra TEXT DEFAULT NULL COMMENT '附加信息（JSON）',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE INDEX idx_type_key (auth_type, auth_key),
    INDEX idx_user_auth (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户多认证方式表';

-- T005: 验证码临时表
CREATE TABLE IF NOT EXISTS verification_code (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    target VARCHAR(200) NOT NULL COMMENT '手机号或邮箱',
    code VARCHAR(10) NOT NULL COMMENT '验证码',
    purpose VARCHAR(30) NOT NULL COMMENT '用途: login/register/bind/change_password',
    expires_at DATETIME NOT NULL COMMENT '过期时间（5分钟）',
    used TINYINT DEFAULT 0 COMMENT '是否已使用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_target_purpose (target, purpose),
    INDEX idx_vc_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='验证码表';

-- T006: AI 整理建议表
CREATE TABLE IF NOT EXISTS ai_organize_suggestion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    suggestion_type VARCHAR(30) NOT NULL COMMENT '类型: uncategorized/tag_merge/stale_content/general',
    content TEXT NOT NULL COMMENT '建议内容（JSON）',
    bookmark_ids TEXT DEFAULT NULL COMMENT '涉及收藏ID列表（JSON）',
    status VARCHAR(20) DEFAULT 'unread' COMMENT '状态: unread/applied/ignored',
    ai_analysis TEXT DEFAULT NULL COMMENT 'AI原始分析',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    INDEX idx_aos_user_status (user_id, status),
    INDEX idx_aos_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI整理建议表';

-- T007: AI 分析操作日志表
CREATE TABLE IF NOT EXISTS ai_analysis_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT DEFAULT NULL COMMENT '触发用户ID',
    analysis_type VARCHAR(50) NOT NULL COMMENT '分析类型: bookmark_analysis/organize_suggestion/category_recommend/tag_suggest',
    source VARCHAR(30) NOT NULL COMMENT '触发来源: user_action/system_auto',
    input_summary TEXT DEFAULT NULL COMMENT '输入摘要',
    model VARCHAR(50) DEFAULT NULL COMMENT 'AI模型名称',
    tokens_used INT DEFAULT 0 COMMENT '消耗Token数',
    duration_ms INT DEFAULT 0 COMMENT '耗时（毫秒）',
    success TINYINT DEFAULT 1 COMMENT '是否成功',
    error_message VARCHAR(500) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_aal_user (user_id),
    INDEX idx_aal_type (analysis_type),
    INDEX idx_aal_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI分析操作日志表';

-- T008: 新增系统配置项
INSERT INTO system_setting (setting_key, setting_value, setting_group, description) VALUES
('recommend.enabled', 'true', 'recommend', '个性化推荐功能开关'),
('recommend.externalEnabled', 'false', 'recommend', '外部内容推荐开关'),
('recommend.minBookmarks', '5', 'recommend', '激活推荐所需最少收藏数'),
('ai.organizeIntervalDays', '7', 'ai', 'AI整理建议自动运行间隔（天）'),
('auth.phoneEnabled', 'true', 'auth', '手机号登录开关'),
('auth.emailCodeEnabled', 'true', 'auth', '邮箱验证码登录开关'),
('auth.wechatEnabled', 'false', 'auth', '微信登录开关（需配置AppID）'),
('auth.qqEnabled', 'false', 'auth', 'QQ登录开关（需配置AppID）'),
('auth.wechatAppId', '', 'auth', '微信AppID'),
('auth.qqAppId', '', 'auth', 'QQ AppID')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- 插入示例发现内容
INSERT INTO discover_bookmark (category_id, title, url, description, favicon, source, tags, sort, status) VALUES
(4, '阮一峰的网络日志', 'https://www.ruanyifeng.com/blog/', '知名科技博主，分享编程和技术文章', 'https://www.ruanyifeng.com/favicon.ico', '个人博客', '["技术","博客","前端"]', 1, 'visible'),
(4, '掘金', 'https://juejin.cn/', '掘金 - 代码实验室，优质技术文章聚合平台', 'https://juejin.cn/favicon.ico', '技术社区', '["技术","社区","前端"]', 2, 'visible'),
(5, 'GitHub', 'https://github.com/', '全球最大的代码托管平台', 'https://github.com/favicon.ico', '代码平台', '["代码","开源","工具"]', 1, 'visible'),
(5, 'Stack Overflow', 'https://stackoverflow.com/', '全球最大的程序员问答社区', 'https://stackoverflow.com/favicon.ico', '技术社区', '["问答","编程","工具"]', 2, 'visible'),
(6, 'MDN Web Docs', 'https://developer.mozilla.org/', 'Mozilla开发的Web技术文档', 'https://developer.mozilla.org/favicon.ico', '官方文档', '["文档","前端","Web"]', 1, 'visible'),
(7, 'Dribbble', 'https://dribbble.com/', '设计师社区，发现优秀设计作品', 'https://dribbble.com/favicon.ico', '设计社区', '["设计","UI","灵感"]', 1, 'visible')
ON DUPLICATE KEY UPDATE title=title;
