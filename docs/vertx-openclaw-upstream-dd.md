# Vertx 引入 OpenClaw Upstream 源码的边界说明

## 1. 当前结论

Vertx 已将当前本地 `openclaw` 仓库的一个干净源码快照复制到：

- `openclaw`

复制方式采用 `git archive`，因此：

- 不携带 `.git`
- 不携带本地未跟踪文件
- 只保留当前提交的受版本控制源码

当前引入基线：

- 上游来源：`/Users/alvinxu/Desktop/coderepository/vertagentv2/openclaw`
- 快照提交：`84cd786911`

## 2. 为什么先复制一份源码

这样做的原因不是把 OpenClaw 继续当成外部参考，而是把它作为 Vertx 仓库内的基座源码来进行二次开发，同时保留清晰的上游边界。

这样做的直接收益是：

- 能清晰对比 Vertx 当前依赖的 OpenClaw 基线
- 能在本仓库中直接阅读、搜索、建立契约测试
- 能为后续必要 patch 建立明确记录
- 能避免“口头依赖 upstream，但实际改动散落在外部仓库”的失控情况

## 3. 当前定位

当前固定定位是：

- `openclaw/` 是 Vertx 仓库内的一部分
- Vertx 是基于 OpenClaw 的二次开发
- 但仍然需要保留“当前基于哪个 OpenClaw 提交、改了哪些地方、未来怎么跟 upstream”的工程纪律

## 4. 当前阶段允许做的事情

在 `openclaw/` 上，当前阶段允许：

- 阅读源码
- 建立契约测试
- 识别未来需要 patch 的入口点
- 记录改造清单与风险

当前阶段不建议：

- 在尚未完成适配层设计前直接深改核心 runtime
- 在 chat / gateway / sessions 路径上做无文档的侵入改造
- 让 Vertx 前端直接依赖 `upstream/openclaw/ui` 目录结构

## 5. 未来改动分类规则

所有对 OpenClaw 的改动必须被分类：

- `upstream-safe`
  - 可以争取回贡献上游
  - 例如通用 bugfix、兼容性修复、非 Vertx 专属 realtime 改进
- `adapter-only`
  - Vertx 专属适配
  - 例如 workspace 维度隔离、企业产品语义映射
- `temporary-patch`
  - 为快速打通链路的临时补丁
  - 后续必须追踪是否删除、替换或上游化

## 6. 重点关注的源码区域

结合当前目标，最需要优先研究的是：

- `openclaw/ui`
  - 研究 realtime chat / tool stream / run lifecycle 的前端状态模型
- `openclaw/src/gateway`
  - 研究 WebSocket gateway 协议与事件帧
- `openclaw/src/sessions`
  - 研究 session 生命周期与历史读取
- `openclaw/src/automation`
  - 研究自动化执行模型
- `openclaw/extensions/feishu`
  - 研究飞书接入能力

## 7. 对 Vertx 的工程要求

Vertx 后续实现必须遵守：

- 产品前端不直接耦合 `upstream/openclaw/ui` 的 `Lit` 组件
- Product API 不直接暴露 OpenClaw 内部文件结构
- Realtime Gateway 允许参考 OpenClaw 协议，但由 Vertx 自己托管连接与鉴权
- 所有需要动到 `openclaw/` 核心路径的事项，必须先在文档中说明原因、范围、备选方案

## 8. 下一步动作

下一步应按下面顺序推进：

1. 先完成 Vertx 的前端与 realtime 基线
2. 在文档里记录需要触碰 OpenClaw 的精确入口点
3. 为关键依赖建立契约测试
4. 再评估是否需要真正修改 `upstream/openclaw`

### 当前进展补记（2026-04-20）

相对上述下一步，当前已经完成：

- 前端 realtime 基线已启动，包含独立 `realtime-gateway` 包与前端 websocket client
- 已建立最小契约测试，覆盖 hello、event broadcast、request/response
- `SessionDetailPage` 已从纯 mock 页面升级为 gateway-first 接入模式

下一步收敛重点变为：

- 把 `openclaw` 的真实 gateway / runtime 事件接进 `RealtimeBridgeAdapter`
- 为 `chat.history`、`chat.send`、`tool stream`、`sessions.changed` 建更多契约测试
- 在真正修改 `openclaw/` 核心路径之前，先把拟修改入口点和 patch 分类记录到 `ops/upstream/openclaw-mods.md`
