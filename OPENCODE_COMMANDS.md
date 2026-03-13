# OpenCode 指令与命令参考指南

本文档详细介绍 OpenCode 平台中所有可用的指令、命令和工具，帮助用户高效地进行开发工作。

## 一、文件操作工具

OpenCode 提供了丰富的文件操作能力，支持对代码库进行精确的读取、搜索、编辑和管理。

### 1.1 read - 读取文件

`read` 工具用于读取文件或目录的内容，支持大文件分块读取。

**参数说明**：

- `filePath`（必需）：要读取的文件或目录的绝对路径
- `limit`：最大读取行数，默认为 2000 行
- `offset`：起始行号，从第几行开始读取（从 1 开始计数）

**使用示例**：

```
读取文件前 100 行：
read(filePath: "/path/to/file.ts", limit: 100)

从第 50 行开始读取：
read(filePath: "/path/to/file.ts", offset: 50, limit: 100)
```

### 1.2 write - 写入文件

`write` 工具用于创建新文件或覆盖已有文件的内容。

**参数说明**：

- `content`（必需）：要写入的文件内容
- `filePath`（必需）：目标文件的绝对路径

**使用示例**：

```
写入新文件：
write(content: "// Hello World\nconsole.log('Hello');", filePath: "/path/to/hello.js")
```

**重要提示**：写入已有文件前必须先使用 `read` 工具读取文件内容，否则操作会失败。

### 1.3 edit - 编辑文件

`edit` 工具是 OpenCode 最强大的文件修改工具，支持精确的行级编辑操作。

**核心概念**：

- **位置标记（LINE#ID）**：每行内容都有一个唯一的标识符，格式为 `{行号}#{哈希ID}`，例如 `42#ABC`。编辑时需要引用这些标记来定位修改位置。
- **操作类型**：
  - `replace`：替换指定行的内容
  - `append`：在指定位置后追加内容
  - `prepend`：在指定位置前插入内容

**参数说明**：

- `edits`（必需）：编辑操作数组，每个操作包含：
  - `op`：操作类型（replace/append/prepend）
  - `pos`：位置标记（用于 replace 时为单行，用于 append/prepend 时为锚点）
  - `end`：结束位置标记（仅用于范围替换）
  - `lines`：新的内容，可以是字符串或字符串数组
- `filePath`（必需）：目标文件的绝对路径
- `delete`：是否删除文件（需要配合 `edits: []` 使用）
- `rename`：文件重命名目标路径

**使用示例**：

```
单行替换：
edit(filePath: "/path/to/file.ts", edits: [
  { op: "replace", pos: "10#ABC", lines: "const newContent = 'updated';" }
])

范围替换（替换多行）：
edit(filePath: "/path/to/file.ts", edits: [
  { op: "replace", pos: "10#ABC", end: "15#DEF", lines: "// New content block" }
])

在指定行后追加：
edit(filePath: "/path/to/file.ts", edits: [
  { op: "append", pos: "20#GHI", lines: "// Appended line" }
])

在指定行前插入：
edit(filePath: "/path/to/file.ts", edits: [
  { op: "prepend", pos: "5#JKL", lines: "// Inserted at beginning" }
])
```

**最佳实践**：每次编辑后，系统会返回更新后的位置标记。如需对同一文件进行多次编辑，建议在每次编辑后重新读取文件以获取最新的位置标记。

### 1.4 glob - 文件搜索

`glob` 工具用于通过模式匹配快速查找文件，支持通配符语法。

**参数说明**：

- `path`：搜索路径，默认为当前工作目录
- `pattern`（必需）：文件匹配模式

**模式示例**：

```
查找所有 TypeScript 文件：
glob(pattern: "**/*.ts")

查找 src 目录下所有组件：
glob(pattern: "src/components/**/*")

查找特定文件名：
glob(pattern: "**/App.tsx")
```

### 1.5 grep - 内容搜索

`grep` 工具用于在文件内容中搜索指定的文本或正则表达式模式。

**参数说明**：

- `pattern`（必需）：搜索模式，支持正则表达式
- `path`：搜索路径，默认为当前工作目录
- `include`：文件过滤模式，例如 `"*.ts"` 或 `"*.{ts,tsx}"`
- `output_mode`：输出模式
  - `content`：显示匹配的内容行（默认）
  - `files_with_matches`：仅显示包含匹配的文件名
  - `count`：显示每个文件的匹配数量
- `head_limit`：限制结果数量

**使用示例**：

