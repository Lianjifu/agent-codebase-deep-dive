# OpenClaw 概述

> 开源 AI Agent 框架，支持多渠道接入、多 Agent 隔离、背景记忆整合

## 核心定位

OpenClaw 是一个自托管的 AI Agent 运行时，同时支持：
- **多渠道消息**（飞书、Telegram、WhatsApp、Discord 等）
- **多 Agent 隔离**（每个 Agent 有独立 workspace、auth、session）
- **WebSocket Gateway**（统一的消息总线）
- **记忆整合**（Dreaming 后台记忆系统）
- **工具生态**（40+ 内置工具 + 自定义 skill）

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Node.js |
| 协议 | WebSocket（Gateway RPC） |
| 渠道 | 飞书 / Telegram / WhatsApp / Discord / Signal 等 |
| 记忆 | memory-core（Dreams / QMD / 向量搜索） |
| Agent 核 | pi-agent-core（嵌入式） |

## Gateway 架构

```
用户 ──► 渠道（飞书/TG/WA/Discord）
           │
           ▼
     ┌─────────────┐
     │   Gateway   │  ← WebSocket 长连接，消息总线
     │  (daemon)   │
     └──────┬──────┘
            │
     ┌──────┼─────────┐
     ▼      ▼         ▼
  Agent   Agent    Agent
   main   arch    pm-agent
  (workspace) (workspace) (workspace)
```

**Gateway 职责：**
- 维护所有渠道连接（WhatsApp/Telegram等）
- 管理 WebSocket 协议（请求/响应/事件）
- 路由消息到对应 Agent（通过 bindings）
- 提供 Canvas 和 Control UI HTTP 服务

## 核心概念

| 概念 | 说明 |
|------|------|
| `agentId` | 一个独立的大脑（workspace + auth + session） |
| `accountId` | 一个渠道账号实例（如两个 WhatsApp 号） |
| `binding` | 路由规则：`channel + account + peer` → `agentId` |
| `session` | 对话会话，带有 transcript 和状态 |
| `skill` | 可复用的工具/行为模块 |

## 多 Agent 路由

Bindings 是**确定性匹配，最具体优先**：

```
peer match → guildId + roles → guildId → accountId → channel → default agent
```

## 相关文档

- [架构设计](./ARCHITECTURE)
- [核心模块](./CORE)
