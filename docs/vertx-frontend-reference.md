# Vertagent 与 OpenClaw 前端参考分析

## 1. 结论摘要

- `vertagent` 适合作为 Vertx 的前端视觉与模块组织参考源。
- `openclaw/ui` 适合作为 Vertx 的实时对话与工具状态机制参考源。
- Vertx 不采用 `controller` 聚合文本链路来承载主聊天体验，而是采用：
  - 产品数据走 Vertx Product API
  - 对话流、工具流、run 状态走 Vertx Realtime Gateway
- 最终路线是：`视觉语言参考 Vertagent /demo + 实时状态机参考 openclaw/ui + 产品 IA 由 Vertx 自建`。

## 2. Vertagent 前端技术栈与工程形态

通过 `vertagent/apps/web` 实际代码可确认：

- 技术栈是 `React 19 + Vite + React Router 7 + React Query + Tailwind CSS v4`
- 项目同时使用 Tailwind utility 与页面级 CSS 文件
- `vertagent/apps/web/README.md` 中提到的 `Ant Design` 已经过时，不能作为当前实现依据
- 真正贴近设计稿的页面并不在 `/workspace` 控制台，而是：
  - `src/pages_demo`
  - `src/pages_demo/common`

### 对 Vertx 的启发

- 继续使用现代 React 产品栈是合理的
- 页面壳、组件层、业务层应分离，不能把所有页面逻辑塞在一个 `components/` 目录
- 视觉高保真部分适合保留就近 CSS 文件，不强行全量 utility 化

## 3. Vertagent 的视觉语言与页面模块

### 3.1 视觉语言

`vertagent /demo` 的视觉特征非常明确：

- 浅色工作台优先
- 中性灰白底色
- 高识别度黄绿色强调色，典型值为 `#AEFF21`
- 大圆角、轻边框、轻阴影
- 低噪声信息密度
- 左侧固定导航 + 中间主舞台
- 毛玻璃感输入器与卡片

### 3.2 最值得吸收的页面模式

- `create-project`
  - 适合作为 Vertx `工作台` 的节奏参考
  - 可吸收点：首页任务发起器、最近记录、快捷入口卡片
- `project-records`
  - 适合作为 Vertx `流程 / 运行历史` 的结构参考
  - 可吸收点：tabs、filter bar、table、status badge、pagination
- `im-config`
  - 适合作为 Vertx `接入管理`
  - 可吸收点：连接卡片网格、配置弹窗、状态展示
- `system-settings`
  - 适合作为 Vertx `设置`
  - 可吸收点：tab 切换、分区表单、占位弹窗
- `chat-session`
  - 适合作为 Vertx `会话详情 / 运行详情` 的版式参考
  - 但其底层状态模型仍不如 `openclaw/ui` 完整

### 3.3 可直接抽象成 Vertx 的前端模块

- `AppShell`
- `SidebarNav`
- `TaskComposer`
- `CustomTabs`
- `SectionCard`
- `StatusBadge`
- `FilterBar`
- `DataTable`
- `ConnectionCard`
- `EmptyState`
- `ErrorState`

## 4. OpenClaw 的实时交互机制

`openclaw/ui` 的“丝滑感”不是来自控制台样式，而是来自前端状态机与 gateway 协议处理。

核心参考文件：

- `openclaw/ui/src/ui/gateway.ts`
- `openclaw/ui/src/ui/app-gateway.ts`
- `openclaw/ui/src/ui/controllers/chat.ts`
- `openclaw/ui/src/ui/app-chat.ts`
- `openclaw/ui/src/ui/app-tool-stream.ts`

### 4.1 关键机制

- WebSocket Gateway 客户端负责：
  - connect / reconnect
  - hello snapshot
  - request-response
  - event frame
  - seq gap 恢复
- 前端本地维护：
  - `chatMessages`
  - `chatStream`
  - `chatStreamSegments`
  - `chatRunId`
  - `chatQueue`
  - `toolStreamById`
  - `toolStreamOrder`
  - `chatToolMessages`
- 首个 `toolcall` 到达时，会先把当前文字流归档，再开始渲染 tool 卡片
- run 的 terminal event 到达后，才会进行历史纠偏或 reload
- 活跃 run 期间不会被普通 `session.message` 刷新打断当前流式渲染

### 4.2 对 Vertx 的直接结论

- 主聊天体验不能依赖“后端聚合好的最终文本”
- 前端必须自己持有 `chatStream / toolStream / runId / queue`
- Realtime 层必须尽量保留原始事件粒度

## 5. 可吸收点

### 从 Vertagent 吸收

- 工作台视觉语言
- 页面密度与留白控制
- 侧栏导航与主舞台结构
- 筛选表格与设置页的组织方式
- 任务发起器作为首页一级交互

### 从 OpenClaw 吸收

- gateway 客户端模型
- stream 与 tool 状态 reducer
- reconnect / seq gap 恢复策略
- run 生命周期追踪
- tool call / tool result 的 UI 组织方式

## 6. 不适配点与风险

### Vertagent 的不适配点

- `/workspace` 控制台更偏管理后台，不适合直接作为 Vertx 产品壳
- 页面命名与 IA 不符合 Vertx 目标
- controller 聚合结果链路不适合作为主聊天体验基础
- `数字员工`、`模型监控` 等菜单不应直接进入 Vertx v1 一级导航

### OpenClaw 的不适配点

- `Lit` 技术栈不适合直接作为 Vertx 产品壳
- `openclaw/ui` 更像 control UI，不是企业办公工作台
- 视觉层不适合直接复用，但协议层与状态机非常有价值

## 7. 对 Vertx 的映射建议

- `vertagent create-project` -> Vertx `工作台`
- `vertagent project-records` -> Vertx `流程列表 / 运行历史`
- `vertagent im-config` -> Vertx `接入管理`
- `vertagent system-settings` -> Vertx `设置`
- `vertagent chat-session` -> Vertx `运行详情` 的版式参考
- `openclaw chat/tool/run state` -> Vertx `会话详情 / 运行详情` 的状态机制参考

## 8. 固定结论

- `Vertagent` 负责回答“Vertx 看起来应该像什么”
- `OpenClaw` 负责回答“Vertx 的实时交互应该怎么动起来”
- `Vertx` 最终采用：
  - 视觉语言参考 `Vertagent /demo`
  - 实时机制参考 `OpenClaw`
  - 产品 IA、业务语义、接口边界全部自建
