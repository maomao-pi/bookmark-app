# AGENTS.md - 知链方舟 Bookmark App 开发指南

本文档为 AI Agent 提供项目开发规范和参考指南。

## 一、项目概述

本项目是一个基于 React + TypeScript + Vite + Ant Design 的网站收藏夹管理应用，包含用户端和管理后台两个前端应用，以及 Spring Boot 后端服务。

### 1.1 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (Vite + React)                     │
├─────────────────────────────────────────────────────────────────┤
│  用户端 (index.html)          │  管理后台 (admin.html)          │
│  - src/main.tsx              │  - src/admin.tsx               │
│  - src/App.tsx               │  - src/components/admin/        │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      后端 (Spring Boot 3.2.1)                   │
│  http://localhost:8080                                         │
├─────────────────────────────────────────────────────────────────┤
│  技术栈: Spring Boot, Spring Security, MyBatis Plus, MySQL    │
│  认证: JWT Token                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 核心功能

**用户端**：
- 用户注册/登录
- 收藏网站管理（增删改查）
- 分类管理
- 关联文章管理
- 发现广场（浏览公开收藏）
- 主题切换（浅色/深色）

**管理后台**：
- 管理员登录认证
- 数据统计仪表盘
- 用户管理
- 收藏管理
- 分类管理
- 发现内容管理
- 文章管理
- 系统设置
- 操作日志

## 二、开发命令

### 2.1 前端命令

```bash
# 启动用户端开发服务器（默认端口 5173）
npm run dev

# 启动管理后台开发服务器
npm run dev:admin

# 构建生产版本（包含 TypeScript 类型检查）
npm run build

# 预览构建结果
npm run preview
```

### 2.2 后端命令

```bash
# 进入后端目录
cd server

# 编译项目
mvn clean compile

# 运行开发服务器
mvn spring-boot:run

# 打包为可执行 JAR
mvn clean package -DskipTests

# 运行打包后的 JAR
java -jar target/server-1.0.0.jar
```

### 2.3 环境变量

**前端环境变量**（`.env` 或 `.env.local`）：
```
VITE_API_BASE_URL=http://localhost:8080
```

**后端配置**（`server/src/main/resources/application.yml`）：
```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/zhilian_fangzhou
    username: root
    password: your_password

jwt:
  secret: your-secret-key
  expiration: 86400000  # 24小时
```

## 三、技术栈

### 3.1 前端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18.2.0 | UI 框架 |
| TypeScript | 5.3.3 | 语言（strict 模式） |
| Vite | 5.0.8 | 构建工具 |
| Ant Design | 5.12.0 | UI 组件库 |
| @ant-design/icons | 5.2.6 | 图标库 |
| react-router-dom | 7.13.1 | 路由 |
| recharts | 3.7.0 | 图表库 |

### 3.2 后端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Java | 17 | 语言 |
| Spring Boot | 3.2.1 | 框架 |
| Spring Security | - | 安全认证 |
| MyBatis Plus | 3.5.5 | ORM 框架 |
| MySQL | 8.x | 数据库 |
| H2 | - | 内存数据库（开发用） |
| JWT | 0.12.3 | 令牌认证 |
| Lombok | 1.18.38 | 代码生成 |

## 四、代码风格规范

### 4.1 文件组织

```
项目根目录/
├── src/                          # 前端源码
│   ├── components/               # React 组件
│   │   ├── BookmarkCard.tsx      # 用户端组件
│   │   ├── BookmarkCard.css
│   │   ├── BookmarkModal.tsx
│   │   └── admin/                # 管理后台组件
│   │       ├── AdminApp.tsx
│   │       ├── AdminLayout.tsx
│   │       ├── Dashboard.tsx
│   │       ├── UserManagement.tsx
│   │       └── ...
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useAppData.ts
│   │   ├── useTheme.ts
│   │   ├── useAuth.ts
│   │   └── useAI.ts
│   ├── services/                 # API 服务层
│   │   ├── userApi.ts           # 用户端 API
│   │   ├── adminApi.ts          # 管理后台 API
│   │   └── aiService.ts
│   ├── types/                    # TypeScript 类型
│   │   ├── index.ts             # 用户端类型
│   │   └── admin.ts             # 管理后台类型
│   ├── App.tsx                  # 用户端入口
│   ├── App.css
│   ├── admin.tsx                # 管理后台入口
│   └── main.tsx                 # 用户端渲染入口
│
├── server/                       # 后端源码
│   ├── src/main/java/com/zhilian/server/
│   │   ├── controller/           # 控制器
│   │   ├── service/             # 业务服务
│   │   ├── mapper/              # 数据访问层
│   │   ├── entity/              # 实体类
│   │   ├── dto/                 # 数据传输对象
│   │   ├── security/            # 安全认证
│   │   ├── config/              # 配置类
│   │   └── exception/           # 异常处理
│   └── pom.xml
│
├── index.html                    # 用户端 HTML
├── admin.html                    # 管理后台 HTML
├── vite.config.ts               # Vite 配置
└── package.json
```