```
搜索包含 "TODO" 的行：
grep(pattern: "TODO", path: "/path/to/project")

使用正则表达式搜索：
grep(pattern: "function\\s+\\w+", include: "*.ts")

仅获取文件列表：
grep(pattern: "class.*Controller", output_mode: "files_with_matches")
```

### 1.6 delete - 删除文件

`delete` 工具用于删除指定的文件。

**参数说明**：

- `filePath`（必需）：要删除的文件路径

### 1.7 rename - 重命名文件

`rename` 工具用于重命名或移动文件。

**参数说明**：

- `filePath`（必需）：原文件路径
- `newPath`（必需）：目标文件路径

## 二、代码执行工具

### 2.1 bash - 命令行执行

`bash` 工具用于在终端中执行命令行命令。

**参数说明**：

- `command`（必需）：要执行的命令
- `description`：命令描述，用于日志记录
- `timeout`：超时时间（毫秒），默认为 120000ms（2分钟）
- `workdir`：执行命令的工作目录，默认为当前项目根目录

**使用示例**：

```
运行 npm 安装：
bash(command: "npm install", description: "Install npm dependencies")

在指定目录运行测试：
bash(command: "npm test", workdir: "/path/to/project", timeout: 60000)
```

**重要提示**：

- Windows 系统下路径使用反斜杠，但建议使用正斜杠格式
- 避免使用 `cd` 命令切换目录，应使用 `workdir` 参数
- 命令路径中有空格时需要用双引号包裹

### 2.2 interactive_bash - 交互式终端

`interactive_bash` 工具用于需要持续交互的终端应用（如 vim、htop 等）。

**参数说明**：

- `tmux_command`（必需）：TMUX 子命令

**使用示例**：

```
创建新的 TMUX 会话：
interactive_bash(tmux_command: "new-session -d -s my-session")

向会话发送按键：
interactive_bash(tmux_command: "send-keys -t my-session \"vim\" Enter")
```

## 三、AI Agent 任务工具

### 3.1 task - 任务委托

`task` 工具用于将工作委托给专门的 AI Agent，是 OpenCode 协作能力的核心。

**核心概念**：

- **category**：任务分类，不同分类使用针对特定领域优化的模型
- **subagent_type**：直接调用特定类型的 Agent
- **session_id**：会话ID，用于多轮对话中保持上下文
- **load_skills**：加载特定技能

**可用分类（category）**：

| 分类 | 适用场景 |
|------|----------|
| `visual-engineering` | 前端开发、UI/UX 设计、样式、动画 |
| `ultrabrain` | 复杂的逻辑密集型任务，仅在真正困难时使用 |
| `deep` | 目标导向的问题解决，需要深入研究 |
| `artistry` | 非传统的复杂问题解决，需要创造性方法 |
| `quick` | 简单任务，单文件修改、拼写修正、简单修改 |
| `unspecified-low` | 不适合其他分类的低难度任务 |
| `unspecified-high` | 不适合其他分类的高难度任务 |
| `writing` | 文档编写、技术写作 |

**可用子代理类型（subagent_type）**：

| 类型 | 功能描述 |
|------|----------|
| `explore` | 代码库探索，用于搜索和理解现有代码结构 |
| `librarian` | 外部参考搜索，查找文档、最佳实践、库用法 |
| `oracle` | 高智商顾问，用于复杂架构和调试问题 |
| `metis` | 预规划分析，识别需求模糊点和潜在问题 |
| `momus` | 工作计划评审，评估计划清晰度和完整性 |

**参数说明**：

- `category`（二选一）：任务分类
- `subagent_type`（二选一）：直接调用 Agent 类型
- `prompt`（必需）：任务提示词，必须使用英文
- `description`：任务描述
- `load_skills`：技能数组，传递要使用的技能
- `run_in_background`：是否后台运行
- `session_id`：会话ID，用于继续之前的任务

**使用示例**：

```
委托前端开发任务：
task(
  category: "visual-engineering",
  load_skills: ["frontend-ui-ux"],
  prompt: "Create a responsive navigation component with dropdown menus.",
  description: "Create navigation component"
)

使用 explore 探索代码库：
task(
  subagent_type: "explore",
  run_in_background: true,
  prompt: "Find all authentication-related files and patterns in the src/ directory.",
  description: "Find auth implementations"
)

继续之前的任务：
task(
  session_id: "ses_abc123",
  prompt: "Fix the type error on line 42 that we discussed earlier."
)
```

### 3.2 session_list - 列出会话

`session_list` 工具用于列出所有 OpenCode 会话。

**参数说明**：

