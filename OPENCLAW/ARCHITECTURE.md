# OpenClaw 架构设计

## 系统架构图

```
┌──────────────────────────────────────────────────────┐
│                   Gateway (daemon)                    │
│                                                      │
│  ┌────────────┐    ┌─────────────┐   ┌──────────┐ │
│  │  Channel   │    │   WebSocket  │   │   HTTP   │ │
│  │  Adapters  │    │    Server    │   │  Server  │ │
│  │  (Feishu,  │    │  (req/res/   │   │ /canvas/ │ │
│  │   TG, WA)  │    │   events)    │   │ /a2ui/   │ │
│  └────────────┘    └──────────────┘   └──────────┘ │
│         │                  │                      │
│         └──────────────────┼──────────────────────┤
│                            ▼                       │
│                   ┌─────────────────┐              │
│                   │   Agent Router  │              │
│                   │  (bindings)    │              │
│                   └────────┬────────┘              │
│                            │                       │
│     ┌──────────────────────┼──────────────────┐   │
│     ▼                      ▼                  ▼   │
│  ┌──────┐            ┌──────────┐       ┌──────┐ │
│  │main  │            │arch-agent│       │pm-   │ │
│  │agent │            │          │       │agent │ │
│  └──┬───┘            └────┬─────┘       └──┬───┘ │
│     │                     │                 │     │
│  workspace             workspace          workspace │
│     │                     │                 │     │
│     └─────────────────────┼─────────────────┘     │
│                           ▼                         │
│              ┌──────────────────────┐              │
│              │  pi-agent-core       │              │
│              │  (嵌入式 Agent 运行时)  │              │
│              └──────────────────────┘              │
│                           │                       │
│                           ▼                       │
│              ┌──────────────────────┐              │
│              │   memory-core        │              │
│              │  (Dreams / QMD)      │              │
│              └──────────────────────┘              │
└────────────────────────────────────────────────────┘
```

## 核心组件

### 1. Gateway (daemon)

- 单一长生命周期进程
- 拥有所有渠道连接（WhatsApp/Telegram等）
- 暴露 WebSocket API（请求/响应/事件帧）
- JSON Schema 验证入站帧
- 事件类型：`agent` / `chat` / `presence` / `health` / `heartbeat` / `cron`

### 2. Channel Adapters

每个渠道一个适配器：
- Feishu（飞书）
- Telegram
- WhatsApp（via Baileys）
- Discord
- Signal
- iMessage
- Mattermost / Slack / Teams 等

### 3. WebSocket Protocol

```
Client → Gateway: {type:"req", id, method, params}
Gateway → Client: {type:"res", id, ok, payload|error}

Gateway → Client: {type:"event", event, payload, seq?, stateVersion?}
```

**关键特性：**
- 首帧必须是 `connect`
- 幂等键（idempotency keys）用于 `send` / `agent` 方法
- Shared-secret / Tailscale / trusted-proxy 多种认证模式

### 4. Agent Router (Bindings)

```typescript
// 路由优先级：最具体优先
type Binding = {
  agentId: string
  match: {
    channel: string           // e.g. "feishu"
    accountId?: string        // e.g. "work"
    peer?: {                 // DM or group
      kind: "direct" | "group"
      id: string
    }
    guildId?: string          // Discord
    roles?: string[]          // Discord roles
  }
}
```

### 5. pi-agent-core (Agent Runtime)

嵌入式 Agent 运行时，OpenClaw 的"大脑"：
- 模型调用（支持多 provider）
- 工具执行
- Session 管理
- Transcript 写入
- 上下文压缩

### 6. memory-core (记忆系统)

| 组件 | 功能 |
|------|------|
| Dreams | 后台记忆整合（Light / Deep / REM 三阶段） |
| QMD | 结构化记忆格式（Question/Memory/Decision） |
| 向量搜索 | session transcript 语义检索 |

## 多 Agent 隔离

每个 Agent 有独立的：
- **Workspace**（文件、AGENTS.md、SOUL.md、USER.md）
- **agentDir**（auth profiles、model registry、per-agent 配置）
- **Session Store**（chat history + routing state）

```
~/.openclaw/
├── agents/
│   ├── main/
│   │   ├── agent/          # agentDir
│   │   └── sessions/        # session store
│   ├── arch-agent/
│   │   ├── agent/
│   │   └── sessions/
│   └── pm-agent/
│       ├── agent/
│       └── sessions/
├── credentials/              # channel auth
└── workspace/               # main workspace
```

## 工具调用链

```
用户消息
  ↓
Gateway 接收（WebSocket / Channel Adapter）
  ↓
Binding 路由 → Agent
  ↓
pi-agent-core: prompt assembly + model inference
  ↓
工具执行（40+ 内置工具 + skill 工具）
  ↓
结果流式返回 → Gateway
  ↓
Channel Adapter → 用户
```

## 相关文档

- Gateway Protocol（详见 OpenClaw 官方文档）
- Multi-agent Routing（详见 OpenClaw 官方文档）
- Agent Loop（详见 [OpenClaw 核心模块](./CORE)）
- Dreaming（详见 OpenClaw 官方文档）
- Memory（详见 OpenClaw 官方文档）
