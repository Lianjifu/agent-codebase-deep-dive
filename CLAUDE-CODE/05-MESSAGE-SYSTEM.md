# 第 5 章：消息系统

> "在一个以对话为核心的系统中，消息类型的设计就是系统架构的缩影。"

## 引导思考

| 思考维度 | 内容 |
|----------|------|
| **它为什么存在** | <ul><li>用户输入、模型回复、工具执行、系统事件——所有交互都要用统一的消息格式表达</li><li>一个 Message 联合类型管 7+ 种消息变体，靠 type 字段区分</li></ul> |
| **它解决什么问题** | <ul><li>内部的丰富消息要转换成 API 能理解的 user/assistant 交替格式——归一化管线做这个</li><li>进程崩了消息不能丢——JSONL 增量录制 + 父链追踪保证崩溃安全</li><li>工具结果要存两份：序列化版本给 API、原始数据给 UI 渲染</li></ul> |
| **它在系统中的位置** | <ul><li>消息是各层的通信载体——查询引擎生产、API 客户端传输、UI 层消费</li><li>Transcript 以 JSONL 存消息链到磁盘，支撑 --resume 恢复</li></ul> |
| **它如何工作** | <ul><li>工厂函数保证每条消息符合不变量——createUserMessage 自动补 uuid 和 timestamp</li><li>normalizeMessagesForAPI 过五关斩六将：过滤 → 附件重排序 → user 合并 → system 转换 → 媒体剥离</li><li>recordTranscript 通过 messageSet 去重实现增量录制——每次只写新消息</li></ul> |
| **它如何实现** | <ul><li>UUID 确定性派生——拆分后的子消息在不同时刻保证 UUID 一致，transcript 才能正确 resume</li><li>TombstoneMessage 是事件溯源的"撤回"机制——不删历史，追加一个删除事件</li><li>SYNTHETIC_TOOL_RESULT_PLACEHOLDER 被 HFI 逻辑排除——占位用的内容不能拿去训练模型</li></ul> |
| **不同平台如何做** | <ul><li><strong>Cursor Agent</strong>：用 VS Code ExtensionContext.workspaceState 存 JSON，没有消息类型体系</li><li><strong>OpenClaw</strong>：消息类型简化成 user/assistant/system，没有 tombstone/progress 控制消息</li><li><strong>Harness Agent</strong>：数据模型以流水线执行记录为主，对话消息标准化后入审计日志</li></ul> |
| **优势是什么？** | <ul><li><strong>优势</strong><ul><li>判别联合让 TypeScript 穷举每一条分支，不会有遗漏</li><li>JSONL 崩溃安全 + 父链支持分支会话</li><li>UUID 确定性派生保证 resume 可靠性</li></ul></li></ul> |

Claude Code 的消息系统远不止于"用户说了什么、助手回复了什么"的简单交替。它是一个精心分层的类型体系，涵盖了从流式事件到工具结果、从进度通知到墓碑标记的完整生命周期。本章将从类型定义出发，深入到工厂函数、序列化、持久化和 API 归一化的全过程。

---

## 5.1 消息类型层次

### 核心联合类型

Claude Code 的消息系统建立在一个判别式联合类型（discriminated union）之上。从 `src/query.ts` 的导入可以看出完整的类型全貌：

```typescript
import type {
  AssistantMessage,
  AttachmentMessage,
  Message,
  RequestStartEvent,
  StreamEvent,
  ToolUseSummaryMessage,
  UserMessage,
  TombstoneMessage,
} from './types/message.js'
```

`Message` 是所有消息类型的联合：