- `limit`：返回的最大会话数
- `from_date`：起始日期过滤（ISO 8601 格式）
- `to_date`：结束日期过滤
- `project_path`：项目路径过滤

### 3.3 session_read - 读取会话

`session_read` 工具用于读取特定会话的消息历史。

**参数说明**：

- `session_id`（必需）：会话ID
- `include_todos`：是否包含待办事项
- `include_transcript`：是否包含完整记录
- `limit`：返回的最大消息数

### 3.4 session_search - 搜索会话

`session_search` 工具用于在会话消息中搜索内容。

**参数说明**：

- `query`（必需）：搜索查询字符串
- `session_id`：特定会话ID
- `case_sensitive`：是否区分大小写
- `limit`：返回的最大结果数

### 3.5 session_info - 会话信息

`session_info` 工具用于获取会话的元数据和统计信息。

**参数说明**：

- `session_id`（必需）：会话ID

## 四、LSP 工具

LSP（Language Server Protocol）工具提供代码级别的分析能力，包括跳转定义、引用查找、符号搜索、重命名等功能。

### 4.1 lsp_goto_definition - 跳转到定义

跳转到符号的定义位置。

**参数说明**：

- `filePath`（必需）：文件路径
- `line`（必需）：行号
- `character`（必需）：列号

### 4.2 lsp_find_references - 查找引用

查找符号的所有引用位置。

**参数说明**：

- `filePath`（必需）：文件路径
- `line`（必需）：行号
- `character`（必需）：列号
- `includeDeclaration`：是否包含声明本身

### 4.3 lsp_symbols - 符号搜索

搜索文件或项目中的符号。

**参数说明**：

- `filePath`（必需）：文件路径
- `scope`：搜索范围
  - `document`：当前文件（默认）
  - `workspace`：整个项目
- `query`：搜索查询
- `limit`：结果数量限制

### 4.4 lsp_rename - 重命名符号

在整个项目中重命名符号，自动更新所有引用。

**参数说明**：

- `filePath`（必需）：文件路径
- `line`（必需）：行号
- `character`（必需）：列号
- `newName`（必需）：新的名称

### 4.5 lsp_prepare_rename - 预检重命名

在执行重命名前检查名称是否有效。

**参数说明**：

- `filePath`（必需）：文件路径
- `line`（必需）：行号
- `character`（必需）：列号

### 4.6 lsp_diagnostics - 诊断信息

获取文件的错误、警告、提示信息。

**参数说明**：

- `filePath`（必需）：文件路径
- `severity`：严重级别
  - `error`
  - `warning`
  - `information`
  - `hint`
  - `all`（默认）

## 五、Web 搜索与获取工具

### 5.1 webfetch - 获取网页内容

获取指定 URL 的内容。

**参数说明**：

- `url`（必需）：目标 URL
- `format`：返回格式
  - `markdown`（默认）
  - `text`
  - `html`
- `timeout`：超时时间（秒），最大 120

### 5.2 websearch - 通用网页搜索

使用 Exa AI 进行实时网页搜索。

**参数说明**：

- `query`（必需）：搜索查询
- `numResults`：返回结果数量，默认为 8
- `contextMaxCharacters`：上下文最大字符数
- `livecrawl`：实时爬取模式
  - `fallback`：缓存不可用时使用（默认）
  - `preferred`：优先实时爬取
- `type`：搜索类型
  - `auto`：平衡搜索（默认）
  - `fast`：快速结果
  - `deep`：深度搜索

### 5.3 google_search - Google 搜索

使用 Google Search 获取实时信息。

**参数说明**：

- `query`（必需）：搜索查询
- `thinking`：是否启用思考模式
- `urls`：要直接分析的 URL 数组

### 5.4 codesearch - 代码搜索

使用 Exa Code API 搜索编程相关的代码示例和文档。

**参数说明**：

- `query`（必需）：搜索查询
- `tokensNum`：返回的 token 数量，默认为 5000

**使用示例**：

```
搜索 React useState 的用法：
codesearch(query: "React useState hook examples", tokensNum: 5000)
```

### 5.5 grep_app_searchGitHub - GitHub 代码搜索

在 GitHub 公共仓库中搜索代码模式。

**参数说明**：

- `query`（必需）：要搜索的代码模式
- `language`：编程语言过滤
- `path`：文件路径过滤
- `repo`：仓库过滤
- `matchCase`：是否区分大小写
- `matchWholeWords`：是否全词匹配
- `useRegexp`：是否使用正则表达式

### 5.6 context7_resolve-library-id - 解析库 ID

解析包/库名称为 Context7 兼容的库 ID。

**参数说明**：

