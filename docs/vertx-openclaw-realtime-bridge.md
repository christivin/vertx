# Vertx 与 OpenClaw Realtime Bridge 设计说明

## 1. 当前结论

Vertx 当前选择的 realtime 接入路线是：

- 不先深改 `openclaw/` runtime 核心路径
- 先通过 `packages/openclaw-adapter` 直接消费 OpenClaw 现有 gateway websocket 协议
- 在适配层完成事件归一、workspace 注入、方法透传
- 再由 `packages/realtime-gateway` 对 Vertx 前端暴露统一协议

这是一个：

- `adapter-only`
- `runtime 复用`
- `产品层隔离`

路线。

## 2. 为什么先走 Adapter-First

如果一开始就侵入 `openclaw/src/gateway` 或 `openclaw/src/agents`，会马上带来两个问题：

- 上游差异难以追踪
- 产品语义容易渗入 runtime 核心路径

因此当前阶段固定采用：

- 优先复用 OpenClaw 现有 websocket 协议
- 只在 Vertx 自己的 adapter 层做协议和事件归一

## 3. OpenClaw 现有协议观察

基于当前内嵌源码，OpenClaw gateway 已具备：

- websocket `req / res / event`
- 首次连接后发送 `connect.challenge`
- 客户端需再发 `connect`
- 成功后返回 `hello-ok`
- 已存在 `chat.send`
- 已存在 `chat.history`
- 已存在 `sessions.subscribe`
- 已存在 `session.message`
- 已存在 `sessions.changed`
- 已存在 `exec.approval.* / plugin.approval.*`
- 已存在 `agent` tool/lifecycle 流
- 已存在 `session.tool`

这意味着 Vertx 不需要为了 v1 realtime 体验先发明一套全新 runtime 协议。

## 4. 当前适配层落点

当前代码落点：

- `packages/openclaw-adapter/src/index.ts`
  - `OpenClawGatewaySource`
  - `RealtimeBridgeAdapter`
- `packages/realtime-gateway/src/index.ts`
  - `createRealtimeGatewayServer`
  - `createOpenClawBackedRealtimeGatewayServer`
- `packages/realtime-gateway-server/src/index.ts`
  - `loadRealtimeGatewayServerConfig`
  - `startRealtimeGatewayServer`
  - `runRealtimeGatewayServer`

其中：

- `OpenClawGatewaySource`
  - 负责连接 OpenClaw gateway
  - 处理 `connect.challenge -> connect -> hello-ok`
  - 透传 `chat.send / chat.history` 等方法调用
  - 自动请求 `sessions.subscribe`（可关闭）
- `RealtimeBridgeAdapter`
  - 负责把 source 事件注入 Vertx workspace / tenant / user 上下文
  - 负责输出 Vertx 对前端稳定的 event frame
- `createOpenClawBackedRealtimeGatewayServer`
  - 负责把 `OpenClawGatewaySource` 与 Vertx websocket server 组装成可直接启动的 realtime gateway
  - 降低后续在 BFF / runtime 容器里手工拼装 source 的重复工作
- `packages/realtime-gateway-server`
  - 负责读取 env 配置并启动 HTTP + WebSocket 进程
  - 固定暴露 websocket path 与 health check
  - 作为前端与后续飞书/后端联调时的实际入口

## 5. 事件归一策略

当前已落地的核心映射如下：

| OpenClaw 事件 | Vertx 事件 | 说明 |
| --- | --- | --- |
| `chat` | `chat` | 抽取 `message.content[].text` 归一为 `message.text` |
| `agent` + `stream=tool` | `tool.status` | 将 `phase=start/update/result/error` 映射到 tool 状态卡片 |
| `session.tool` | `tool.status` | 兼容按 session 订阅的观察者 |
| `agent` + `stream=lifecycle` | `run.status` | 归一 run 生命周期 |
| `exec.approval.requested` | `approval.requested` | 保留 payload，并补 `approvalKind=exec` |
| `exec.approval.resolved` | `approval.resolved` | 保留 payload，并补 `approvalKind=exec` |
| `plugin.approval.requested` | `approval.requested` | 保留 payload，并补 `approvalKind=plugin` |
| `plugin.approval.resolved` | `approval.resolved` | 保留 payload，并补 `approvalKind=plugin` |
| `session.message` | `session.message` | 原样透传后再注入 workspace 语义 |
| `sessions.changed` | `sessions.changed` | 原样透传后再注入 workspace 语义 |
| `shutdown` | `shutdown` | 原样透传 |

## 6. 为什么要把 Tool 流单独归一