```mermaid
%%{init: {"theme": "base", "themeVariables":{"primaryColor":"#3b82f6","primaryTextColor":"#1e293b","primaryBorderColor":"#60a5fa","lineColor":"#94a3b8","secondaryColor":"#f1f5f9","tertiaryColor":"#ffffff","fontFamily":"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif"}}}%%
classDiagram
    class Message {
        <<union>>
        +type: string
        +uuid: UUID
        +timestamp: string
    }

    class UserMessage {
        +message.role: user
        +message.content: text
        +isMeta: boolean
        +isVirtual: boolean
    }

    class AssistantMessage {
        +message.role: assistant
        +message.content: ContentBlock[]
        +message.model: string
    }

    class SystemMessage {
        +subtype: string
    }

    class ProgressMessage {
        +toolUseID: string
        +data: object
    }

    class AttachmentMessage {
        +attachment: object
    }

    class TombstoneMessage {
        +message: AssistantMessage
    }

    class StreamEvent {
        +event: object
    }

    class RequestStartEvent

    class ToolUseSummaryMessage {
        +summary: string
        +toolUseIds: string[]
    }

    Message <|-- UserMessage
    Message <|-- AssistantMessage
    Message <|-- SystemMessage
    Message <|-- ProgressMessage
    Message <|-- AttachmentMessage

    SystemMessage <|-- SystemCompactBoundaryMessage
    SystemMessage <|-- SystemLocalCommandMessage
    SystemMessage <|-- SystemAPIErrorMessage
    SystemMessage <|-- SystemInformationalMessage
    SystemMessage <|-- SystemMicrocompactBoundaryMessage
    SystemMessage <|-- SystemMemorySavedMessage
    SystemMessage <|-- SystemStopHookSummaryMessage
    SystemMessage <|-- SystemTurnDurationMessage
    SystemMessage <|-- SystemPermissionRetryMessage
    SystemMessage <|-- SystemBridgeStatusMessage
    SystemMessage <|-- SystemAwaySummaryMessage
    SystemMessage <|-- SystemApiMetricsMessage
    SystemMessage <|-- SystemScheduledTaskFireMessage
    SystemMessage <|-- SystemAgentsKilledMessage
```

### 判别字段

`type` 字段是主判别器。在处理消息的 switch 语句中，TypeScript 的控制流分析可以精确推断每个分支的类型：

```typescript
switch (message.type) {
  case 'tombstone':
    // message: TombstoneMessage
    break
  case 'assistant':
    // message: AssistantMessage
    this.mutableMessages.push(message)
    yield* normalizeMessage(message)
    break
  case 'progress':
    // message: ProgressMessage
    break
  case 'user':
    // message: UserMessage
    break
  case 'stream_event':
    // message: StreamEvent
    break
}
```

### UserMessage 的多面性

`UserMessage` 是系统中最多态的类型。同一个 `type: "user"` 下承载了截然不同的语义：

**人类输入**：用户在终端或 SDK 中输入的文本。

**工具结果**：模型的工具调用执行后返回的结果，通过 `tool_result` content block 标识。`toolUseResult` 字段存储原始输出，`sourceToolAssistantUUID` 指向触发这次工具调用的 assistant 消息。

**Meta 消息**：`isMeta: true` 标记的消息不会在 UI 中显示给用户，仅供模型消费。典型用例包括：
- 系统注入的警告提示
- max_output_tokens 恢复指令
- compact 后的摘要

**虚拟消息**：`isVirtual: true` 标记的消息存在于内存中用于 UI 渲染，但在发送给 API 时被过滤掉。

这种设计将所有"用户角色"（API 层面 role="user"）的消息统一到一个类型下，避免了 API 协议的 user/assistant 交替规则被破坏。

### AssistantMessage 的丰富元数据

```typescript
function baseCreateAssistantMessage({
  content,
  isApiErrorMessage = false,
  apiError,
  error,
  errorDetails,
  isVirtual,
  usage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
    service_tier: null,
    cache_creation: {
      ephemeral_1h_input_tokens: 0,
      ephemeral_5m_input_tokens: 0,
    },
    inference_geo: null,
    iterations: null,
    speed: null,
  },
}: ...): AssistantMessage {
  return {
    type: 'assistant',
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
    message: {
      id: randomUUID(),
      container: null,
      model: SYNTHETIC_MODEL,
      role: 'assistant',
      stop_reason: 'stop_sequence',
      stop_sequence: '',
      type: 'message',
      usage,
      content,
      context_management: null,
    },
    requestId: undefined,
    apiError,
    error,
    errorDetails,
    isApiErrorMessage,
    isVirtual,
  }
}
```