- `libraryName`（必需）：库名称
- `query`（必需）：使用场景描述

### 5.7 context7_query-docs - 查询文档

查询 Context7 文档和代码示例。

**参数说明**：

- `libraryId`（必需）：库 ID
- `query`（必需）：查询内容

## 六、其他工具

### 6.1 question - 提问用户

在执行过程中向用户提问以获取更多信息。

**参数说明**：

- `questions`（必需）：问题数组，每项包含：
  - `question`：完整问题
  - `header`：简短标签（最多30字符）
  - `options`：选项数组，每项包含：
    - `label`：显示文本
    - `description`：选项说明

**使用示例**：

```
question(questions: [
  {
    header: "Theme Choice",
    question: "Which theme do you prefer?",
    options: [
      { label: "Dark", description: "Dark mode with blue accents" },
      { label: "Light", description: "Light mode with warm tones" }
    ]
  }
])
```

### 6.2 look_at - 分析媒体文件

分析图片、PDF 等媒体文件。

**参数说明**：

- `file_path`：文件路径
- `image_data`：图像数据（Base64）
- `goal`（必需）：分析目标

### 6.3 skill - 技能调用

调用 OpenCode 内置的专门技能。

**参数说明**：

- `name`（必需）：技能名称
- `user_message`：用户消息

### 6.4 skill_mcp - MCP 服务调用

调用 MCP（Model Context Protocol）服务器操作。

**参数说明**：

- `mcp_name`（必需）：MCP 服务器名称
- `tool_name`：工具名称
- `resource_name`：资源名称
- `prompt_name`：提示名称
- `arguments`：参数
- `grep`：搜索模式

### 6.5 todowrite - 待办事项管理

创建和管理任务列表，用于跟踪复杂任务的进度。

**参数说明**：

- `todos`（必需）：待办事项数组，每项包含：
  - `content`：任务描述
  - `status`：任务状态
    - `pending`：待处理
    - `in_progress`：进行中
    - `completed`：已完成
    - `cancelled`：已取消
  - `priority`：优先级
    - `high`
    - `medium`
    - `low`

**使用示例**：

```
todowrite(todos: [
  { content: "Create user authentication system", status: "in_progress", priority: "high" },
  { content: "Add login form UI", status: "pending", priority: "medium" },
  { content: "Implement JWT token handling", status: "pending", priority: "medium" }
])
```

### 6.6 ast_grep_search - AST 模式搜索

使用 AST（抽象语法树）感知的方式搜索代码模式。

**参数说明**：

- `pattern`（必需）：搜索模式
- `lang`（必需）：编程语言
- `paths`：搜索路径
- `globs`：文件过滤模式
- `context`：上下文行数

### 6.7 ast_grep_replace - AST 模式替换

使用 AST 感知的方式替换代码模式。

**参数说明**：

- `pattern`（必需）：搜索模式
- `rewrite`（必需）：替换内容
- `lang`（必需）：编程语言
- `paths`：搜索路径
- `globs`：文件过滤模式
- `dryRun`：是否仅预览

## 七、内置命令

OpenCode 提供以下内置命令，可通过斜杠前缀调用。

### 7.1 /init-deep

初始化分层 AGENTS.md 知识库。

### 7.2 /ralph-loop

启动自引用开发循环，持续执行直到完成。

### 7.3 /ulw-loop

启动 UltraWork 循环，持续执行直到完成（UltraWork 模式）。

### 7.4 /cancel-ralph

取消当前活跃的 Ralph 循环。

### 7.5 /refactor

智能重构命令，提供 LSP、AST-grep、架构分析、代码映射和 TDD 验证。

### 7.6 /start-work

从 Prometheus 计划启动 Sisyphus 工作会话。

### 7.7 /stop-continuation

停止所有延续机制（Ralph 循环、待办事项延续、任务），用于当前会话。

### 7.8 /handoff

创建详细的上下文摘要，以便在新会话中继续工作。

## 八、技能说明

OpenCode 提供以下内置技能，可通过 `skill` 工具或 `task` 的 `load_skills` 参数使用。

### 8.1 playwright

浏览器自动化技能，用于浏览器相关的验证、浏览、信息抓取、测试和截图。

**触发场景**：

- 浏览器自动化任务
- 截图
- 网站测试

### 8.2 frontend-ui-ux

前端 UI/UX 设计技能，设计师出身的开发者，即使没有设计稿也能创建美观的界面。

**适用场景**：

- 前端开发
- UI 设计
- 样式调整
- 动画实现

### 8.3 git-master

Git 操作技能，处理所有 Git 相关操作。

