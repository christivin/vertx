# Vertx 前端框架与实时交互实施计划

## 1. 目标与约束

- Vertx v1 的前端不是聊天落地页，而是企业办公工作台
- 主基座仍然是 `openclaw`
- UI 视觉语言参考 `vertagent /demo`
- 会话与运行详情的实时体验参考 `openclaw/ui`
- 主聊天体验不走 controller 聚合文本链路
- v1 不做：
  - BPMN 设计器
  - 桌面端
  - 全量多 IM 同时上线
  - 完整多租户 RBAC

### 与现有文档的关系

- `vertx-v1-plan.md`：总体产品和技术方案
- `vertx-frontend-reference.md`：上游前端参考拆解
- `vertx-frontend-build-plan.md`：当前前端工程实施规格

## 2. 双链路架构

Vertx 前端固定采用双链路：

### Product Data Plane

负责：

- 工作台
- 流程列表
- 运行历史
- 接入管理
- 设置
- 知识
- 自动化
- 审计

数据来源：

- Vertx Product API / Domain API

### Realtime Conversation Plane

负责：

- 会话详情
- 运行详情中的流式状态区
- tool 运行状态
- approval 等待状态
- run 生命周期

数据来源：

- Vertx Realtime Gateway
- 由 Vertx Realtime Gateway 代理 `openclaw` 原始事件帧

### 固定原则

- Product API 不承载主聊天流体验
- Realtime Gateway 不把 delta 重写成最终文本
- 前端本地维护 stream 与 tool 状态，而不是只等终态结果

## 3. 前端工程结构

目录固定为：

```text
app/web/src
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
    ui/
    theme/
    api/
    realtime/
    lib/
```

### 主要职责

- `app/`
  - 路由、providers、应用入口
- `pages/`
  - 一级页面
- `widgets/`
  - 页面级布局组合
- `features/`
  - 带行为的模块，如 `task-composer`、`run-stream`
- `entities/`
  - 领域对象 UI 与 model，如 `workflow`、`session`
- `shared/ui/`
  - 基础组件
- `shared/theme/`
  - token、主题、全局样式
- `shared/api/`
  - Product API DTO、mock data、query helper
- `shared/realtime/`
  - gateway 协议、event reducer、mock frames、client

## 4. 页面与模块规划

一级路由固定为：

- `/workbench`
- `/workflows`
- `/workflows/:workflowId`
- `/runs/:runId`
- `/sessions`
- `/sessions/:sessionId`
- `/connections`
- `/settings`
- `/knowledge`
- `/automations`
- `/audit`

### 页面映射

- `工作台`
  - 参考 `vertagent create-project`
  - 展示快捷流程、待办、最近运行、最近会话、飞书接入状态
- `流程列表`
  - 参考 `project-records`
  - 采用 tabs + filter bar + table
- `运行详情`
  - 采用 `run header + timeline + tool cards + result summary + retry action`
- `会话详情`
  - 采用 stream/thread/tool state 组合
- `接入管理`
  - 采用卡片网格 + 配置弹窗
- `设置`
  - 采用 tabs + 分区表单

## 5. 实时协议与状态模型

前端 `shared/realtime` 固定维护：

- `chatMessages`
- `chatStream`
- `chatStreamSegments`
- `chatStreamStartedAt`
- `chatRunId`
- `chatQueue`
- `chatSending`
- `chatLoading`
- `toolStreamById`
- `toolStreamOrder`
- `chatToolMessages`
- `pendingApprovals`
- `connectionStatus`
- `lastSeq`
- `lastHelloSnapshot`
- `lastError`

### reducer 固定行为

- `chat delta` 只更新 `chatStream`
- 首个 `toolcall` 到达时，把当前 `chatStream` 归档到 `chatStreamSegments`
- `toolresult` 更新对应 `toolCallId`
- `final / aborted / error` 清理活跃 run
- 活跃 run 期间，不因为 `session.message` 覆盖当前 stream
- reconnect 后使用 `hello snapshot + history reload` 做状态纠偏

### Realtime 帧结构

- `hello`
- `res`
- `event`
- `error`

### 事件类型

- `chat`
- `agent`
- `session.message`
- `sessions.changed`
- `run.status`
- `tool.status`
- `approval.requested`
- `approval.resolved`
- `shutdown`

## 6. API / Adapter 边界

### Product API

首批接口固定为：

- `GET /api/workbench/summary`
- `GET /api/workflows`
- `POST /api/workflows`
- `GET /api/workflows/:workflowId`
- `POST /api/workflows/:workflowId/run`
- `GET /api/runs`
- `GET /api/runs/:runId`
- `POST /api/runs/:runId/retry`
- `GET /api/sessions`
- `GET /api/sessions/:sessionId`
- `GET /api/channel-connections`
- `POST /api/channel-connections/feishu/connect`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/audit-events`

### Adapter 层

`packages/openclaw-adapter` 固定暴露：

- `SessionAdapter`
- `RunAdapter`
- `ChannelAdapter`
- `AutomationAdapter`
- `SkillAdapter`
- `RealtimeBridgeAdapter`

### 固定边界

- 前端不直接依赖 `openclaw` 内部目录
- 前端不直接依赖 `openclaw/ui`
- Realtime Gateway 可以做轻封装，但不重写文本流
- 所有可能触碰 `openclaw/` 核心源码的事项，先做边界分析与改动记录，再决定是否实施 patch

## 7. 分阶段实施路径

### 阶段 0：文档与协议

- 补齐参考文档与实施文档
- 定义 realtime contracts
- 在总体计划中补充 realtime 架构说明

### 阶段 1：前端壳层

- 初始化 `app/web`
- 建 theme、router、query 基线
- 完成 `Sidebar / Tabs / TaskComposer / DataTable / ConnectionCard`
- 完成静态页面骨架

### 阶段 2：Realtime store

- 建 websocket client
- 建 reducer
- 建 reconnect / seq-gap 恢复逻辑
- 用 mock frames 验证 `chatStream / toolStream / runId / queue`

### 阶段 3：Realtime Gateway

- 打通 Vertx -> OpenClaw Realtime Bridge
- 保留原始事件粒度
- 完成会话详情页的端到端流式体验

### 阶段 4：Product API

- 打通 `workbench / workflows / runs / sessions / connections / settings`
- 页面接入真实 Product API

### 阶段 5：飞书闭环

- 打通飞书触发 -> OpenClaw runtime -> Vertx realtime -> Web 可视化 -> 飞书回执

## 8. 验收标准

- 前端工程可本地启动
- 静态页面骨架完整
- mock realtime 可以看到流式输出与 tool 状态变化
- contracts、adapter、domain、api 都具备最小代码骨架
- 文档中已明确：
  - Vertagent 负责视觉与模块参考
  - OpenClaw 负责实时状态机制参考
  - Vertx 使用双链路架构
