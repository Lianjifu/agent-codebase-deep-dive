# 目录结构

## 整体结构

```
LLM Agent 源码学习/
├── README.md          # 首页
├── SUMMARY.md         # 本页
├── _sidebar.md        # 全局侧边栏
├── _coverpage.md     # 封面页
│
├── CLAUDE-CODE/      # Claude Code 深度解析（Day 1）✅
│   ├── _sidebar.md
│   ├── 01-OVERVIEW.md
│   ├── 02-HOOKIFY.md
│   ├── 03-AGENT-DEV.md
│   ├── 04-REAL-SOURCE.md
│   ├── 05-SOURCEMAP.md
│   └── 06-SUMMARY.md
│
├── OPENCLAW/         # OpenClaw 架构学习（Day 2）⏳
│   ├── _sidebar.md
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── CORE.md
│   └── SOURCE-CODE.md
│
├── HERMES/           # Hermes Agent 多模态（Day 3）📋
│   ├── _sidebar.md
│   ├── README.md
│   ├── MULTIMODAL.md
│   └── TOOLS.md
│
├── OPENHUMAN/        # OpenHuman 开放接口（Day 4）📋
│   ├── _sidebar.md
│   ├── README.md
│   ├── HUMAN-INTERFACE.md
│   └── INTEROP.md
│
└── PATTERNS/         # 共性模式提炼（Day 5）📋
    ├── _sidebar.md
    ├── README.md
    ├── TASK-SYSTEM.md
    ├── COORDINATOR.md
    ├── CONTEXT-COMPACT.md
    └── PM-AGENT.md
```

## 学习进度

| 日期 | Agent | 状态 | 文档数 |
|------|-------|------|--------|
| Day 1 | Claude Code | ✅ 完成 | 27 篇 |
| Day 2 | OpenClaw | ⏳ 进行中 | 4 篇 |
| Day 3 | Hermes Agent | 📋 待开始 | 3 篇 |
| Day 4 | OpenHuman | 📋 待开始 | 3 篇 |
| Day 5 | 综合总结 | 📋 待开始 | 5 篇 |

## 文档清单

### Claude Code（23 篇）

