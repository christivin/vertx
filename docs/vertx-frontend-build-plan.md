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
- `vertx-product-spec.md`：完整产品功能规格
- `vertx-feature-delivery-tracker.md`：逐项实现、测试、验证状态追踪

当前执行规则已经固定为“先写全量产品规格，再按 tracker 一次只闭环一个高优先级功能”，避免前端实现继续碎片化推进。

### 当前落地进展（2026-04-20）

当前已经完成的最小实现锚点：

- `openclaw/` 已作为 Vertx 仓库内嵌基座源码引入，当前按二次开发方式管理
- `app/web` 已完成 React 19 + Vite + Router + Query + Tailwind v4 基线
- `shared/realtime` 已具备 `chatStream / toolStream / runId / queue / approval` 的 reducer 与测试
- `packages/realtime-gateway-contracts` 已补齐 `hello / req / res / event / error` 协议基础
- `packages/openclaw-adapter` 已补齐 `RealtimeBridgeAdapter` 的上下文注入与事件归一能力
- `packages/openclaw-adapter` 已补齐 `OpenClawGatewaySource`，可直接消费 OpenClaw gateway websocket 协议
- `packages/realtime-gateway` 已具备最小 websocket server、事件广播、请求转发与测试
- `packages/realtime-gateway` 已补齐 `createOpenClawBackedRealtimeGatewayServer` 组装入口
- `packages/realtime-gateway-server` 已补齐可启动的 runtime 入口，支持 env 配置、固定 path、health check 与优雅关闭
- `shared/api` 已补齐 `ProductApiClient + React Query hooks` 基线，列表页优先读 Product API，失败时回退 mock
- `packages/product-api-server` 已补齐 mock-backed Product API 运行时，支持 health、CORS、列表读取与基础 mutation
- `shared/api` 已覆盖首批固定 Product API 接口，包含 workflow/run/session detail 与 workflow/run/settings/feishu mutation
- `WorkflowDetailPage` 与 `RunDetailPage` 已接入 Product API query，不再停留在纯骨架或硬编码状态
- `packages/domain` 已承接 Product API 的 workflow/run/session/connection/settings/audit 状态演进，Product API server 不再直接持有领域状态逻辑
- `packages/domain` 已补齐 `ProductApiRepository` 与内存仓储实现，Store 依赖仓储接口而不是裸 state
- `packages/product-api-server` 已补齐 JSON 文件持久化 Repository，可通过 `VERTX_API_STATE_FILE` 启用本地持久化
- `SessionDetailPage` 已改为“优先连接 realtime gateway，失败时回退 mock frames”

当前仍未完成但方向已固定：

- Product API 已具备可运行服务入口、Domain Store、Repository 边界、本地 JSON 文件持久化基线与 realtime mirror client，但还没有接生产级持久化或飞书真实配置
- OpenClaw remote source 已打通最小握手、事件归一、请求透传与 env 化运行时配置，但还没有接入真实业务鉴权与部署环境
- `chat.history` 已具备 adapter/gateway 透传契约与前端恢复入口，但还没有在真实 OpenClaw 部署中做端到端验证
- `session.message / sessions.changed` 已具备 adapter/gateway 透传契约和 Product API mirror 覆盖，但还需要继续补真实 OpenClaw 场景下的端到端验证
- `tool stream` 已具备 completed/failed 基础覆盖，但仍需要继续补更细的真实阶段流验证与长链路集成测试
- `app/web` 已补页面级回归测试基线，覆盖 `SessionDetailPage` demo 回放、`ConnectionsPage` 飞书连接反馈、`SettingsPage` 编辑保存反馈
- `知识` 页面已从占位页推进到真实 `knowledge_source` 资源，具备列表、创建和同步状态展示的最小可用基线

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
  - Product API client、mock fallback、query helper、mutation helper
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
- 当前状态：
  - 已完成基础 reducer、client、mock frames、seq-gap 恢复入口
  - 已在 `SessionDetailPage` 中接入并验证 gateway 优先 / mock 回退逻辑
  - 已补 `history.loaded` reducer，前端在 seq-gap 时会通过 `chat.history` 请求历史消息并恢复本地 message thread
  - `SessionDetailPage` 已提供 gateway plane 下的手动“同步历史”入口，用于调试和恢复历史线程
  - 已验证活跃 run 期间 `session.message` 不会覆盖当前 `chatStream`，后续可在 run 结束后通过 history reload 纠偏
  - `SessionDetailPage` 已展示 realtime `pendingApprovals` 队列，mock/gateway 两种 plane 下都能感知待审批状态

