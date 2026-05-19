# OpenClaw 核心模块

## 1. Agent Loop（Agent 循环）

Agent Loop 是 OpenClaw 处理用户请求的核心流程：

```
用户消息
   ↓
agent RPC (validate + resolve session)
   ↓
agentCommand (resolve model + load skills)
   ↓
runEmbeddedPiAgent (pi-agent-core 运行时)
   ↓
subscribeEmbeddedPiSession (桥接事件)
   ↓
流式输出 (assistant deltas / tool events / lifecycle)
```

**关键机制：**
- 每个 session 的 runs 是**序列化**的（通过 per-session + global queue）
- Transcript 写入受 session write lock 保护
- 支持 `agent.wait` 等待 lifecycle end/error

## 2. Session 管理

```typescript
// Session Key 格式
agent:<agentId>:<mainKey>

// 例子
agent:pm-agent:main        // pm-agent 的主会话
agent:arch-agent:session1  // arch-agent 的特定会话
```

**Session 状态：**
- transcript（对话历史）
- routing state
- write lock（进程感知 + 文件锁）

## 3. Binding 路由

Bindings 决定消息流向哪个 Agent：

```typescript
// 优先级：peer > guildId+roles > guildId > accountId > channel > default
const bindings: Binding[] = [
  {
    agentId: "pm-agent",
    match: { channel: "feishu", accountId: "cli_a9731247d5f8dbdb" }
  },
  {
    agentId: "arch-agent",
    match: { channel: "feishu", accountId: "cli_a9730b2841f91bd4" }
  }
]
```

## 4. Skill 系统

Skill 是可复用的工具/行为模块：

```typescript
// Skill 定义
{
  name: "browser-automation",
  description: "浏览器自动化",
  location: "~/.openclaw/plugin-skills/browser-automation/SKILL.md"
}
```

**加载路径：**
- 每个 agent 的 workspace
- 共享路径：`~/.openclaw/skills`
- 按 `agents.list[].skills` allowlist 过滤

## 5. Memory 系统

### 5.1 Dreams（后台记忆整合）

三个合作阶段：

| Phase | 目的 | 持久化 |
|-------|------|--------|
| Light | 排序和暂存短期材料 | 无 |
| Deep | 评分并提升持久候选项 | `MEMORY.md` |
| REM | 反思主题和重复模式 | 无 |

### 5.2 QMD 格式

结构化记忆格式：

```
# MEMORY.md

## Q (Questions)
- 用户偏好什么？
- 项目当前状态？

## M (Memory)
- 2026-05-11：完成 IDENTITY.md 重写
- 用户偏好直接高效的沟通风格

## D (Decisions)
- 采用 RICE 优先级排序
- 使用 SOP 标准化流程
```

### 5.3 向量搜索

```typescript
memorySearch: {
  qmd: {
    extraCollections: [{ path: "~/agents/family/sessions", name: "family-sessions" }]
  }
}
```

## 6. 工具系统

### 6.1 内置工具（40+）

| 类别 | 工具 |
|------|------|
| 文件 | read / write / edit |
| 执行 | exec / cron |
| 通信 | message / feishu_* |
| 媒体 | image / image_generate / tts / music_generate |
| Web | browser / web_fetch / web_search |
| Agent | sessions_spawn / sessions_send / subagents |

### 6.2 工具策略

```typescript
// per-agent 工具限制
{
  id: "family",
  tools: {
    allow: ["read", "sessions_list"],
    deny: ["write", "exec", "browser"]
  }
}
```

## 7. Channel 系统

### 7.1 飞书（Feishu）

```typescript
channels: {
  feishu: {
    enabled: true,
    appId: "cli_xxx",
    appSecret: "xxx",
    connectionMode: "websocket",  // or "polling"
    accounts: {
      "pm-agent": {
        dmPolicy: "allowlist",
        allowFrom: ["ou_xxx"]
      }
    }
  }
}
```

### 7.2 多账号路由

```typescript
bindings: [
  { agentId: "pm-agent", match: { channel: "feishu", accountId: "cli_a9731247d5f8dbdb" } },
  { agentId: "arch-agent", match: { channel: "feishu", accountId: "cli_a9730b2841f91bd4" } }
]
```

## 8. 配置结构

```json
{
  "gateway": {
    "mode": "local",
    "port": 18780,
    "bind": "lan"
  },
  "agents": {
    "defaults": {
      "workspace": "/path/to/default/workspace",
      "model": { "primary": "minimax-portal/MiniMax-M2.7" }
    },
    "list": [
      { "id": "pm-agent", "workspace": "/path/to/pm-agent-workspace" }
    ]
  },
  "channels": {
    "feishu": { "enabled": true }
  },
  "bindings": [
    { "type": "route", "agentId": "pm-agent", "match": { "channel": "feishu" } }
  ]
}
```

## 9. Canvas 系统

Canvas 允许 Agent 编辑 HTML/CSS/JS：

```
/__openclaw__/canvas/          # Agent 可编辑的静态文件
/__openclaw__/a2ui/            # A2UI host
```

Agent 通过 `canvas` 工具操作：
- `canvas present` — 展示内容
- `canvas eval` — 执行 JS

## 10. 子 Agent 调度

OpenClaw 支持派生子 Agent：

```typescript
// sessions_spawn 启动子 agent
const subAgent = await sessions_spawn({
  task: "分析这个需求的可行性",
  runtime: "subagent",
  agentId: "arch-agent"
})

// sessions_send 发送任务
await sessions_send(subAgent.sessionKey, "请评审以下技术方案...")
```

**与 Claude Code 的对比：**

| 特性 | OpenClaw | Claude Code |
|------|----------|-------------|
| 子 Agent 类型 | `sessions_spawn` | `LocalAgentTask` / `RemoteAgentTask` |
| 隔离方式 | 独立 session | 独立进程 |
| 通信方式 | `sessions_send` | XML Notification |
| 后台任务 | `sessions_spawn` | `DreamTask` |