注意 `usage` 的默认值结构——它镜像了 Claude API 响应的完整 usage 对象，包括缓存统计、服务层级、推理地理位置甚至迭代次数。合成消息（如错误消息）使用 `SYNTHETIC_MODEL = '<synthetic>'` 作为模型标识，这让下游的 `isSyntheticApiErrorMessage` 检查成为可能。

### TombstoneMessage：消息的墓碑

```typescript
// Tombstone messages are control signals for removing messages
case 'tombstone':
  break
```

当模型降级回退（streaming fallback）发生时，之前的 partial assistant 消息已经 yield 给了 UI。为了"撤回"这些消息，引擎发射 tombstone：

```typescript
for (const msg of assistantMessages) {
  yield { type: 'tombstone' as const, message: msg }
}
```

UI 层接收到 tombstone 后，应从显示列表中移除对应的消息。这是一种事件溯源（event sourcing）模式——不是直接修改历史，而是追加一个"删除"事件。

### SystemMessage 的子类型体系

SystemMessage 通过 `subtype` 字段进一步细分：

- `compact_boundary`：标记压缩边界，用于 --resume 恢复
- `local_command`：本地命令（如 /compact）的输出
- `api_error`：API 错误通知
- `informational`：一般性信息
- `microcompact_boundary`：微压缩边界
- `memory_saved`：内存保存通知
- `stop_hook_summary`：stop hook 执行摘要
- `turn_duration`：轮次耗时统计
- `api_metrics`：API 性能指标
- `permission_retry`：权限重试通知
- `bridge_status`：桥接状态变更
- `away_summary`：离开期间摘要
- `agents_killed`：代理终止通知
- `scheduled_task_fire`：定时任务触发

这种扁平的子类型枚举（而非深层继承）让 pattern matching 保持简洁，同时避免了面向对象继承链的刚性约束。

<div class="thinking-note">
### 思考笔记

Message 判别联合是 Claude Code 消息系统的"DNA"——它定义了整个系统中消息的边界和变体。

- 10 种消息类型覆盖了从用户输入到系统诊断的完整光谱——类型系统在这里起了穷举约束的作用：处理 Message 的代码必须考虑所有变体。
- SystemMessage 通过 subtype 字段进一步细分 10+ 种系统子类型——这是一种"两阶段判别"：先分大类，再分小类。
- Tombstone 和 Progress 这类控制消息的存在说明：Engine 内部的状态管理同时也产生了大量终端用户看不到的消息类型。
- 扁平的联合类型 vs 深层继承——Claude Code 选择了前者，因为 pattern matching 比继承链更容易推理和维护。

</div>

---

## 5.2 消息创建与序列化

### 工厂函数体系

Claude Code 不直接构造消息对象，而是通过一组工厂函数确保每条消息都满足不变量。

**createUserMessage** 是使用最频繁的工厂函数：

```typescript
export function createUserMessage({
  content,
  isMeta,
  isVisibleInTranscriptOnly,
  isVirtual,
  isCompactSummary,
  toolUseResult,
  mcpMeta,
  uuid,
  timestamp,
  imagePasteIds,
  sourceToolAssistantUUID,
  permissionMode,
  origin,
  // ...
}: { ... }): UserMessage {
  const m: UserMessage = {
    type: 'user',
    message: {
      role: 'user',
      content: content || NO_CONTENT_MESSAGE,
    },
    isMeta,
    isVisibleInTranscriptOnly,
    isVirtual,
    isCompactSummary,
    uuid: (uuid as UUID | undefined) || randomUUID(),
    timestamp: timestamp ?? new Date().toISOString(),
    toolUseResult,
    mcpMeta,
    imagePasteIds,
    sourceToolAssistantUUID,
    permissionMode,
    origin,
  }
  return m
}
```

