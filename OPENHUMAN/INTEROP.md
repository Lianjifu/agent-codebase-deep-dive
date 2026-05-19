# OpenHuman 互操作性

> ⚠️ 待源码公开后补充

## 预期互操作协议

### Agent 间通信

```typescript
// 预期协议格式
interface AgentMessage {
  from: string      // Agent ID
  to: string        // Agent ID
  type: "request" | "response" | "notification"
  action: string    // 操作类型
  payload: any      // 数据
  traceId: string   // 追踪 ID
}
```

### 权限传递

```
人类 ──► 主 Agent ──► 子 Agent
          (授权)       (受限能力)
```

### 协议层级

| 层级 | 内容 |
|------|------|
| 传输层 | WebSocket / HTTP / gRPC |
| 序列化 | JSON / Protobuf |
| 语义层 | 操作类型 + 状态机 |

## 待公开后填充

- [ ] 实际协议定义
- [ ] 认证机制
- [ ] 错误处理规范