| 文档 | 内容 |
|------|------|
| [01-OVERVIEW](./CLAUDE-CODE/01-OVERVIEW) | Claude Code 简介 / 全景概览 / 基本用法 |
| [02-BOOTSTRAP](./CLAUDE-CODE/02-BOOTSTRAP) | 入口点 / 并行预取 / Feature Flag / init 流程 |
| [03-TYPE-SYSTEM](./CLAUDE-CODE/03-TYPE-SYSTEM) | TypeScript 类型设计 / 泛型约束 / 类型推断 |
| [04-QUERY-ENGINE](./CLAUDE-CODE/04-QUERY-ENGINE) | QueryEngine / query 循环 / 上下文压缩 |
| [05-MESSAGE-SYSTEM](./CLAUDE-CODE/05-MESSAGE-SYSTEM) | 消息格式 / 角色定义 / 消息队列 |
| [06-STREAMING](./CLAUDE-CODE/06-STREAMING) | 流式输出 / Server-Sent Events / 增量解析 |
| [07-TOOL-ARCHITECTURE](./CLAUDE-CODE/07-TOOL-ARCHITECTURE) | 工具注册 / 架构设计 / MCP 集成 |
| [08-BUILTIN-TOOLS](./CLAUDE-CODE/08-BUILTIN-TOOLS) | 内置工具集 / Tool 定义 / 安全边界 |
| [09-TOOL-EXECUTION](./CLAUDE-CODE/09-TOOL-EXECUTION) | 工具执行流程 / 沙箱隔离 / 错误处理 |
| [10-AGENT-MODEL](./CLAUDE-CODE/10-AGENT-MODEL) | Agent 模型 / 决策循环 / 状态机 |
| [11-SUBAGENT](./CLAUDE-CODE/11-SUBAGENT) | 子代理机制 / Spawn / 生命周期管理 |
| [12-SKILL-SYSTEM](./CLAUDE-CODE/12-SKILL-SYSTEM) | Skill 注册 / 指令集 / 动态加载 |
| [13-PERMISSION-MODEL](./CLAUDE-CODE/13-PERMISSION-MODEL) | 权限体系 / 安全模型 / 审批流程 |
| [14-BASH-SECURITY](./CLAUDE-CODE/14-BASH-SECURITY) | Bash 执行 / 安全策略 / 输入验证 |
| [15-MCP-PROTOCOL](./CLAUDE-CODE/15-MCP-PROTOCOL) | MCP 协议 / JSON-RPC / 传输层 |
| [16-MCP-AUTH](./CLAUDE-CODE/16-MCP-AUTH) | OAuth 认证 / XAA 跨账户 / Token 管理 |
| [17-STATE-MANAGEMENT](./CLAUDE-CODE/17-STATE-MANAGEMENT) | Store / AppState / useSyncExternalStore / React Compiler |
| [18-CONVERSATION](./CLAUDE-CODE/18-CONVERSATION) | Transcript 持久化 / Auto Compact / Snip 压缩 |
| [19-INK-REACT](./CLAUDE-CODE/19-INK-REACT) | Ink 组件 / React 集成 / render() 实现 |
| [20-REPL](./CLAUDE-CODE/20-REPL) | REPL 模式 / 命令解析 / 会话循环 |
| [21-PERFORMANCE](./CLAUDE-CODE/21-PERFORMANCE) | 启动优化 / Token 预算 / 并发控制 |
| [22-TESTING](./CLAUDE-CODE/22-TESTING) | Vitest / 模拟策略 / 集成测试 |
| [23-BUILD-SYSTEM](./CLAUDE-CODE/23-BUILD-SYSTEM) | Bun 运行时 / 打包策略 / 发布流程 |
| [24-DESIGN-PATTERNS](./CLAUDE-CODE/24-DESIGN-PATTERNS) | 依赖注入 / 失败关闭 / Generator 流水线 |
| [25-PHILOSOPHY](./CLAUDE-CODE/25-PHILOSOPHY) | 安全优先 / 可扩展性 / 渐进式复杂性 |
| [附录A-GLOSSARY](./CLAUDE-CODE/APPENDIX-A-GLOSSARY) | 术语表 / 关键概念定义 |
| [附录B-SOURCE-MAP](./CLAUDE-CODE/APPENDIX-B-SOURCE-MAP) | 源码导航 / 功能分类索引 |

### OpenClaw（4 篇）

| 文档 | 内容 |
|------|------|
| [概述](./OPENCLAW/README) | 技术栈 / Gateway 架构 / 核心概念 |
| [架构设计](./OPENCLAW/ARCHITECTURE) | 系统架构图 / 组件详解 |
| [核心模块](./OPENCLAW/CORE) | Agent Loop / Session / Binding / Tool |
| [源码学习](./OPENCLAW/SOURCE-CODE) | 源码阅读顺序 / 关键调用链 / 可复用模式 |

### Hermes Agent（3 篇）

| 文档 | 内容 |
|------|------|
| [概述](./HERMES/README) | 项目状态 / 预期方向 |
| [多模态设计](./HERMES/MULTIMODAL) | 模态融合 / 输出处理 |
| [工具系统](./HERMES/TOOLS) | 工具注册 / 执行流程 |

### OpenHuman（3 篇）

| 文档 | 内容 |
|------|------|
| [概述](./OPENHUMAN/README) | 项目状态 / 预期方向 |
| [Human 接口](./OPENHUMAN/HUMAN-INTERFACE) | 审批流程 / 触发条件 |
| [互操作性](./OPENHUMAN/INTEROP) | Agent 通信协议 / 权限传递 |

### 共性模式（5 篇）

| 文档 | 内容 |
|------|------|
| [Task 系统对比](./PATTERNS/TASK-SYSTEM) | 四框架 Task 类型对比 |
| [Coordinator 模式](./PATTERNS/COORDINATOR) | 协调者职责 / Continue vs Spawn |
| [Context 压缩](./PATTERNS/CONTEXT-COMPACT) | Auto Compact / 压缩策略 |
| [PM Agent 设计](./PATTERNS/PM-AGENT) | Task 类型 / Query Loop / Feature Flags |
