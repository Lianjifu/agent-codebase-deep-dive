# 共性模式

本目录汇总四个开源 Agent 框架的共性设计模式，用于提炼通用方法论。

## 目录

| 文档 | 内容 |
|------|------|
| [Task 系统对比](./TASK-SYSTEM) | 四框架 Task 类型、生命周期、ID 生成策略对比 |
| [Coordinator 模式](./COORDINATOR) | 多 Agent 协调、Worker 派发决策、通信机制 |
| [Context 压缩机制](./CONTEXT-COMPACT) | 上下文管理、Token 预算、压缩策略 |
| [PM Agent 设计方案](./PM-AGENT) | PM Agent 的 Task 类型、Query Loop、Feature Flags |

## 核心模式总结

### 1. Task 驱动架构

所有框架都采用 Task 作为基本执行单元，Task 具有：
- 唯一 ID（防重复）
- 状态机（pending → running → completed/failed）
- 可选的后台执行（Dream / Background）

### 2. 分层解耦

```
用户输入
  ↓
Coordinator / QueryEngine（理解 + 分解）
  ↓
Task 派发（并行 / 串行）
  ↓
执行层（工具调用）
  ↓
结果汇总 + 上下文管理
```

### 3. 上下文预算

- Claude Code：13K trigger / 20K warning / 20K error + 熔断
- PM Agent：70% warning / 85% error / 95% block
- 压缩策略：摘要优先 + 渐进式 + Memory Offload

### 4. Feature Flag DCE

编译时条件加载，禁用功能完全不出现在二进制中：
```typescript
const Tool = feature('FLAG_NAME') ? require('./Tool.js') : null
```

### 5. 子 Agent 调度

- Continue：有上下文重叠时复用
- Spawn：方向错误或需独立审视时新建
- Worker Prompt 必须自包含（不看协调者对话）
