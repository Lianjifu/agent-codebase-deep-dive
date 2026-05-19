# OpenClaw 源码学习

> 目标：把 OpenClaw 从“架构图”落到“源码入口、关键函数、调用链、可复用设计模式”。

## 1. 阅读主线

OpenClaw 的源码阅读不适合从工具或模型调用开始，而应先抓住 Gateway 这条主线：

```
配置加载
  ↓
Gateway daemon 启动
  ↓
Channel Adapter 建立连接
  ↓
WebSocket Protocol 接入控制端 / Agent client
  ↓
Binding Router 决定 agentId
  ↓
Agent RPC 解析 session
  ↓
agentCommand 组装模型、工具、技能、上下文
  ↓
runEmbeddedPiAgent 启动嵌入式 agent runtime
  ↓
subscribeEmbeddedPiSession 桥接增量事件
  ↓
Gateway 把输出回写到渠道
```

这一条链路回答三个核心问题：

| 问题 | 对应源码关注点 |
|------|----------------|
| 用户消息从哪里进来？ | Channel Adapter / WebSocket req-event 协议 |
| 消息被分给哪个 Agent？ | Binding Router / accountId / peer / guildId 匹配 |
| Agent 如何真正跑起来？ | agent RPC / session queue / pi-agent-core 嵌入式运行时 |

## 2. 源码阅读顺序

### 2.1 先读配置模型

配置决定 OpenClaw 的运行形态，建议先找这些关键词：

```bash
rg "gateway" .
rg "agents" .
rg "bindings" .
rg "channels" .
rg "agentId" .
```

重点看：

- `gateway.mode`：本地、局域网、远程部署模式
- `gateway.port` / `gateway.bind`：Gateway HTTP + WebSocket 暴露方式
- `agents.defaults`：默认 workspace、model、tool policy
- `agents.list[]`：每个 Agent 的隔离配置
- `channels.*`：飞书、Telegram、WhatsApp 等渠道配置
- `bindings[]`：渠道消息到 Agent 的确定性路由规则

配置层的价值在于：OpenClaw 把“多 Agent”做成运行时配置，而不是写死在 prompt 或业务代码里。

### 2.2 再读 Gateway 启动

Gateway 是 OpenClaw 的系统边界。建议按下面的关键词定位入口：

```bash
rg "createServer|listen\\(" .
rg "WebSocketServer|ws" .
rg "connect" .
rg "heartbeat" .
rg "stateVersion" .
```

阅读时关注四件事：

1. HTTP 服务如何挂载 `/canvas/`、`/a2ui/` 等辅助界面。
2. WebSocket 首帧 `connect` 如何认证、绑定 client 状态。
3. 请求响应帧 `{type:"req"}` / `{type:"res"}` 如何做 id 对齐。
4. 事件帧 `{type:"event"}` 如何携带 `seq`、`stateVersion`，用于客户端同步。

Gateway 的本质不是“一个 API Server”，而是一个长生命周期消息总线：渠道、控制台、Agent runtime 都围绕它做事件交换。

### 2.3 然后读 Binding Router

Binding Router 是 OpenClaw 多 Agent 隔离的关键。

```bash
rg "Binding" .
rg "bindings" .
rg "accountId" .
rg "guildId" .
rg "roles" .
rg "peer" .
```

匹配优先级可以按这个模型理解：

```
peer 精确匹配
  > guildId + roles
  > guildId
  > accountId
  > channel
  > default agent
```

这套设计的优点是确定性强：

- 同一个飞书机器人可以根据 `accountId` 路由到不同 Agent。
- 同一个 Discord guild 可以按角色分流。
- 私聊、群聊可以覆盖更宽泛的 channel 规则。
- 失败时可以落到 default agent，而不是随机选择。

## 3. Agent Loop 源码链路

Agent Loop 是 OpenClaw 的“大脑入口”，建议围绕这些函数名阅读：

```bash
rg "agentCommand" .
rg "runEmbeddedPiAgent" .
rg "subscribeEmbeddedPiSession" .
rg "agent.wait" .
rg "sessionKey" .
rg "transcript" .
```

主流程可以拆成五层：

| 层级 | 职责 |
|------|------|
| RPC 层 | 校验请求参数，解析 `agentId`、`sessionKey`、输入消息 |
| Session 层 | 找到或创建 session，保证同一 session 的 run 串行执行 |
| Command 层 | 解析模型、工具、skill、上下文和工作目录 |
| Runtime 层 | 调用 `pi-agent-core`，进入模型推理和工具调用循环 |
| Event Bridge 层 | 把 assistant delta、tool event、lifecycle event 转成 Gateway 事件 |

### 3.1 Session Key

OpenClaw 的 session key 具有命名空间含义：

```text
agent:<agentId>:<mainKey>
```

例如：

```text
agent:pm-agent:main
agent:arch-agent:feature-review
```

这个设计把“Agent 身份”和“会话身份”放在同一个 key 里，便于：

- 多 Agent 共用同一套 session store 实现。
- 后台任务、子 Agent、渠道会话统一建模。
- transcript 文件天然按 agent 维度隔离。

### 3.2 串行化和写锁

源码中需要重点检查两个并发保护点：

- per-session queue：同一 session 内的 run 不并发执行。
- transcript write lock：对话记录写入不互相覆盖。

这说明 OpenClaw 把一致性问题放在运行时处理，而不是依赖上层渠道“不会并发发消息”。

## 4. Tool 与 Skill 系统

OpenClaw 的工具系统可以按两层理解：

| 层 | 作用 |
|----|------|
| Tool | 运行时可调用能力，如文件、浏览器、消息、媒体、子 Agent |
| Skill | 用 Markdown 指令封装一组行为，让 Agent 在特定任务中加载 |

