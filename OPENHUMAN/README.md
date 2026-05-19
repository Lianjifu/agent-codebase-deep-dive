# OpenHuman

> ⚠️ **注意**：OpenHuman 源码尚未公开（GitHub 404）。以下内容基于学习计划预期整理，待源码公开后填充。

## 项目状态

| 项目 | 状态 |
|------|------|
| 源码 | 🔒 未公开 |
| 预期方向 | Human-in-the-Loop 接口 |

## 预期学习方向

### 1. Human 接口设计

根据项目名 "OpenHuman" 推测，核心能力可能包括：
- **审批工作流**：Agent 提出方案，人类确认后执行
- **实时干预**：人类可以随时接管 Agent 行为
- **反馈机制**：人类对 Agent 输出的评价和修正

### 2. 互操作协议

- 跨 Agent 通信标准
- 人类与 Agent 的握手协议
- 权限传递机制

### 3. 安全与边界

- 敏感操作的人类授权
- Agent 能力边界定义
- 审计日志

## 待填充内容

| 文档 | 状态 |
|------|------|
| [Human 接口](./HUMAN-INTERFACE) | 📝 待公开后补充 |
| [互操作性](./INTEROP) | 📝 待公开后补充 |

## 相关参考

- [Coordinator 模式对比](../PATTERNS/COORDINATOR)
- [Context 压缩机制](../PATTERNS/CONTEXT-COMPACT)
- [PM Agent 设计方案](../PATTERNS/PM-AGENT)