OpenClaw 对工具流的原始表达更偏 runtime 内部语义：

- `agent` + `stream=tool`
- `session.tool`
- `data.phase = start/update/result/error`

Vertx 前端当前的 session 页和 run 页则需要更稳定的产品态字段：

- `toolCallId`
- `name`
- `args`
- `output`
- `phase`
- `startedAt`
- `updatedAt`

因此在 adapter 层归一 `tool.status`，是为了：

- 保留 runtime 原始粒度
- 降低前端直接理解 OpenClaw 内部事件细节的负担
- 减少后续前端状态机随上游字段轻微变化而频繁波动

## 7. 当前验证结果

当前已建立并通过的最小验证：

- `OpenClawGatewaySource` 能完成 challenge/connect/hello-ok 握手
- 能自动获取 snapshot
- 能把 OpenClaw chat/tool/approval 事件归一为 Vertx 事件
- 能透传 `chat.send`
- `createRealtimeGatewayServer` 已补齐 standalone 模式的 path 约束
- `packages/realtime-gateway-server` 已能以 env 配置启动可监听的 realtime 进程
- 已验证正确 path 可收到 hello，错误 path 无法建立连接，health check 可返回存活状态

对应测试位于：

- `packages/openclaw-adapter/src/index.test.ts`
- `packages/realtime-gateway/src/index.test.ts`
- `packages/realtime-gateway-server/src/index.test.ts`

## 8. 当前运行方式

当前已具备本地运行入口：

- 根命令：
  - `pnpm dev:realtime`
  - `pnpm start:realtime`
- 核心环境变量：
  - `VERTX_WORKSPACE_ID`
  - `OPENCLAW_GATEWAY_URL`
  - `VERTX_REALTIME_HOST`
  - `VERTX_REALTIME_PORT`
  - `VERTX_REALTIME_PATH`
  - `VERTX_REALTIME_HEALTH_PATH`
  - `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`
  - `OPENCLAW_GATEWAY_ROLE`
  - `OPENCLAW_GATEWAY_SCOPES`
  - `OPENCLAW_GATEWAY_CAPS`

默认约定：

- websocket path 默认是 `/realtime`
- health check 默认是 `/healthz`
- 前端通过 `VITE_VERTX_REALTIME_URL` 指向 Vertx Realtime Gateway，而不是直接连 OpenClaw

## 9. 仍未完成的部分

当前 bridge 还不是最终形态，后续还需要继续推进：

- 把当前 env 化配置接入真实部署环境与鉴权来源管理，而不是只停留在本地启动
- 在真实 OpenClaw / 飞书触发环境下验证 `packages/product-api-server` 的 `VERTX_REALTIME_MIRROR_URL` 订阅链路
- 为 `chat.history` 建立更完整的契约测试
- 为 `sessions.changed / session.message / approval / tool stream` 建端到端集成测试
- 把前端 `SessionDetailPage` 从 mock/gateway 选择，进一步推进到真实 OpenClaw source 驱动
- 决定是否需要补 `presence / health / tick` 的归一策略

## 10. 对 OpenClaw 源码的当前判断

截至当前阶段：

- 不需要修改 `openclaw/` 核心源码即可推进 Vertx realtime 基线
- 当前最佳做法仍然是先把协议消费、契约测试、前端状态机跑稳
- 真正要 patch `openclaw/` 时，应聚焦以下入口点再评估：
  - `openclaw/src/gateway/server-chat.ts`
  - `openclaw/src/gateway/server-session-events.ts`
  - `openclaw/src/gateway/server-broadcast.ts`
  - `openclaw/src/gateway/server-methods/chat.ts`

## 11. 当前阶段结论

当前可以明确写死：

- Vertx 已从“mock realtime 原型”进入“可消费真实 OpenClaw websocket 协议”的阶段
- Vertx 已从“只有库级 bridge”进入“bridge 可独立启动并提供固定 path/health 的阶段”
- Vertx 已具备独立于前端渲染的 realtime mirror 解释层，可把 `run.status / chat / session.message / sessions.changed / tool.status` 同步为 Product API 的 run、session 与 audit 状态
- Product API server 已具备可选 realtime mirror client，固定由 API server 持有产品状态写入权，避免 realtime server 与 API server 同时写本地 JSON state file
- OpenClaw 仍然是 Vertx 的 runtime 基座
- Vertx 前端不直接依赖 OpenClaw UI
- Vertx 通过 adapter 层吸收 OpenClaw realtime 能力，而不是把产品层耦合进 OpenClaw 内部目录