关键不变量：
1. `content` 为空时替换为 `NO_CONTENT_MESSAGE`，防止向 API 发送空消息。
2. `uuid` 如果未提供则自动生成，确保每条消息都有唯一标识。
3. `timestamp` 如果未提供则使用当前时间。

**createAssistantMessage** 和 **createAssistantAPIErrorMessage** 分别用于正常回复和错误回复：

```typescript
export function createAssistantMessage({
  content,
  usage,
  isVirtual,
}: { ... }): AssistantMessage {
  return baseCreateAssistantMessage({
    content:
      typeof content === 'string'
        ? [{ type: 'text', text: content === '' ? NO_CONTENT_MESSAGE : content }]
        : content,
    usage,
    isVirtual,
  })
}
```

注意字符串到 ContentBlock 数组的自动转换——调用方可以传入纯文本，工厂函数会将其包装为 `[{ type: 'text', text: ... }]`。

**createProgressMessage** 创建工具执行进度消息：

```typescript
export function createProgressMessage<P extends Progress>({
  toolUseID,
  parentToolUseID,
  data,
}: { ... }): ProgressMessage<P> {
  return {
    type: 'progress',
    data,
    toolUseID,
    parentToolUseID,
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
  }
}
```

Progress 是泛型参数——不同工具可以定义自己的进度数据结构，类型安全地传递给 UI 层。

### 合成消息常量

系统定义了一组固定的合成消息文本：

```typescript
export const INTERRUPT_MESSAGE = '[Request interrupted by user]'
export const CANCEL_MESSAGE =
  "The user doesn't want to take this action right now. ..."
export const REJECT_MESSAGE =
  "The user doesn't want to proceed with this tool use. ..."

export const SYNTHETIC_MESSAGES = new Set([
  INTERRUPT_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  CANCEL_MESSAGE,
  REJECT_MESSAGE,
  NO_RESPONSE_REQUESTED,
])
```

`SYNTHETIC_MESSAGES` 集合用于 `isSyntheticMessage` 检查——这些消息是系统生成的控制信号，不应被计入用户消息统计。

### 确定性 UUID 派生

当消息需要拆分（normalizeMessages）时，子消息的 UUID 不是随机生成的，而是从父 UUID 确定性派生的：

```typescript
export function deriveUUID(parentUUID: UUID, index: number): UUID {
  const hex = index.toString(16).padStart(12, '0')
  return `${parentUUID.slice(0, 24)}${hex}` as UUID
}
```

这意味着同一条消息在不同时刻拆分总是产生相同的子 UUID，这对于 transcript 的一致性和 `--resume` 功能至关重要。

<div class="thinking-note">
### 思考笔记

UUID 派生和消息序列化的设计体现了"确定性"在分布式系统中的重要性——同样的操作产生同样的结果，这是可恢复性的基础。

- UUID 确定性派生（父 UUID + 序号）保证日志一致性——无论何时拆分消息，产生的 UUID 都相同，resume 时不会 mismatch。
- 预写（pre-write）transcript 模式是"先记日志再干活"——崩溃时至少有最后状态的记录，不会丢数据。
- fire-and-forget 的 transcript 写入说明了一个权衡：实时性要求高时，异步落盘比同步可靠但可能丢最后几条。
- tool_use 与 tool_result 的关联靠 sourceToolAssistantUUID——这是消息系统的"外键约束"，没有它工具结果就不知道属于谁。

</div>

---

## 5.3 工具结果消息

### tool_result 的编码

工具执行结果被编码为 `UserMessage`，其 `content` 字段包含一个 `tool_result` content block：

```typescript
createUserMessage({
  content: [
    {
      type: 'tool_result',
      content: resultContent,
      is_error: isError,
      tool_use_id: toolUseBlock.id,
    },
  ],
  toolUseResult: originalOutput,
  sourceToolAssistantUUID: assistantMessage.uuid,
})
```