### 4.2 导入规范（前端）

**导入顺序**（必须严格遵守）：

1. React 内置 Hooks：`import { useState, useEffect } from 'react'`
2. 第三方组件库：`import { Button, Modal } from 'antd'`
3. 第三方图标：`import { PlusOutlined } from '@ant-design/icons'`
4. 项目内部模块：`import { useAppData } from './hooks/useAppData'`
5. 类型导入：`import type { Bookmark, Category } from './types'`
6. 样式文件：`import './App.css'`

**示例**：

```typescript
import { useState, useMemo } from 'react';
import { ConfigProvider, Layout, Button, message } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import { useAppData } from './hooks/useAppData';
import { useTheme } from './hooks/useTheme';
import type { Bookmark, Category } from './types';
import './App.css';
```

### 4.3 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | PascalCase | `BookmarkCard.tsx`、`useAppData.ts` |
| 组件名 | PascalCase | `function BookmarkCard() { }` |
| Hook 名 | camelCase，use 开头 | `useAppData`、`useTheme` |
| 类型名 | PascalCase | `interface BookmarkProps` |
| 常量名 | camelCase | `const STORAGE_KEY = 'bookmarkAppData'` |
| CSS 类名 | kebab-case | `.bookmark-card`、`app-header` |
| Java 类名 | PascalCase | `BookmarkController`、`BookmarkService` |
| Java 方法名 | camelCase | `getBookmarks`、`createBookmark` |
| Java 常量 | UPPER_SNAKE_CASE | `JWT_SECRET`、`MAX_PAGE_SIZE` |

### 4.4 TypeScript 规范

- **严格模式**：项目已启用 `strict: true`，必须提供完整的类型注解
- **类型导入**：使用 `import type` 导入类型，避免运行时导入
- **禁止使用**：`any` 类型、`@ts-ignore`、`@ts-expect-error`
- **接口 vs 类型**：使用 `interface` 定义对象结构，使用 `type` 定义联合类型和别名

### 4.5 Java 规范

- **实体类**：使用 Lombok 注解（`@Data`、`@Entity`、`@Table`）
- **服务层**：接口 + 实现类模式
- **Controller**：遵循 RESTful 风格，使用 `@RestController`
- **事务管理**：使用 `@Transactional` 注解
- **异常处理**：使用自定义异常 + 全局异常处理器

### 4.6 组件规范（前端）

- **组件定义**：使用函数组件，不使用类组件
- **Props 类型**：使用 interface 定义独立的 Props 类型
- **解构赋值**：使用解构获取 props 和 state

**示例**：

```typescript
interface BookmarkCardProps {
  bookmark: Bookmark;
  categoryName: string | null;
  onView: (bookmark: Bookmark) => void;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
}

export function BookmarkCard({ bookmark, categoryName, onView, onEdit, onDelete }: BookmarkCardProps) {
  // 组件逻辑
}
```

### 4.7 Hook 规范（前端）

- **状态派生**：使用 `useMemo` 缓存计算结果
- **函数引用**：使用 `useCallback` 缓存事件处理函数
- **依赖数组**：确保依赖数组完整且准确

## 五、API 接口规范

