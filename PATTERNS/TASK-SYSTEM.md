# Task 系统对比

## 四框架 Task 类型

| Claude Code | OpenClaw | Hermes | OpenHuman |
|-------------|----------|--------|-----------|
| LocalShell | 待补充 | 待补充 | 待补充 |
| LocalAgent | | | |
| RemoteAgent | | | |
| Dream | | | |
| Workflow | | | |
| Monitor | | | |

## Task ID 生成策略

| 框架 | 策略 |
|------|------|
| Claude Code | 前缀 + 8位36进制随机（36^8 ≈ 2.8万亿）|
| OpenClaw | 待补充 |
| Hermes | 待补充 |
| OpenHuman | 待补充 |

## Task 生命周期

```
pending → running → completed/failed/killed
                      ↓
                 触发 Eviction（可配置 retain）
```

## PM Agent 的 Task 设计

```typescript
type PMTaskType =
  | 'analysis'      // 需求分析
  | 'design'        // 设计方案
  | 'coordination'  // 协调沟通
  | 'review'        // 评审
  | 'dream'         // 🌙 后台记忆整合
```