这里存在一个重要的双重存储：
- `content[0].content`：发送给 API 的序列化结果（字符串或 content block 数组）。
- `toolUseResult`：工具的原始输出（保持原始类型），用于 UI 渲染和 HFI 数据提取。

### 合成工具结果占位符

当工具执行被中断，或 API 调用意外抛出异常，可能出现 `tool_use` 没有对应 `tool_result` 的情况。`yieldMissingToolResultBlocks` 函数处理这个"悬空配对"问题：

```typescript
function* yieldMissingToolResultBlocks(
  assistantMessages: AssistantMessage[],
  errorMessage: string,
) {
  for (const assistantMessage of assistantMessages) {
    const toolUseBlocks = assistantMessage.message.content.filter(
      content => content.type === 'tool_use',
    ) as ToolUseBlock[]

    for (const toolUse of toolUseBlocks) {
      yield createUserMessage({
        content: [
          {
            type: 'tool_result',
            content: errorMessage,
            is_error: true,
            tool_use_id: toolUse.id,
          },
        ],
        toolUseResult: errorMessage,
        sourceToolAssistantUUID: assistantMessage.uuid,
      })
    }
  }
}
```

占位符的存在有一个训练数据安全影响：

```typescript
// Exported so HFI submission can reject any payload containing it —
// placeholder satisfies pairing structurally but the content is fake,
// which poisons training data if submitted.
export const SYNTHETIC_TOOL_RESULT_PLACEHOLDER =
  '[Tool result missing due to internal error]'
```

### 权限拒绝的精细消息

工具被拒绝时，消息根据上下文有不同的表述：

```typescript
// 用户手动拒绝
export const REJECT_MESSAGE =
  "The user doesn't want to proceed with this tool use. The tool use was rejected..."

// 子代理内的拒绝（无用户交互）
export const SUBAGENT_REJECT_MESSAGE =
  'Permission for this tool use was denied. The tool use was rejected...'

// 自动模式分类器拒绝
export function buildYoloRejectionMessage(reason: string): string {
  return `${AUTO_MODE_REJECTION_PREFIX}${reason}. ` +
    `If you have other tasks that don't depend on this action, continue working on those. ` +
    `${DENIAL_WORKAROUND_GUIDANCE} ` + ruleHint
}
```

`DENIAL_WORKAROUND_GUIDANCE` 是一段精心撰写的指导文本：

```typescript
export const DENIAL_WORKAROUND_GUIDANCE =
  `IMPORTANT: You *may* attempt to accomplish this action using other tools ` +
  `that might naturally be used to accomplish this goal, ` +
  `e.g. using head instead of cat. But you *should not* attempt to work ` +
  `around this denial in malicious ways...`
```

这段文本在安全工程和用户体验之间取得平衡——允许模型寻找合理替代方案，但明确禁止恶意绕过。

### 消息创建与工具结果的数据流

```mermaid
%%{init: {"theme": "base", "themeVariables":{"primaryColor":"#3b82f6","primaryTextColor":"#1e293b","primaryBorderColor":"#60a5fa","lineColor":"#94a3b8","secondaryColor":"#f1f5f9","tertiaryColor":"#ffffff","fontFamily":"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif"}}}%%
sequenceDiagram
    participant User as 用户输入
    participant REPL as REPL.tsx
    participant QE as QueryEngine
    participant API as Claude API
    participant STE as StreamingToolExecutor
    participant Tool as 具体工具
    participant TS as Transcript Storage

    User->>REPL: 输入文本
    REPL->>QE: submitMessage(prompt)
    QE->>QE: createUserMessage({content})
    QE->>TS: recordTranscript(messages) [预写]
    QE->>API: messages + systemPrompt
    API-->>QE: AssistantMessage (stream)
    QE->>QE: baseCreateAssistantMessage({content, usage})

    Note over API,STE: 模型返回 tool_use block
    QE->>STE: addTool(toolUseBlock)
    STE->>Tool: tool.call(input, context)
    Tool-->>STE: ToolResult{data}
    STE->>STE: createUserMessage({tool_result})
    Note right of STE: toolUseResult = 原始输出<br/>content = 序列化结果<br/>sourceToolAssistantUUID = 关联

    STE-->>QE: yield 工具结果消息
    QE->>TS: void recordTranscript() [fire-and-forget]
    QE->>API: 继续下一轮...
