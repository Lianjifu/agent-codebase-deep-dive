# Coordinator 模式

## 核心职责

```
1. 接收用户输入
2. 理解并分解任务
3. 并行派发子任务
4. 汇总结果
5. 向用户汇报
```

## Continue vs. Spawn 决策

| 情况 | 决策 |
|------|------|
| 子 Agent 上下文与新任务高度重叠 | Continue |
| 子 Agent 上下文有噪声/方向错误 | Spawn fresh |
| 需要纠正失败 | Continue |
| 验证他人工作成果 | Spawn fresh |

## Worker Prompt 模板

```markdown
## Role
你是{领域}专家。

## Context
{背景信息、约束条件}

## Task
{具体任务，包括：}
- 目标文件/模块
- 当前问题
- 完成标准

## Verification
完成后必须：
1. {验证步骤}
2. {验证步骤}
```

## 通信机制

```
Coordinator ←── XML Notification ──→ Worker
    ↓
<task-notification>
<task-id>xxx</task-id>
<status>completed</status>
<result>...</result>
</task-notification>
```