### 5.1 用户端 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/login` | 用户登录 |
| POST | `/api/user/register` | 用户注册 |
| GET | `/api/user/profile` | 获取用户信息 |
| GET | `/api/user/bookmarks` | 获取收藏列表 |
| POST | `/api/user/bookmarks` | 创建收藏 |
| PUT | `/api/user/bookmarks/{id}` | 更新收藏 |
| DELETE | `/api/user/bookmarks/{id}` | 删除收藏 |
| GET | `/api/user/categories` | 获取分类列表 |
| POST | `/api/user/categories` | 创建分类 |
| PUT | `/api/user/categories/{id}` | 更新分类 |
| DELETE | `/api/user/categories/{id}` | 删除分类 |
| GET | `/api/user/bookmarks/{id}/articles` | 获取文章列表 |
| POST | `/api/user/bookmarks/{id}/articles` | 创建文章 |
| PUT | `/api/user/bookmarks/{bookmarkId}/articles/{articleId}` | 更新文章 |
| DELETE | `/api/user/bookmarks/{bookmarkId}/articles/{articleId}` | 删除文章 |
| GET | `/api/discover/categories` | 获取发现分类 |
| GET | `/api/discover/bookmarks` | 获取发现内容 |

### 5.2 管理后台 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 管理员登录 |
| GET | `/api/admin/stats/overview` | 获取统计概览 |
| GET | `/api/admin/users` | 获取用户列表 |
| GET | `/api/admin/users/{id}/detail` | 获取用户详情 |
| POST | `/api/admin/users` | 创建用户 |
| PUT | `/api/admin/users/{id}` | 更新用户 |
| DELETE | `/api/admin/users/{id}` | 删除用户 |
| PUT | `/api/admin/users/{id}/status` | 更新用户状态 |
| GET | `/api/admin/bookmarks` | 获取收藏列表 |
| POST | `/api/admin/bookmarks` | 创建收藏 |
| PUT | `/api/admin/bookmarks/{id}` | 更新收藏 |
| DELETE | `/api/admin/bookmarks/{id}` | 删除收藏 |
| POST | `/api/admin/bookmarks/batch-delete` | 批量删除收藏 |
| GET | `/api/admin/categories` | 获取分类列表 |
| GET | `/api/admin/categories/all` | 获取全部分类 |
| POST | `/api/admin/categories` | 创建分类 |
| PUT | `/api/admin/categories/{id}` | 更新分类 |
| DELETE | `/api/admin/categories/{id}` | 删除分类 |
| GET | `/api/admin/discover` | 获取发现列表 |
| POST | `/api/admin/discover` | 创建发现内容 |
| PUT | `/api/admin/discover/{id}` | 更新发现内容 |
| DELETE | `/api/admin/discover/{id}` | 删除发现内容 |
| POST | `/api/admin/discover/batch-delete` | 批量删除发现内容 |
| PUT | `/api/admin/discover/batch-status` | 批量更新发现内容状态 |
| POST | `/api/admin/discover/batch-category` | 批量移动发现内容到分类 |
| GET | `/api/admin/contents/user` | 获取用户内容列表（用户收藏的关联内容） |
| GET | `/api/admin/contents/discover` | 获取发现内容列表（发现收藏的关联内容） |
| GET | `/api/admin/logs` | 获取操作日志 |
| GET | `/api/admin/settings` | 获取系统设置 |
| PUT | `/api/admin/settings` | 更新系统设置 |

### 5.3 响应格式

**成功响应**：
```json
{
  "code": 200,
  "message": "success",
  "data": { }
}
```

**分页响应**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "records": [],
    "total": 100,
    "pageNum": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}