```

### 消息归一化管线

```mermaid
%%{init: {"theme": "base", "themeVariables":{"primaryColor":"#3b82f6","primaryTextColor":"#1e293b","primaryBorderColor":"#60a5fa","lineColor":"#94a3b8","secondaryColor":"#f1f5f9","tertiaryColor":"#ffffff","fontFamily":"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif"}}}%%
flowchart LR
    A["内部消息列表<br/>(7+ 种类型)"] --> B["过滤阶段"]
    B --> B1["移除 progress"]
    B --> B2["移除 isVirtual"]
    B --> B3["移除 synthetic API errors"]

    B1 & B2 & B3 --> C["附件重排序<br/>reorderAttachmentsForAPI"]

    C --> D["连续 user 合并<br/>mergeUserMessages"]

    D --> E["system → user 转换<br/>local_command 等"]

    E --> F["媒体剥离<br/>过大图片/PDF"]

    F --> G["API 格式<br/>user/assistant 交替"]

    style A fill:#ecfeff,stroke:#06b6d4
    style G fill:#dcfce7,stroke:#22c55e
```


<div class="thinking-note">
### 思考笔记

工具结果消息（tool_result）是"用户"和"系统"的混合体——它既是工具执行的产物，又伪装成用户消息。

- tool_result 塞进 user 消息是 Anthropic API 的要求——API 的 user/assistant 交替规则不允许独立工具结果消息类型。
- UserMessage 承载了过多的语义（工具结果、meta、虚拟消息）——API 约束和设计理想之间的妥协。
- sourceToolAssistantUUID 作为工具结果和工具调用的关联键——没有它消息系统就无法关联请求和响应。
- fire-and-forget 的 transcript 写入是吞吐和可靠性的经典权衡。

</div>

---
## 5.4 消息持久化

### Transcript 录制机制

Claude Code 使用 JSONL（JSON Lines）格式将对话消息持久化到磁盘。核心入口是 `recordTranscript` 函数：

```typescript
export async function recordTranscript(
  messages: Message[],
  teamInfo?: TeamInfo,
  startingParentUuidHint?: UUID,
  allMessages?: readonly Message[],
): Promise<UUID | null> {
  const cleanedMessages = cleanMessagesForLogging(messages, allMessages)
  const sessionId = getSessionId() as UUID
  const messageSet = await getSessionMessages(sessionId)
  const newMessages: typeof cleanedMessages = []
  let startingParentUuid: UUID | undefined = startingParentUuidHint
  let seenNewMessage = false
  for (const m of cleanedMessages) {
    if (messageSet.has(m.uuid as UUID)) {
      if (!seenNewMessage && isChainParticipant(m)) {
        startingParentUuid = m.uuid as UUID
      }
    } else {
      newMessages.push(m)
      seenNewMessage = true
    }
  }
  if (newMessages.length > 0) {
    await getProject().insertMessageChain(
      newMessages,
      false,
      undefined,
      startingParentUuid,
      teamInfo,
    )
  }
  return (lastRecorded?.uuid as UUID | undefined) ?? startingParentUuid ?? null
}
```

这个函数有几个关键的设计决策：

**增量录制**：通过 `messageSet` 跟踪已录制的消息 UUID，每次只写入新消息。这避免了在长对话中反复序列化整个历史。

**父链追踪**：`startingParentUuid` 维护消息之间的因果链。这对于 `--resume` 恢复和分支管理至关重要。

**前缀检测**：已录制消息只有在形成前缀时才更新 `startingParentUuid`。这处理了 compaction 场景——新的 compact boundary 和摘要消息出现在保留消息之前，不应被视为父链的一部分。

### Crashproof 设计

消息持久化的时序经过精心设计以实现崩溃安全：

```typescript
// 用户消息在进入查询循环之前写入
if (persistSession && messagesFromUserInput.length > 0) {
  const transcriptPromise = recordTranscript(messages)
  if (isBareMode()) {
    void transcriptPromise  // fire-and-forget for scripts
  } else {
    await transcriptPromise  // block for interactive sessions
  }
}
```

注释中详细解释了为什么用户消息必须在 API 调用之前写入：

```
// If the process is killed before that (e.g. user clicks Stop in cowork
// seconds after send), the transcript is left with only queue-operation
// entries; getLastSessionLog filters those out, returns null, and --resume
// fails with "No conversation found".
```

对于 assistant 消息，策略不同——使用 fire-and-forget：

```typescript
if (message.type === 'assistant') {
  void recordTranscript(messages)  // fire-and-forget
} else {
  await recordTranscript(messages)  // await for user messages
}
```

原因是 `claude.ts` 的流式机制——它 yield 一个 assistant 消息后会 mutate 该消息的 `usage` 和 `stop_reason` 字段。如果 await 写入，后续的 `message_delta` 事件就无法及时处理。写入队列的 100ms 延迟 jsonStringify 自然处理了这个竞态。

### Compact Boundary 的持久化

压缩边界需要特殊处理——在写入 compact boundary 之前，必须确保保留段的尾部消息已经写入：

```typescript
if (message.type === 'system' && message.subtype === 'compact_boundary') {
  const tailUuid = message.compactMetadata?.preservedSegment?.tailUuid
  if (tailUuid) {
    const tailIdx = this.mutableMessages.findLastIndex(
      m => m.uuid === tailUuid,
    )
    if (tailIdx !== -1) {
      await recordTranscript(this.mutableMessages.slice(0, tailIdx + 1))
    }
  }
}
```

如果跳过这一步，`--resume` 恢复时 `applyPreservedSegmentRelinks` 的 tail-to-head 遍历会因找不到已录制的尾部消息而失败。

<div class="thinking-note">
### 思考笔记

JSONL 持久化和 --resume 恢复机制是 Claude Code 区别于纯 Web 聊天的重要能力——所有历史都在本地，随时可以回到之前的对话。

- JSONL 追加写比 JSON 批量写更 crash-safe——写一行 flush 一行，写到一半崩溃也不会丢已写部分。
- 父链（parentUUID）支持分支会话——同一条消息可以 fork 出多个不同的后续路径，像 git branch 一样灵活。
- 入口点存档（entry-point archiving）解决的是"断点续传"的定位问题——从入口到当前消息的路径必须完整记录。
- transcript 的预写 + fire-and-forget 双模式既保证了数据安全性，又不阻塞主流程——是吞吐和可靠性的平衡方案。

</div>

---

## 5.5 消息归一化

### normalizeMessagesForAPI

`normalizeMessagesForAPI` 是消息发送给 API 前的最后一道转换。它的职责是将内部的丰富消息类型映射为 Claude API 接受的 user/assistant 交替格式。

```typescript
export function normalizeMessagesForAPI(
  messages: Message[],
  tools: Tools = [],
): (UserMessage | AssistantMessage)[] {
  const availableToolNames = new Set(tools.map(t => t.name))

  const reorderedMessages = reorderAttachmentsForAPI(messages).filter(
    m => !((m.type === 'user' || m.type === 'assistant') && m.isVirtual),
  )
```

转换过程包含多个阶段：

**第一阶段：过滤**

- 移除 `progress` 消息（仅用于 UI）
- 移除虚拟消息（`isVirtual: true`）
- 移除合成 API 错误消息（`isSyntheticApiErrorMessage`）

**第二阶段：附件重排序**

`reorderAttachmentsForAPI` 将 attachment 消息上移到它们相关的 tool_result 之前，因为 API 要求 user 消息不能出现在 tool_result 之间。

**第三阶段：连续 user 消息合并**

Bedrock API 不支持连续的 user 消息（1P API 支持但会自动合并），所以归一化函数主动合并它们：

```typescript
case 'user': {
  const lastMessage = last(result)
  if (lastMessage?.type === 'user') {
    result[result.length - 1] = mergeUserMessages(lastMessage, userMsg)
    return
  }
  result.push(userMsg)
  return
}
```

**第四阶段：System 消息转 User 消息**

`local_command` 类型的系统消息需要转换为 user 消息，因为 API 不接受 system role 的中间消息：

```typescript
case 'system': {
  const userMsg = createUserMessage({
    content: message.content,
    uuid: message.uuid,
    timestamp: message.timestamp,
  })
  // ...
}
```

**第五阶段：错误引起的媒体剥离**

如果之前的 API 调用因为图片/PDF 过大而失败，归一化函数会从对应的 user 消息中剥离这些媒体块，防止重复触发同样的错误：

```typescript
const typesToStrip = stripTargets.get(normalizedMessage.uuid)
if (typesToStrip && normalizedMessage.isMeta) {
  const content = normalizedMessage.message.content
  if (Array.isArray(content)) {
    const filtered = content.filter(
      block => !typesToStrip.has(block.type),
    )
    // ...
  }
}
```

### normalizeMessages（UI 归一化）

与 API 归一化不同，UI 归一化（`normalizeMessages`）将多 content block 的消息拆分为每条消息一个 block：

```typescript
export function normalizeMessages(messages: Message[]): NormalizedMessage[] {
  let isNewChain = false
  return messages.flatMap(message => {
    switch (message.type) {
      case 'assistant': {
        isNewChain = isNewChain || message.message.content.length > 1
        return message.message.content.map((_, index) => {
          const uuid = isNewChain
            ? deriveUUID(message.uuid, index)
            : message.uuid
          return {
            type: 'assistant',
            message: { ...message.message, content: [_] },
            uuid,
            // ...
          }
        })
      }
      // ...
    }
  })
}
```

`isNewChain` 标志确保一旦发生拆分，后续所有消息的 UUID 都重新派生。这维护了 UUID 的唯一性不变量——不会出现两条消息共享同一个 UUID 的情况。

### reorderMessagesInUI

UI 渲染需要的消息顺序与 API 不同。`reorderMessagesInUI` 将工具调用相关的消息按逻辑分组：

```
tool_use -> pre_hooks -> tool_result -> post_hooks
```

而非按时间顺序。这让用户看到的是一个完整的"工具调用故事"，而非零散的交错事件。

```typescript
// First pass: group messages by tool use ID
for (const message of messages) {
  if (isToolUseRequestMessage(message)) {
    toolUseGroups.set(toolUseID, {
      toolUse: null,
      preHooks: [],
      toolResult: null,
      postHooks: [],
    })
  }
}

// Second pass: reconstruct in logical order
for (const message of messages) {
  if (isToolUseRequestMessage(message)) {
    const group = toolUseGroups.get(toolUseID)
    result.push(group.toolUse)
    result.push(...group.preHooks)
    if (group.toolResult) result.push(group.toolResult)
    result.push(...group.postHooks)
  }
}
```

这种两遍扫描算法（first pass: group, second pass: reconstruct）在保持 O(n) 时间复杂度的同时，实现了任意交错消息的正确重排。

<div class="thinking-note">
### 思考笔记

消息归一化管线是"入站消息的安检通道"——所有消息在发送给 API 之前都要经过 5 个阶段的过滤和重组。

- 5 阶段管线（过滤 → 重排序 → 合并 → 转换 → 剥离）每一阶段都有明确的职责——这比一个巨大的处理函数更容易测试和维护。
- 连续 user 消息合并且不是简单拼接——因为 tool_result 后的 user 消息和用户真实输入的区别需要在合并时保留关键信息。
- 媒体剥离说明了一个现实：token 预算有限，超大附件不能无限制地塞进上下文——归一化管线是最后一层防护。
- user/assistant 交替是 Anthropic API 的硬性要求——归一化管线最后一步确保格式合规，把脏活累活留给框架而非开发者。

</div>