建议搜索：

```bash
rg "tools" .
rg "allow" .
rg "deny" .
rg "SKILL.md" .
rg "skills" .
```

重点不是工具数量，而是工具策略：

```json
{
  "tools": {
    "allow": ["read", "sessions_list"],
    "deny": ["write", "exec", "browser"]
  }
}
```

这类 per-agent 工具策略是 OpenClaw 值得复用的地方：不同 Agent 不只是 prompt 不同，权限边界也不同。

## 5. Memory 源码入口

OpenClaw 的 memory-core 重点看三类对象：

| 对象 | 阅读重点 |
|------|----------|
| Dreams | 后台整合流程，Light / Deep / REM 如何分工 |
| QMD | `Questions / Memory / Decisions` 如何持久化 |
| Vector Search | transcript 和 QMD 如何进入语义检索 |

建议搜索：

```bash
rg "Dream" .
rg "QMD" .
rg "MEMORY.md" .
rg "memorySearch" .
rg "extraCollections" .
```

这里的核心不是“长期记忆”这个概念，而是记忆写入的克制：

- Light 阶段先暂存，不急着污染长期记忆。
- Deep 阶段评分后才提升到 `MEMORY.md`。
- REM 阶段偏反思和模式识别，不直接堆事实。

## 6. Channel Adapter 阅读重点

渠道层建议每次只读一个适配器，先选飞书或 Telegram。

```bash
rg "feishu" .
rg "telegram" .
rg "whatsapp" .
rg "sendMessage" .
rg "dmPolicy" .
rg "allowFrom" .
```

对每个适配器都按同一套问题阅读：

| 问题 | 观察点 |
|------|--------|
| 如何认证？ | appId/appSecret/token/session 文件 |
| 如何接收消息？ | webhook、websocket、polling 或 SDK event |
| 如何规范化消息？ | channel 原始事件 → OpenClaw 标准 message |
| 如何做权限过滤？ | allowlist、dmPolicy、群聊策略 |
| 如何回写？ | 文本、附件、工具状态、错误消息 |

Channel Adapter 的好坏决定 OpenClaw 能不能成为“真实工作入口”，而不只是本地 CLI agent。

## 7. Canvas 与 A2UI

Canvas 是 OpenClaw 比较有特色的交互层，建议搜索：

```bash
rg "canvas" .
rg "__openclaw__" .
rg "a2ui" .
rg "present" .
rg "eval" .
```

可以按这个模型理解：

```
Agent 生成 HTML/CSS/JS
  ↓
写入 /__openclaw__/canvas/
  ↓
Gateway 静态服务暴露页面
  ↓
用户在浏览器查看或交互
  ↓
必要时通过 canvas eval 回传状态
```

这把 Agent 的输出从“聊天文本”扩展成“可操作界面”，适合报表、控制台、调试面板、流程编排器。

## 8. 与 Claude Code 的源码对比

| 维度 | Claude Code | OpenClaw |
|------|-------------|----------|
| 产品形态 | 本地 CLI / TUI 编程助手 | 自托管多渠道 Agent Gateway |
| 入口 | CLI bootstrap | Gateway daemon |
| 会话模型 | 本地 transcript / sidechain | agentId + sessionKey + routing state |
| 子 Agent | AgentTool / TaskTool 派生 | sessions_spawn / sessions_send |
| 工具边界 | permission mode + tool policy | per-agent allow/deny + channel policy |
| 记忆 | compact / memory / transcript | Dreams + QMD + vector search |
| UI | Ink React 终端 UI | Channel + Canvas + Control UI |

Claude Code 更像“开发者机器上的智能 IDE 代理”，OpenClaw 更像“企业或个人自托管的 Agent 消息操作系统”。

## 9. 可复用设计模式

### 9.1 Gateway-first

先把所有外部输入汇聚到 Gateway，再由 Gateway 统一路由、认证、审计和事件分发。

适合 PM Agent 的启发：不要让飞书、网页、CLI 各自直连 Agent，应先进入统一消息总线。

### 9.2 Binding as Policy

把“谁来响应这条消息”做成配置规则，而不是写进业务 if-else。

适合 PM Agent 的启发：可以用 binding 管理“需求群 → PM Agent”“架构群 → Architect Agent”“告警群 → SRE Agent”。

### 9.3 Agent Isolation

每个 Agent 有独立 workspace、auth、session、tool policy。

适合 PM Agent 的启发：不同职责的 Agent 不应共享所有文件、凭证和工具权限。

### 9.4 Background Memory

记忆整理不阻塞对话主链路，而是在后台 Dreaming。

适合 PM Agent 的启发：用户沟通要快，长期知识沉淀可以异步做。

## 10. 下一步源码深挖清单

| 优先级 | 主题 | 产出 |
|--------|------|------|
| P0 | Gateway Protocol | 请求/响应/事件帧完整笔记 |
| P0 | Binding Router | 路由优先级、冲突处理、默认 Agent 策略 |
| P0 | Agent Loop | 从 channel message 到 pi-agent-core 的完整调用栈 |
| P1 | Session Store | transcript、write lock、恢复机制 |
| P1 | Tool Policy | allow/deny、内置工具注册、skill 加载 |
| P1 | Feishu Adapter | 企业 IM 接入、安全策略、消息规范化 |
| P2 | Dreams Memory | Light/Deep/REM 的触发和持久化 |
| P2 | Canvas | HTML 生成、静态服务、eval 回传 |

## 参考入口

- [OpenClaw 官方源码](https://github.com/openclaw/openclaw)
- [OpenClaw 文档](https://docs.openclaw.ai)
- [OpenClaw 架构设计](./ARCHITECTURE)
- [OpenClaw 核心模块](./CORE)