### 阶段 3：Realtime Gateway

- 打通 Vertx -> OpenClaw Realtime Bridge
- 保留原始事件粒度
- 完成会话详情页的端到端流式体验
- 当前状态：
  - 已完成独立 `packages/realtime-gateway`
  - 已具备 hello、event broadcast、request/response 最小能力与测试
  - 已具备 `OpenClawGatewaySource` 最小握手、事件归一、请求透传能力
  - 已完成 `packages/realtime-gateway-server`，支持 env 配置、固定 websocket path、health check、优雅关闭
  - 已补 `chat.history` 在 `openclaw-adapter` 与 `realtime-gateway` 两层的请求透传契约测试
  - 已补 `session.message / sessions.changed` 在 `openclaw-adapter` 与 `realtime-gateway` 两层的事件透传契约测试
  - 已补 OpenClaw `tool start/update/error/result` 到 Vertx `tool.status started/streaming/failed/completed` 的 adapter 契约测试
  - 下一步是把真实运行环境中的 `openclaw` gateway 鉴权来源、Product API 与飞书链路接入，并补更多真实场景契约测试

### 阶段 4：Product API

- 打通 `workbench / workflows / runs / sessions / connections / settings`
- 页面接入真实 Product API
- 当前状态：
  - 已完成前端侧 `ProductApiClient`、query hooks 与 mock fallback
  - `workbench / workflows / sessions / connections / settings / audit` 已不再直接耦合 `mock-data`
  - `workflow detail / run detail` 已接入 Product API query
  - 前端 API client 已覆盖首批固定接口，包括 workflow/run mutation、settings update 与 Feishu connect
  - 已完成 `packages/product-api-server` mock-backed 运行时，覆盖 health、CORS、核心 GET 路由与基础 POST/PUT mutation
  - 已完成 `packages/domain` 的 Product API Store，Product API server 已从“持有状态”收敛为“HTTP 路由 + Domain 调用”
  - 已完成 `ProductApiRepository` 接口与内存仓储实现，Domain Store 已可注入仓储边界
  - 已完成 `packages/product-api-server` 的 JSON 文件 Repository，可通过 `VERTX_API_STATE_FILE` 持久化 workflow/run/settings/audit 等状态
  - 已完成 `mirrorRealtimeEventToProductApiRepository`，可把 `run.status / chat / session.message / sessions.changed / tool.status / approval.requested / approval.resolved` 镜像为 Product API 的 run、session、workbench 与 audit 状态
  - JSON 文件 Repository 已补齐 mirror 所需的 `upsertRun / upsertSession` 持久化能力
  - 已在 `packages/product-api-server` 增加可选 realtime mirror client，可通过 `VERTX_REALTIME_MIRROR_URL` 订阅 Vertx Realtime Gateway，并在同一个 Repository 实例中写入 live run/session 镜像
  - 该设计固定 Product API server 为产品状态 owner，避免 realtime server 与 API server 多进程同时写同一个 JSON state file
  - approval mirror 已可驱动工作台待审批计数与 warning/info 审计事件，为后续流程审批点打基础
  - `sessions.changed` mirror 已覆盖无 transcript message 的 session metadata 变更，可更新 Product API session 状态
  - 下一步是把本地 JSON 文件持久化替换或扩展为生产级 Repository，并在真实 OpenClaw / 飞书触发链路下验证 mirror

### 阶段 5：飞书闭环

- 打通飞书触发 -> OpenClaw runtime -> Vertx realtime -> Web 可视化 -> 飞书回执

## 8. 验收标准

- 前端工程可本地启动
- 静态页面骨架完整
- mock realtime 可以看到流式输出与 tool 状态变化
- contracts、adapter、domain、api 都具备最小代码骨架，其中 domain 已承接 Product API 的状态演进逻辑、Repository 边界与 OpenClaw realtime mirror 解释层
- 文档中已明确：
  - Vertagent 负责视觉与模块参考
  - OpenClaw 负责实时状态机制参考
  - Vertx 使用双链路架构
