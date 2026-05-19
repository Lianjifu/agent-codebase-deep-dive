# Context 压缩机制

## Claude Code 方案

### 触发阈值

```typescript
const AUTOCOMPACT_BUFFER_TOKENS = 13_000
const WARNING_THRESHOLD = 20_000
const ERROR_THRESHOLD = 20_000
const MAX_CONSECUTIVE_FAILURES = 3  // 熔断
```

### 压缩类型

| 类型 | 触发条件 |
|------|----------|
| Auto Compact | Token 超阈值 |
| Micro Compact | 轻度压缩 |
| Session Memory | 会话记忆整合 |

### 预留 Output Buffer

```typescript
// 预留 20K tokens 给压缩摘要输出
const MAX_OUTPUT_TOKENS_FOR_SUMMARY = 20_000
```

## PM Agent 的 Context 策略

```typescript
const CONTEXT_THRESHOLDS = {
  WARNING: 0.70,    // 70% 上下文
  ERROR: 0.85,      // 85% 上下文
  BLOCK: 0.95,      // 95% 触发压缩
}
```

### 压缩策略

1. **渐进式压缩**：先微压缩，再全面压缩
2. **熔断机制**：连续失败 N 次后停止
3. **摘要优先**：保留关键决策点，移除中间过程
4. **Memory Offload**：长期记忆写入磁盘/向量数据库
