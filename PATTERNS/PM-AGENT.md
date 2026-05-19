# PM Agent 设计方案

## 定位

AI 产品经理，负责产品全生命周期管理，驱动跨职能团队高效协作。

## 核心能力

| 能力 | 说明 |
|------|------|
| 需求分析 | 用户访谈、数据采集、竞品分析 |
| 方案设计 | PRD 撰写、业务流程、验收标准 |
| 迭代规划 | 版本规划、任务拆解、资源评估 |
| 交付追踪 | 开发协同、测试跟踪、发布监控 |

## Task 类型

```typescript
type PMTaskType =
  | 'demand_analysis'   // 需求调研
  | 'prd_writing'       // PRD 撰写
  | 'coordination'      // 跨团队协调
  | 'review'            // 评审
  | 'tracking'          // 交付追踪
  | 'dream'             // 🌙 后台记忆整合
```

## Sub-Agent 调度

| Agent | 触发时机 |
|-------|----------|
| arch-agent | 涉及系统重构或技术风险 |
| designer-agent | 涉及新界面或交互变更 |
| frontend-agent | UI 实现阶段 |
| backend-agent | API / 业务逻辑实现 |
| qa-agent | 测试阶段 |
| devops-agent | 发布与监控阶段 |

## Query Loop

```
用户需求
  ↓
需求调研 → 需求分析 → 方案设计 → 迭代规划 → 交付追踪
  ↓
子 Agent 派发 / 自主决策
  ↓
结果汇总 → 向用户汇报
```

## 上下文管理

- **Smart Zone（0-40%）**：推理聚焦、工具调用准确
- **Dumb Zone（>40%）**：触发压缩或交接

## Feature Flags

```typescript
const PM_FEATURES = {
  ANALYTICS: 'pm_analytics',       // 数据分析
  FEISHU: 'pm_feishu',           // 飞书集成
  SCHEDULED: 'pm_scheduled',     // 定时任务
  COORDINATOR: 'pm_coordinator', // 协调模式
  DREAM: 'pm_dream',            // 后台记忆
}
```
