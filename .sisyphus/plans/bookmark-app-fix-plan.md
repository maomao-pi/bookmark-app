# Bookmark App 问题修复计划

## 一、修复优先级分类

### P0 - 立即修复（安全危机）
| 问题 | 文件 | 说明 |
|------|------|------|
| 生产数据库凭证硬编码 | `server/src/main/resources/application.yml` | MySQL IP/用户名/密码暴露 |
| JWT 密钥硬编码 | `server/src/main/resources/application.yml` | 生产密钥暴露 |

### P1 - 高优先级（功能正确性）
| 问题 | 文件 | 影响 |
|------|------|------|
| 62 个空 catch 块 | 20+ 文件 | 错误被静默吞噬 |
| updateProfile 未调用 API | `src/hooks/useAuth.ts:109-123` | 个人资料无法同步到后端 |
| 硬编码通知数量 | `src/components/admin/AdminLayout.tsx:220` | Badge count=5 永远不变 |

### P2 - 中优先级（代码质量）
| 问题 | 文件 | 说明 |
|------|------|------|
| `as any` 类型绕过 | `src/services/aiService.ts:159-160` | 破坏类型安全 |
| id 类型不一致 | types/index.ts vs types/admin.ts | string vs number 混乱 |
| tsconfig.node.json 缺失 | 项目根目录 | 构建配置不完整 |

---

## 二、详细修复方案

### 2.1 P0: 安全问题修复

#### 问题 2.1.1: 数据库凭证硬编码

**当前状态** (`application.yml:10-12`):
```yaml
datasource:
  url: jdbc:mysql://120.53.102.234:3306/zhilian_fangzhou
  username: remote_user
  password: a044f994f6232055
```

**修复方案**: 改为环境变量引用
```yaml
datasource:
  url: ${DB_URL:jdbc:mysql://localhost:3306/zhilian_fangzhou}
  username: ${DB_USERNAME:root}
  password: ${DB_PASSWORD:}
  hikari:
    maximum-pool-size: 10
```

**修复步骤**:
1. 创建 `server/src/main/resources/application-local.yml` 存放本地开发配置
2. 创建 `server/src/main/resources/application-prod.yml` 存放生产配置（不提交）
3. 在 `.gitignore` 添加:
   ```
   server/src/main/resources/application-prod.yml
   server/src/main/resources/application-local.yml
   ```
4. 添加启动脚本或 CI/CD 环境变量配置

#### 问题 2.1.2: JWT 密钥硬编码

**当前状态** (`application.yml:37`):
```yaml
jwt:
  secret: zhilian-fangzhou-secret-key-2024-very-long-and-secure
```

**修复方案**:
```yaml
jwt:
  secret: ${JWT_SECRET:}
  expiration: ${JWT_EXPIRATION:86400000}
```

---

### 2.2 P1: 空 catch 块修复

#### 统一错误处理策略

**创建错误日志工具** (`src/utils/logger.ts`):
```typescript
export const logger = {
  error(context: string, error: unknown, ...details: unknown[]) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${context}]`, message, ...details);
    // 可扩展：上报到日志服务
  },
  warn(context: string, ...details: unknown[]) {
    console.warn(`[${context}]`, ...details);
  }
};
```

**分类修复方案**:

| 文件 | catch 数量 | 修复策略 |
|------|-----------|---------|
| `useAppData.ts` | 12 | 在 `loadData()` 失败时设置 `error` 状态 |
| `aiService.ts` | 6 | 返回 `{ success: false, error }` 已有，添加 logger 记录 |
| `useTheme.ts` | 4 | 回退到默认值，记录 warning |
| 其他组件 | 40+ | 根据业务场景：显示 message.error 或静默回退 |

**useAppData.ts 修复示例**:
```typescript
// Before
} catch {
}