```

**错误响应**：
```json
{
  "code": 400,
  "message": "错误信息",
  "data": null
}
```

## 六、数据库设计

### 6.1 核心表结构

| 表名 | 说明 |
|------|------|
| `user` | 用户表 |
| `bookmark` | 收藏表 |
| `category` | 分类表 |
| `article` | 文章表（关联用户收藏和发现收藏） |
| `discover_bookmark` | 发现内容表 |
| `admin` | 管理员表 |
| `operation_log` | 操作日志表 |
| `system_setting` | 系统设置表 |

### 6.2 内容管理说明

**内容（Article）关联两种来源：**
- **用户内容**：`bookmark_id` 关联 `bookmark` 表（用户收藏）
- **发现内容**：`discover_bookmark_id` 关联 `discover_bookmark` 表（发现收藏）

**内容类型：** `article`（文章）、`video`（视频）、`document`（文档）、`link`（链接）

### 6.2 实体类对照

| Java 实体 | 表名 | 说明 |
|-----------|------|------|
| `User` | `user` | 用户 |
| `Bookmark` | `bookmark` | 收藏 |
| `Category` | `category` | 分类 |
| `Article` | `article` | 文章 |
| `DiscoverBookmark` | `discover_bookmark` | 发现内容 |
| `Admin` | `admin` | 管理员 |
| `OperationLog` | `operation_log` | 操作日志 |
| `SystemSetting` | `system_setting` | 系统设置 |

## 七、安全规范

### 7.1 认证机制

- **用户端**：JWT Token 认证，Token 存储在 localStorage
- **管理后台**：JWT Token 认证，Token 存储在 sessionStorage

### 7.2 安全配置

- **密码加密**：BCrypt 加密存储
- **接口保护**：Spring Security 配置权限规则
- **CORS**：配置允许的跨域来源
- **敏感操作**：记录操作日志

### 7.3 前端安全

- Token 自动添加到请求头：`Authorization: Bearer <token>`
- 401 响应自动跳转到登录页
- 敏感信息不存储在 localStorage（除 Token 外）

## 八、环境配置

### 8.1 开发环境

**前端**：
```bash
npm install
npm run dev        # 用户端 http://localhost:5173
npm run build      # 构建
```

**后端**：
```bash
cd server
mvn spring-boot:run  # http://localhost:8080
```

### 8.2 数据库初始化

首次启动后端时，会自动执行 `schema.sql` 初始化数据库表结构。

默认管理员账号：
- 用户名：`admin`
- 密码：`admin123`

### 8.3 生产构建

```bash
# 前端构建
npm run build
# 输出目录: dist/

# 后端打包
cd server
mvn clean package -DskipTests
# 输出文件: server/target/server-1.0.0.jar
```

## 九、常见开发任务

### 9.1 添加新组件（前端）

1. 在 `src/components/` 下创建 `XXX.tsx` 和 `XXX.css`
2. 定义 Props 接口
3. 实现组件逻辑和渲染
4. 在父组件中导入使用

### 9.2 添加新 Hook（前端）

1. 在 `src/hooks/` 下创建 `useXXX.ts`
2. 使用 `useCallback` 封装业务逻辑
3. 返回需要的状态和函数

### 9.3 添加新类型（前端）

1. 在 `src/types/index.ts` 或 `admin.ts` 中添加 interface 或 type
2. 使用 `export` 导出
3. 在需要的地方使用 `import type` 导入

### 9.4 添加新 API（后端）

1. 在 `controller/` 下创建 `XXXController.java`
2. 在 `service/` 下创建 `XXXService.java` 接口和实现类
3. 在 `mapper/` 下创建 `XXXMapper.java`
4. 在 `entity/` 下创建 `XXX.java` 实体类

### 9.5 添加新数据库表

1. 在 `schema.sql` 中添加表结构
2. 在对应 entity 包下创建实体类
3. 创建 Mapper 接口
4. 创建 Service 层
5. 创建 Controller 层

## 十、注意事项

### 10.1 前端

- 用户端入口：`index.html` -> `main.tsx` -> `App.tsx`
- 管理后台入口：`admin.html` -> `admin.tsx` -> `AdminApp.tsx`
- 生产构建前请确保 `npm run build` 执行成功且无 TypeScript 错误
- 遵循代码规范，保持项目代码风格一致

### 10.2 后端

- 使用 MyBatis Plus 进行数据库操作
- 所有增删改查操作必须使用分页
- 敏感操作必须记录日志
- 上线前修改默认密码和 JWT 密钥
- 生产环境使用 MySQL，开发环境可用 H2

### 10.3 部署

- 前端构建产物位于 `dist/` 目录
- 后端 JAR 文件位于 `server/target/`
- 建议使用 Nginx 反向代理前端和后端
- 数据库建议使用 MySQL 8.x
