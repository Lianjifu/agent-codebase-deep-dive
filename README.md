# LLM Agent 源码学习

> 四强对决：Claude Code · OpenClaw · Hermes Agent · OpenHuman  
> 学习周期：5 天 · 文档数：41+ 篇 · 驱动工具：PM Agent + OpenClaw

对四个主流开源 AI Agent 框架的深度分析和架构拆解，从源码层面理解其设计思想，提炼可复用于自有 Agent 系统的设计模式。

---

## 目录

- [项目背景](#项目背景)
- [章节概览](#章节概览)
- [各章详细内容](#各章详细内容)
- [学习路线](#学习路线)
- [项目结构](#项目结构)
- [构建与使用](#构建与使用)
- [技术栈](#技术栈)

---

## 项目背景

大语言模型（LLM）Agent 是当前 AI 工程化的前沿方向。本项目选取四个代表性开源项目，从源码出发系统学习其架构设计：

| 项目 | 定位 | 语言 | 核心特色 |
|------|------|:----:|----------|
| **Claude Code** | 生产级 CLI Agent | TypeScript | 深度工具集成、MCP 协议、权限安全模型 |
| **OpenClaw** | 多 Agent Gateway | TypeScript | WebSocket 网关、Agent 隔离、Binding 路由 |
| **Hermes Agent** | 多模态 Agent | Python | 多模态输入输出、通用工具扩展 |
| **OpenHuman** | 人机协作 Agent | TypeScript | Human-in-the-Loop 审批、跨 Agent 互操作 |

> Claude Code 是已开源的生产级代码，源码约 **500K+** 行，是学习的核心；其余三个为社区项目，各具独特设计亮点。

---

## 章节概览

| 章节 | 框架 | 文档数 | 状态 | 内容概要 |
|:----:|------|:------:|:----:|----------|
| **第 1 章** | Claude Code 深度解析 | 27 篇 + 2 附录 | ✅ 完成 | 从启动流程到哲学思想的全链路源码分析 |
| **第 2 章** | OpenClaw 架构学习 | 4 篇 | ✅ 完成 | Gateway 架构、多 Agent 隔离、源码阅读链路 |
| **第 3 章** | Hermes Agent 多模态 | 3 篇 | 📋 框架预设 | 多模态设计、工具系统扩展 |
| **第 4 章** | OpenHuman 开放接口 | 3 篇 | 📋 框架预设 | Human-in-the-Loop、Agent 互操作 |
| **第 5 章** | 共性模式提炼 | 4 篇 | 📋 持续提炼 | 跨框架对比、可复用设计模式 |

---

## 各章详细内容

### 第 1 章：Claude Code 深度解析

从 TypeScript 源码出发，逐层拆解 Claude Code 的内部架构，共 25 篇专题 + 2 篇附录。

| # | 文档 | 核心内容 |
|:-:|------|----------|
| 1.0 | 全景概览 | Claude Code 能力全景 / 六层架构总览 |
| 2.0 | 启动流程 | 入口点 / 并行预取 / Feature Flag / init 流程 |
| 3.0 | 类型系统设计 | TypeScript 类型设计 / 泛型约束 / 类型推断 |
| 4.0 | 查询引擎 | QueryEngine / query 循环 / 上下文压缩 |
| 5.0 | 消息系统 | 消息格式 / 角色定义 / 消息队列 |
| 6.0 | 流式处理 | 流式输出 / Server-Sent Events / 增量解析 |
| 7.0 | 工具架构 | 工具注册 / 架构设计 / MCP 集成 |
| 8.0 | 内置工具 | 内置工具集 / Tool 定义 / 安全边界 |
| 9.0 | 工具执行 | 工具执行流程 / 沙箱隔离 / 错误处理 |
| 10.0 | Agent 模型 | Agent 模型 / 决策循环 / 状态机 |
| 11.0 | 子代理 | 子代理机制 / Spawn / 生命周期管理 |
| 12.0 | 技能系统 | Skill 注册 / 指令集 / 动态加载 |
| 13.0 | 权限模型 | 权限体系 / 安全模型 / 审批流程 |
| 14.0 | Bash 安全 | Bash 执行 / 安全策略 / 输入验证 |
| 15.0 | MCP 协议 | MCP 协议 / JSON-RPC / 传输层 |
| 16.0 | MCP 认证 | OAuth 认证 / XAA 跨账户 / Token 管理 |
| 17.0 | 状态管理 | Store / AppState / useSyncExternalStore |
| 18.0 | 会话管理 | Transcript 持久化 / Auto Compact / Snip 压缩 |
| 19.0 | Ink React | Ink 组件 / React 集成 / render() 实现 |
| 20.0 | REPL | REPL 模式 / 命令解析 / 会话循环 |
| 21.0 | 性能优化 | 启动优化 / Token 预算 / 并发控制 |
| 22.0 | 测试 | Vitest / 模拟策略 / 集成测试 |
| 23.0 | 构建系统 | Bun 运行时 / 打包策略 / 发布流程 |
| 24.0 | 设计模式 | 依赖注入 / 失败关闭 / Generator 流水线 |
| 25.0 | 哲学思想 | 安全优先 / 可扩展性 / 渐进式复杂性 |
| 26.0 | 认知循环 | 感知-行动循环 / 工具链编排 / 策略梯度 |
| 附录 A | 术语表 | 关键概念定义 |
| 附录 B | 源码导航 | 功能分类源码索引 |

### 第 2 章：OpenClaw 架构学习

| 文档 | 核心内容 |
|------|----------|
| 概述 | 技术栈 / Gateway 架构 / 核心概念 |
| 架构设计 | 系统架构图 / 组件详解 |
| 核心模块 | Agent Loop / Session / Binding / Tool |
| 源码学习 | 源码阅读顺序 / 关键调用链 / 可复用模式 |

### 第 3 章：Hermes Agent 多模态

| 文档 | 核心内容 |
|------|----------|
| 概述 | 项目状态 / 预期方向 |
| 多模态设计 | 模态融合 / 输出处理 |
| 工具系统 | 工具注册 / 执行流程 |

### 第 4 章：OpenHuman 开放接口

| 文档 | 核心内容 |
|------|----------|
| 概述 | 项目状态 / 预期方向 |
| Human 接口 | 审批流程 / 触发条件 |
| 互操作性 | Agent 通信协议 / 权限传递 |

### 第 5 章：共性模式提炼

| 文档 | 核心内容 |
|------|----------|
| Task 系统对比 | 四框架 Task 类型对比 |
| Coordinator 模式 | 协调者职责 / Continue vs Spawn |
| Context 压缩 | Auto Compact / 压缩策略对比 |
| PM Agent 设计 | Task 类型 / Query Loop / Feature Flags |

---

## 学习路线

```
Day 1 ── Claude Code 源码解析（27 篇）
         ├── 基础架构（01-06）：全景 → 启动 → 类型 → 查询 → 消息 → 流式
         ├── 工具系统（07-09）：架构 → 内置 → 执行
         ├── Agent 核心（10-16）：模型 → 子代理 → 技能 → 权限 → 安全 → MCP
         ├── 应用层  （17-20）：状态 → 会话 → Ink → REPL
         ├── 工程     （21-23）：性能 → 测试 → 构建
         └── 总结     （24-26）：设计模式 → 哲学 → 认知循环

Day 2 ── OpenClaw 架构学习（4 篇）

Day 3 ── Hermes Agent 多模态（3 篇）

Day 4 ── OpenHuman 开放接口（3 篇）

Day 5 ── 共性模式提炼（4 篇）
```

---

## 项目结构

```
├── CLAUDE-CODE/       # 第 1 章 — 27 篇 + 2 附录，按编号组织
│   ├── 01-OVERVIEW.md .. 26-COGNITIVE-LOOP.md
│   ├── APPENDIX-A-GLOSSARY.md
│   ├── APPENDIX-B-SOURCE-MAP.md
│   └── _sidebar.md
├── OPENCLAW/          # 第 2 章 — 4 篇
├── HERMES/            # 第 3 章 — 3 篇
├── OPENHUMAN/         # 第 4 章 — 3 篇
├── PATTERNS/          # 第 5 章 — 4 篇
├── agent-studies/     # 学习计划文档
├── build-html.js      # Markdown → HTML 构建脚本
├── template.html      # 单文件 HTML 模板（~44KB，CSS/JS 内联）
├── _sidebar.md        # 全局侧边栏导航
├── _coverpage.md      # 首页源文件
├── SUMMARY.md         # 完整目录结构
├── mermaid.min.js      # Mermaid 图表渲染库
├── rebuild_ch26_content.js  # 第 26 章内容同步脚本
└── html/              # 构建输出目录
```

---

## 构建与使用

```bash
# 安装依赖
npm install

# 构建 HTML
npm run build        # 相当于 node build-html.js

# 输出位置
open html/index.html  # 在浏览器中查看
```

构建脚本会自动：
- 扫描所有目录（排除 `node_modules/` 和 `html/`）
- 将 Markdown 渲染为 HTML 并注入模板
- 生成侧边栏导航（支持章节折叠）
- 生成全文搜索索引 `search-index.json`
- 清理无对应源文件的残留 HTML
- 处理 Mermaid 图表转义与渲染
- 处理思考笔记、引导思考折叠卡片等特殊格式

---

## 技术栈

| 层面 | 技术 |
|------|------|
| 文档格式 | Markdown（GitBook 约定） |
| 渲染引擎 | marked 18.x |
| 图表 | Mermaid.js |
| 模板 | 单文件 HTML（纯 CSS + 原生 JS） |
| 构建 | Node.js 零依赖脚本 |
| 搜索 | 客户端全文搜索（构建时索引） |
| 侧边栏 | 自定义 GitBook 风格折叠式导航 |