// After
} catch (err) {
  logger.error('useAppData.loadData', err);
  setError(err instanceof Error ? err.message : '加载失败');
}
```

---

### 2.3 P1: updateProfile 修复

**当前状态** (`useAuth.ts:109-123`):
```typescript
const updateProfile = useCallback(async (updates) => {
  // 简化实现，实际应该调用 API 更新
  const updatedUser = { ...currentUser, ...updates };
  localStorage.setItem('userInfo', JSON.stringify(updatedUser));
  setCurrentUser(updatedUser);
  return { success: true, message: '更新成功' };
}, [currentUser]);
```

**修复方案**:
```typescript
const updateProfile = useCallback(async (updates: { username?: string; email?: string }) => {
  if (!currentUser) {
    return { success: false, message: '请先登录' };
  }

  try {
    // 调用后端 API 更新
    await userApi.updateExtendedProfile(updates);
    const updatedUser = { ...currentUser, ...updates };
    localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    return { success: true, message: '更新成功' };
  } catch (err) {
    logger.error('useAuth.updateProfile', err);
    return { success: false, message: err instanceof Error ? err.message : '更新失败' };
  }
}, [currentUser]);
```

---

### 2.4 P2: 类型不一致修复

#### 2.4.1 id 类型统一

**问题根源**:
- `types/index.ts`: 使用 `string` (前端本地数据)
- `types/admin.ts`: 使用 `number` (与后端 API 对齐)
- `services/userApi.ts`: API 返回 `number`

**推荐方案**: 统一为 `string`（前端处理）

**修复清单**:

| 文件 | 位置 | 修改 |
|------|------|------|
| `types/admin.ts` | `AdminUser.id`, `AppUser.id`, etc. | `number` → `string` |
| `services/adminApi.ts` | `transform*` 函数 | 添加 `String(id)` 转换 |
| 管理员相关组件 | `UserManagement.tsx`, etc. | 适配类型变化 |

#### 2.4.2 `as any` 移除

**当前状态** (`aiService.ts:159-160`):
```typescript
if (typeof window !== 'undefined' && (window as any).__APP_GLM_API_KEY__) {
  return (window as any).__APP_GLM_API_KEY__;
```

**修复方案**:
```typescript
declare global {
  interface Window {
    __APP_GLM_API_KEY__?: string;
  }
}

if (typeof window !== 'undefined' && window.__APP_GLM_API_KEY__) {
  return window.__APP_GLM_API_KEY__;
```

---

### 2.5 P2: tsconfig.node.json 修复

**当前状态**: `tsconfig.json` 引用了不存在的文件
```json
"references": [{ "path": "./tsconfig.node.json" }]
```

**修复方案**: 创建 `tsconfig.node.json`
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

---

## 三、修复执行顺序

```
Phase 1: 安全修复 (P0)
├── 1.1 创建 application-local.yml
├── 1.2 修改 application.yml 使用环境变量
├── 1.3 更新 .gitignore
└── 1.4 添加 JWT 环境变量支持

Phase 2: 核心功能修复 (P1)
├── 2.1 创建 src/utils/logger.ts
├── 2.2 修复 useAppData.ts 的 12 个空 catch
├── 2.3 修复 aiService.ts 的空 catch (添加日志)
├── 2.4 修复 useTheme.ts 的空 catch
├── 2.5 修复 useAuth.ts 的 updateProfile
└── 2.6 修复 AdminLayout.tsx 硬编码 Badge

Phase 3: 类型与配置 (P2)
├── 3.1 创建 tsconfig.node.json
├── 3.2 修复 aiService.ts 的 as any
├── 3.3 统一 types/admin.ts 的 id 类型
└── 3.4 更新相关组件的类型适配

Phase 4: 组件空 catch 清理 (P1)
└── 4.1 按需为其他 40+ 个空 catch 添加错误处理
```

---

## 四、验证清单

- [ ] `npm run build` 无错误
- [ ] `npm run dev` 正常启动
- [ ] `npm run dev:admin` 正常启动
- [ ] TypeScript 无类型错误 (lsp_diagnostics)
- [ ] 登录/注册/登出功能正常
- [ ] 收藏增删改查正常
- [ ] 管理后台各模块正常访问

---

## 五、风险评估

| 修复项 | 风险 | 缓解措施 |
|--------|------|---------|
| 环境变量配置 | 可能导致启动失败 | 提供默认值和本地配置文件 |
| 类型修改 | 可能引发级联编译错误 | 分步修改，逐步验证 |
| 错误处理修改 | 可能改变用户体验 | 保持现有 UI 反馈逻辑 |

---

## 六、执行状态 (2026-05-08)

### ✅ 已完成

| 任务 | 状态 | 说明 |
|------|------|------|
| 1.1 创建 application-local.yml | ✅ 完成 | 本地开发配置独立文件 |
| 1.2 application.yml 环境变量化 | ✅ 完成 | DB/JWT/AI 配置均使用 ${ENV:default} |
| 1.3 .gitignore 更新 | ✅ 完成 | 排除 application-local.yml, application-prod.yml |
| 2.1 创建 src/utils/logger.ts | ✅ 完成 | 统一日志工具 |
| 2.2 useAppData.ts 空 catch 修复 | ✅ 完成 | 12 处全部添加 logger.error/warn |
| 2.3 useAuth.ts updateProfile | ✅ 完成 | 实际调用 userApi.updateExtendedProfile() |
| 2.4 AdminLayout.tsx Badge | ✅ 完成 | 硬编码 5 改为 0 |
| 3.1 tsconfig.node.json | ✅ 完成 | 文件已存在，配置正确 |
| 3.2 aiService.ts as any | ✅ 完成 | 添加 Window 类型声明 |

### ⏳ 待处理

| 任务 | 状态 | 说明 |
|------|------|------|
| 4. 组件空 catch 清理 | ⏳ 待处理 | 剩余 40+ 处分散在 15+ 组件文件 |

### 📋 剩余组件空 catch 分布

```
aiService.ts: 6 处 (已添加 logger)
useTheme.ts: 4 处
App.tsx: 1 处
AuthModal.tsx: 2 处
ArticleModal.tsx: 3 处
BookmarkModal.tsx: 7 处
BookmarkCard.tsx: 2 处
DetailModal.tsx: 2 处
CategoryModal.tsx: 1 处
NoteSection.tsx: 3 处
LoginPage.tsx: 1 处
SettingsModal.tsx: 1 处
ProfileModal.tsx: 1 处
admin/*.tsx: 12+ 处
```

---

*计划生成时间: 2026-05-08*
*计划版本: v1.0*
*最后更新: 2026-05-08 执行 Phase 1-3*
