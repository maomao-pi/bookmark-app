# AGENTS.md - 知链方舟 Bookmark App 开发指南

本文档为 AI Agent 提供项目开发规范和参考指南。

## 一、项目概述

本项目是一个基于 React + TypeScript + Vite + Ant Design 的网站收藏夹管理应用，包含用户端和管理后台两个前端应用，以及 Spring Boot 后端服务。

- **用户端**: `index.html` → `src/main.tsx` → `src/App.tsx` (端口 5173)
- **管理后台**: `admin.html` → `src/admin.tsx` → `src/components/admin/AdminApp.tsx` (端口 5174)
- **后端**: Spring Boot 3.2.1 (端口 8080)

## 二、开发命令

### 2.1 前端命令

```bash
npm install              # 安装依赖
npm run dev              # 启动用户端开发服务器 (http://localhost:5173)
npm run dev:admin        # 启动管理后台开发服务器 (http://localhost:5174)
npm run build            # 构建生产版本 (含 TypeScript 类型检查)
npm run preview          # 预览构建结果
```

### 2.2 后端命令

```bash
cd server
mvn clean compile        # 编译项目
mvn spring-boot:run      # 运行开发服务器 (http://localhost:8080)
mvn clean package        # 打包为可执行 JAR
mvn test                 # 运行单元测试
mvn test -Dtest=XXXTest # 运行单个测试类
java -jar target/server-1.0.0.jar  # 运行打包后的 JAR
```

### 2.3 环境变量

**前端** (`.env` 或 `.env.local`):
```
VITE_API_BASE_URL=http://localhost:8080
```

**后端** (`server/src/main/resources/application.yml`):
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
  expiration: 86400000
```

## 三、技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18.2.0, TypeScript 5.3.3 (strict), Vite 5.0.8, Ant Design 5.12.0 |
| 后端 | Java 17, Spring Boot 3.2.1, Spring Security, MyBatis Plus 3.5.5 |
| 数据库 | MySQL 8.x (生产) / H2 (开发) |
| 认证 | JWT Token (用户端 localStorage, 管理后台 sessionStorage) |

## 四、代码风格规范

### 4.1 导入顺序 (前端)

严格遵守以下顺序:
1. React 内置 Hooks: `import { useState, useEffect } from 'react'`
2. 第三方组件库: `import { Button, Modal } from 'antd'`
3. 第三方图标: `import { PlusOutlined } from '@ant-design/icons'`
4. 项目内部模块: `import { useAppData } from './hooks/useAppData'`
5. 类型导入: `import type { Bookmark, Category } from './types'`
6. 样式文件: `import './App.css'`

### 4.2 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名/组件名 | PascalCase | `BookmarkCard.tsx`, `function BookmarkCard() {}` |
| Hook 名 | camelCase, use 开头 | `useAppData`, `useTheme` |
| 类型/接口 | PascalCase | `interface BookmarkProps` |
| CSS 类名 | kebab-case | `.bookmark-card` |
| Java 类名 | PascalCase | `BookmarkController` |
| Java 方法/变量 | camelCase | `getBookmarks` |
| Java 常量 | UPPER_SNAKE_CASE | `JWT_SECRET` |

### 4.3 TypeScript 规范

- **严格模式**: 已启用 `strict: true`，必须提供完整类型注解
- **类型导入**: 使用 `import type` 导入类型
- **禁止使用**: `any`, `@ts-ignore`, `@ts-expect-error`
- **接口 vs 类型**: 用 `interface` 定义对象结构，`type` 定义联合类型
- **解构赋值**: 使用解构获取 props 和 state

### 4.4 Java 规范

- **实体类**: 使用 Lombok 注解 (`@Data`, `@Entity`, `@Table`)
- **服务层**: 接口 + 实现类模式
- **Controller**: 遵循 RESTful 风格，使用 `@RestController`
- **事务管理**: 使用 `@Transactional` 注解
- **异常处理**: 自定义异常 + 全局异常处理器

### 4.5 前端组件规范

```typescript
interface BookmarkCardProps {
  bookmark: Bookmark;
  categoryName: string | null;
  onView: (bookmark: Bookmark) => void;
}

export function BookmarkCard({ bookmark, categoryName, onView }: BookmarkCardProps) {
  // 使用 useMemo 缓存计算结果
  // 使用 useCallback 缓存事件处理函数
  // 依赖数组必须完整准确
}
```

### 4.6 错误处理 (前端)

- 使用 Ant Design 的 `message` 组件显示操作反馈
- API 错误统一在 service 层处理，401 自动跳转登录
- 表单验证使用 Ant Design Form 的 `validateMessages`

## 五、项目结构

```
src/
├── components/          # React 组件
│   ├── BookmarkCard.tsx
│   ├── BookmarkModal.tsx
│   └── admin/           # 管理后台组件
│       ├── AdminApp.tsx
│       ├── AdminLayout.tsx
│       └── Dashboard.tsx
├── hooks/               # 自定义 Hooks
│   ├── useAppData.ts
│   ├── useTheme.ts
│   └── useAuth.ts
├── services/            # API 服务层
│   ├── userApi.ts
│   └── adminApi.ts
├── types/               # TypeScript 类型
│   ├── index.ts
│   └── admin.ts
├── App.tsx              # 用户端入口
└── admin.tsx            # 管理后台入口

server/src/main/java/com/zhilian/server/
├── controller/          # 控制器
├── service/             # 业务服务
├── mapper/              # 数据访问层
├── entity/              # 实体类
├── dto/                 # 数据传输对象
├── security/            # 安全认证
├── config/              # 配置类
└── exception/           # 异常处理
```

## 六、Cursor 规则

项目包含 Cursor IDE 规则文件: `.cursor/rules/specify-rules.mdc`

## 七、注意事项

- 前端构建前确保 `npm run build` 无 TypeScript 错误
- 后端所有增删改查必须使用分页
- 敏感操作必须记录日志
- 管理后台会话超时 5 分钟无操作自动退出
- 生产环境修改默认管理员密码和 JWT 密钥
- 默认管理员: `admin` / `admin123`

## 八、数据库迁移

升级后若数据库为旧 schema (`app_user` 表缺少 `nickname`, `bio`, `phone`, `delete_pending_at` 等列)，需手动执行迁移 SQL。详见 `specs/004-fix-login-ai-analysis/quickstart.md`