**触发场景**：

- 提交代码
- 变基（rebase）
- 压缩（squash）
- 查找代码作者
- 查找特定提交

**使用示例**：

```
task(category: "quick", load_skills: ["git-master"], prompt: "Create a commit with all changed files.")
```

### 8.4 dev-browser

浏览器自动化技能，使用持久化页面状态进行浏览器交互。

**触发场景**：

- 导航到指定 URL
- 点击元素
- 填写表单
- 截图
- 抓取网页数据
- 测试 Web 应用
- 登录操作

## 九、Shadcn UI 工具

OpenCode 提供了一系列 Shadcn UI 组件相关的工具。

### 9.1 shadcn_get_project_registries

获取 components.json 中配置的注册表名称。

### 9.2 shadcn_list_items_in_registries

列出注册表中的项目。

**参数说明**：

- `registries`（必需）：注册表名称数组
- `offset`：分页偏移
- `limit`：返回数量限制

### 9.3 shadcn_search_items_in_registries

在注册表中搜索组件。

**参数说明**：

- `registries`（必需）：注册表名称数组
- `query`（必需）：搜索查询

### 9.4 shadcn_view_items_in_registries

查看特定注册表项目的详细信息。

**参数说明**：

- `items`（必需）：项目名称数组

### 9.5 shadcn_get_item_examples_from_registries

获取组件的使用示例和演示代码。

**参数说明**：

- `registries`（必需）：注册表名称数组
- `query`（必需）：搜索查询

### 9.6 shadcn_get_add_command_for_items

获取添加组件的 shadcn CLI 命令。

**参数说明**：

- `items`（必需）：组件名称数组

### 9.7 shadcn_get_audit_checklist

创建新组件后的验证清单，确保一切正常。

## 十、后台任务管理

### 10.1 background_output - 获取后台任务输出

获取后台运行任务的输出结果。

**参数说明**：

- `task_id`（必需）：任务ID
- `block`：是否阻塞等待
- `full_session`：是否获取完整会话
- `include_thinking`：是否包含思考过程
- `include_tool_results`：是否包含工具结果
- `message_limit`：消息数量限制

### 10.2 background_cancel - 取消后台任务

取消正在运行的后台任务。

**参数说明**：

- `taskId`：特定任务ID
- `all`：是否取消所有任务（谨慎使用）

**重要提示**：当 Oracle 任务正在运行时，切勿使用 `all: true`，应取消特定任务。

## 十一、工作流程最佳实践

### 11.1 任务委托原则

1. **适度委托**：简单任务自行处理，复杂任务委托给专业 Agent
2. **提供上下文**：委托时包含足够的背景信息
3. **使用会话**：多轮对话时使用 `session_id` 保持上下文
4. **指定技能**：根据任务类型加载相应技能

### 11.2 搜索策略

1. **精确搜索**：已知具体内容时使用 `grep`
2. **模式搜索**：未知位置时使用 `glob`
3. **代码理解**：需要理解代码结构时使用 `explore`
4. **外部参考**：需要文档或最佳实践时使用 `librarian`

### 11.3 编辑策略

1. **先读后写**：编辑前先读取文件内容
2. **小步修改**：每次修改聚焦单一目标
3. **验证修改**：修改后运行诊断确保无错误

### 11.4 并行执行

独立的任务应并行执行以提高效率：

```
同时搜索多个文件：
grep(pattern: "TODO", path: "src/")
grep(pattern: "FIXME", path: "src/")
glob(pattern: "**/*.test.ts")
```

## 十二、常见使用场景

### 12.1 代码审查

```
使用 lsp 工具检查代码质量：
lsp_diagnostics(filePath: "/path/to/file.ts")
lsp_symbols(filePath: "/path/to/file.ts", scope: "document")
```

### 12.2 重构

```
1. 搜索要重构的代码模式：
ast_grep_search(pattern: "console.log($MSG)", lang: "typescript")

2. 预览替换结果：
ast_grep_replace(pattern: "console.log($MSG)", rewrite: "logger.info($MSG)", lang: "typescript", dryRun: true)

3. 确认后执行替换：
ast_grep_replace(pattern: "console.log($MSG)", rewrite: "logger.info($MSG)", lang: "typescript")
```

### 12.3 外部库调研

```
1. 解析库信息：
context7_resolve-library-id(libraryName: "react", query: "state management")

2. 查询具体用法：
context7_query-docs(libraryId: "/facebook/react", query: "useState hook best practices")
```

---

本文档会持续更新，如有问题请查阅 OpenCode 官方文档。
