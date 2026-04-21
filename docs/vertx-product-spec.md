# Vertx 产品功能规格总表

## 1. 文档目的

这份文档用于先把 Vertx 应该实现的产品能力完整列清楚，再指导后续逐项闭环实现。它不是单纯的页面清单，而是：

- 定义 Vertx 产品应该具备的完整功能版图
- 说明每个功能的目标、行为和验收标准
- 映射 `openclaw/ui` 的参考能力，避免遗漏 runtime 级关键能力
- 为 `vertx-feature-delivery-tracker.md` 提供统一的功能基线

当前固定原则：

- 主基座：`openclaw`
- 产品视觉与工作台组织参考：`vertagent`
- 实时交互与状态机参考：`openclaw/ui`
- Vertx 不复用任一上游现成 UI 作为产品壳
- Vertx 目标是企业办公助手，首发重点是流程自动化、飞书双入口、Web 工作台、知识问答、审计与可观测

## 2. 功能分层

Vertx 的全量功能按三层来定义：

### 2.1 产品体验层

用户可直接操作的产品模块：

- 工作台
- 流程
- 运行详情
- 会话
- 知识
- 自动化
- 接入管理
- 审计与日志
- 设置

### 2.2 运行时交互层

决定产品“是否真的好用”的中间能力：

- Realtime Gateway
- chat stream / tool stream / approval stream 状态管理
- 会话历史恢复
- run 生命周期同步
- Product API 与 Realtime Plane 双链路协同

### 2.3 平台管理层

来自 `openclaw/ui` 控制台的关键管理能力，需要按 Vertx 产品语义吸收：

- channels / gateway / sessions 管理
- automation / cron 管理
- skills / tools 可见性
- usage / audit / logs 可观测
- approval / security / settings 管理
- nodes / instances / agents 等运行时拓扑可见性

其中一部分会进入 Vertx v1 前台产品，一部分会作为后台或后续版本能力，但都必须先列入总规格和交付追踪。

## 3. `openclaw/ui` 能力映射

`openclaw/ui` 的控制台能力不能按页面一比一搬过来，但必须被 Vertx 吸收。当前映射原则如下：

| openclaw/ui 能力 | Vertx 承接方式 | 说明 |
| --- | --- | --- |
| `chat` | `会话详情` + `运行详情 realtime 区` | 保留流式输出、tool stream、run 状态、approval 感知 |
| `overview` | `工作台` + `审计与日志` | 改造成企业工作台与健康概览 |
| `channels` | `接入管理` | 聚焦飞书优先，后续扩展企业通道 |
| `sessions` | `会话列表` + `会话详情` | 保留 session lifecycle 和历史恢复能力 |
| `usage` | `审计与日志` + 后续运营分析页 | v1 先做轻量摘要，后续增强 usage drill-down |
| `cron` / `automation` | `自动化` | 以产品化流程自动化入口承接 |
| `agents` / `skills` / `tools` | `设置` + 后台运行时管理能力 | v1 先做可见与可配，不把上游控制台原样搬进前台 |
| `nodes` / `instances` | `设置` / 后台运维页 | v1 先留接口与可观测锚点 |
| `exec approvals` | `会话详情` + `运行详情` + `审计` | 审批必须进入主产品链路，而不是只在后台存在 |
| `logs` / `debug` | `审计与日志` | 保留问题定位与运行追踪能力 |

## 4. 全量功能规格

下面的功能列表是 Vertx 当前应该实现的总清单。每个功能都有明确的产品语义、实现边界和验收标准。

### F-001 产品壳与全局导航

- 模块：全局
- 来源参考：`vertagent` 布局节奏、`openclaw/ui` 多页面控制台结构
- 功能目标：提供稳定的产品工作台骨架和统一导航
- 详细描述：
  - 左侧导航固定包含工作台、流程、会话、知识、自动化、接入管理、审计、设置
  - 顶层页面切换不丢失当前会话上下文
  - 全局风格统一为浅色企业工作台
- 验收标准：
  - 所有一级路由可访问
  - 当前活跃路由有明确高亮
  - 页面结构在桌面端和常见笔记本尺寸下可稳定显示

### F-002 工作台总览

- 模块：工作台
- 来源参考：`vertagent` 工作台节奏、`openclaw/ui overview`
- 功能目标：给用户一个进入产品后的“经营面板”
- 详细描述：
  - 展示待审批数量、最近运行数量、最近会话数量、已接入通道数量
  - 展示快捷流程入口
  - 展示最近运行、最近会话、飞书接入状态
  - 提供统一任务发起入口
- 验收标准：
  - 统计数字来自 Product API
  - 快捷入口可跳转或直接触发对应流程
  - 工作台不是纯静态卡片，至少有一个可执行动作

### F-003 流程列表

- 模块：流程
- 来源参考：`vertagent project-records`
- 功能目标：管理企业流程模板
- 详细描述：
  - 列出所有流程
  - 支持按状态筛选
  - 提供进入流程详情的入口
  - 后续支持创建流程和复制流程
- 验收标准：
  - 流程列表从 Product API 加载
  - 列表项能跳转详情
  - 状态标签与最近运行信息可见

### F-004 流程详情

- 模块：流程
- 来源参考：Vertx 产品定义
- 功能目标：承接流程说明、参数入口和启动动作
- 详细描述：
  - 显示流程 ID、状态、描述、最近运行
  - 支持启动新 run
  - 后续扩展参数表单和模板配置
- 验收标准：
  - 详情页能根据 `workflowId` 正确加载
  - “立即运行”触发 Product API mutation
  - 运行创建成功后用户能看到结果反馈

### F-005 运行详情

- 模块：运行详情
- 来源参考：`openclaw/ui chat + tool cards + run lifecycle`
- 功能目标：把一次任务执行过程可视化
- 详细描述：
  - 展示 run header、状态、开始时间、流程归属
  - 展示 timeline
  - 展示 tool cards
  - 展示结果摘要
  - 支持 retry
- 验收标准：
  - 页面不是纯 mock 文案，至少能消费真实 Product API run detail
  - retry 后状态会刷新
  - tool 状态区应与 realtime plane 能力兼容

### F-006 会话列表

- 模块：会话
- 来源参考：`openclaw/ui sessions`
- 功能目标：把所有 session 作为企业任务对话的索引中心
- 详细描述：
  - 列出会话名、来源通道、状态、更新时间
  - 支持进入会话详情
  - 后续支持搜索和过滤
- 验收标准：
  - 会话列表来自 Product API
  - 每行能进入对应会话详情
  - 活跃与结束状态可区分

### F-007 会话详情 Realtime 主链路

- 模块：会话
- 来源参考：`openclaw/ui chat`、`app-gateway`、`app-tool-stream`
- 功能目标：提供 Vertx 最关键的“丝滑对话”体验
- 详细描述：
  - 优先通过 Realtime Gateway 直接消费原始事件流
  - 支持本地 user bubble 立即出现
  - 支持 chat delta 流式输出
  - 支持 tool stream 卡片更新
  - 支持 runId 感知、停止任务、历史恢复、断线恢复
  - 页面必须基于路由 `sessionId` 工作，而不是固定 demo session
- 验收标准：
  - 不经过 controller 聚合文本也能展示完整流式过程
  - 断线或 seq-gap 后能够恢复状态
  - 活跃 run 期间不会被延迟的 `session.message` 粗暴覆盖
  - 页面能让用户感知“底层正在做什么”

### F-008 审批状态与审批处理感知

- 模块：会话 / 运行 / 审计
- 来源参考：`openclaw/ui exec approvals`
- 功能目标：把需要人工确认的动作显式暴露给用户
- 详细描述：
  - 会话详情展示待审批队列
  - 运行详情展示审批相关状态
  - 审计页记录审批申请和审批结果
  - 后续支持审批动作提交
- 验收标准：
  - `approval.requested` 能进入前端状态
  - `approval.resolved` 能正确清除待处理项
  - 用户能够看到审批不是静默发生的

### F-009 知识源管理

- 模块：知识
- 来源参考：Vertx 产品定义、`openclaw/ui` 的 files/skills/knowledge 启发
- 功能目标：建立知识问答的数据入口
- 详细描述：
  - 展示知识源列表
  - 支持创建知识源
  - 展示来源类型、同步状态、更新时间
  - 为后续知识问答和检索留接口
- 验收标准：
  - 页面使用真实 Product API 资源
  - 至少支持新增一个知识源并在列表中可见
  - 状态字段可用于后续接入真实 ingestion

当前实现备注（2026-04-21）：

- 页面已接入 `knowledge_source` 列表和创建动作，不再是占位页
- 当前已展示来源类型、同步状态、更新时间和文档数
- 下一步重点是补一次手动验证，并决定是否继续追加详情页或问答入口

### F-010 自动化管理

- 模块：自动化
- 来源参考：`openclaw/ui cron / automation`
- 功能目标：让流程自动化从第一天就是产品核心能力
- 详细描述：
  - 展示自动化列表
  - 支持创建自动化任务
  - 展示触发方式、状态、上次运行时间、下次运行时间
  - 支持启停或手动触发
- 验收标准：
  - 页面不再是占位页
  - 自动化至少有列表、创建、状态切换三类真实动作
  - 自动化记录进入审计或运行视图

### F-011 接入管理

- 模块：接入管理
- 来源参考：`openclaw/ui channels`
- 功能目标：管理飞书等企业入口连接
- 详细描述：
  - 展示各通道连接状态
  - 支持飞书连接动作
  - 展示最近活跃时间
  - 后续补齐回调状态、安装状态、白名单状态
- 验收标准：
  - 至少飞书连接动作可执行
  - 连接成功后列表和工作台统计会变化
  - 审计事件会记录连接动作

当前实现备注（2026-04-21）：

- 页面已补飞书连接按钮、状态刷新入口与连接结果反馈
- 其他通道暂时仍处于“状态可见、动作未开放”的阶段
- 下一步重点是验证真实配置下的连接效果和审计沉淀

### F-012 设置管理

- 模块：设置
- 来源参考：`openclaw/ui settings / config`
- 功能目标：提供产品级配置入口
- 详细描述：
  - 展示并编辑默认模型、realtime 模式、工作区名称
  - 后续扩展网关、权限、审批、安全配置
- 验收标准：
  - 设置页不是只读页面
  - 保存后会回写 Product API
  - 更新动作进入审计日志

当前实现备注（2026-04-21）：

- 页面已从只读摘要推进到可编辑表单
- 已补默认模型、Realtime 模式、工作区名称的保存入口与保存反馈
- 下一步重点是补一次端到端手动验证，确认保存后查询刷新与审计写入一致

### F-013 审计与日志

- 模块：审计
- 来源参考：`openclaw/ui overview event log / logs / usage`
- 功能目标：提供事后追踪和问题定位能力
- 详细描述：
  - 展示审计事件列表
  - 展示事件级别、动作、时间
  - 后续扩展按资源过滤、按 run/session 查看关联事件
- 验收标准：
  - 审计数据来自 Product API
  - workflow run / settings / connection / approval 等动作能沉淀为事件
  - 页面可作为日常排查入口

### F-014 Product API 数据面

- 模块：中间层
- 来源参考：Vertx 自定义 Domain + `openclaw` 二次开发边界
- 功能目标：承接列表页、配置页、详情页的稳定数据接口
- 详细描述：
  - 提供 workbench、workflow、run、session、connection、settings、audit、knowledge、automation 的 Product API
  - 支持基础 mutation
  - 支持本地持久化
- 验收标准：
  - API 端点可启动
  - 前端可读写
  - 核心端点有测试覆盖

### F-015 Realtime Gateway 与前端状态机

- 模块：中间层 / 前端
- 来源参考：`openclaw/ui app-gateway / app-chat / app-tool-stream`
- 功能目标：保持实时事件粒度，不丢失执行过程
- 详细描述：
  - 支持 `hello / res / event / error`
  - 支持 `chat / agent / session.message / sessions.changed / run.status / tool.status / approval.*`
  - 前端 reducer 按 `openclaw/ui` 的行为维护本地状态
- 验收标准：
  - 单元测试覆盖 chat/tool/approval/recovery 核心路径
  - reconnect 与 history reload 正常工作
  - 前端可在 mock 与真实 gateway 之间切换

### F-016 Realtime Mirror 到 Product API

- 模块：中间层
- 来源参考：Vertx 双链路架构
- 功能目标：让列表页和后台数据面能感知 runtime 事件演进
- 详细描述：
  - 将 realtime 事件镜像为 run/session/workbench/audit 状态
  - 不在 mirror 层重写主聊天流
  - 只做管理面摘要同步
- 验收标准：
  - `run.status`
  - `chat`
  - `session.message`
  - `sessions.changed`
  - `tool.status`
  - `approval.requested`
  - `approval.resolved`
  都能正确映射到 Product API 状态

### F-017 OpenClaw 适配层

- 模块：适配层
- 来源参考：`openclaw gateway / runtime / channels / skills / automation`
- 功能目标：隔离 Vertx 与 OpenClaw 内部结构
- 详细描述：
  - 负责网关透传、事件归一、上下文注入、能力探测
  - 保持必要修改集中到薄边界
- 验收标准：
  - Vertx 前端与 Product API 不直接依赖 `openclaw/` 内部文件结构
  - 关键协议点有契约测试

### F-018 运行时配置与通道能力

- 模块：设置 / 接入 / 后台
- 来源参考：`openclaw/ui channels / config / connect-command`
- 功能目标：把 runtime 和 channel 的关键可配能力产品化
- 详细描述：
  - 配置飞书接入参数
  - 管理 workspace / realtime / model 基础配置
  - 后续扩展通道回调、白名单、审批策略
- 验收标准：
  - 配置不是写死在前端
  - 至少有一条从配置到生效的可见链路

### F-019 运行可观测与健康检查

- 模块：后台 / 审计
- 来源参考：`openclaw/ui overview / logs / usage`
- 功能目标：保证系统“可观测而不是黑盒”
- 详细描述：
  - 暴露 health check
  - 暴露 runtime / gateway / product api 的关键状态
  - 后续扩展 usage、事件统计、失败率
- 验收标准：
  - Realtime Gateway 和 Product API 均可独立健康检查
  - 页面或文档中可明确定位系统状态入口

### F-020 上游同步与契约测试

- 模块：工程机制
- 来源参考：OpenClaw upstream 跟进方案
- 功能目标：在二次开发中保持可持续升级
- 详细描述：
  - 维护修改清单
  - 为 session lifecycle、tool 调用、channel 消息、automation、skills 建契约测试
  - 升级时先跑契约测试再调适配层
- 验收标准：
  - 上游修改有分类记录
  - 契约测试不是口头约定，而是可执行测试集合

## 5. v1 与后续阶段的功能边界

### 5.1 必须进入 v1 首批闭环

- F-001 到 F-016

这些能力决定 Vertx 是否已经形成一个真正可用的产品闭环。

### 5.2 必须在 v1 预留但可以后续增强

- F-017 到 F-020

这些能力决定 Vertx 是否能长期演进、稳定跟进 OpenClaw、并进入更强的平台化阶段。

## 6. 执行规则

后续实现必须遵守下面的交付节奏：

1. 先在 `vertx-feature-delivery-tracker.md` 中明确当前功能状态。
2. 同一时间只允许一个最高优先级功能处于“闭环实现中”。
3. 每个功能必须按以下流程推进：
   - 实现
   - 测试
   - 验证
   - 修改
   - 再验证
   - 完成
4. 当前功能未达到“真实可用”前，不开始下一个同优先级功能。
5. 每完成一个功能，要同步更新 tracker 和相关计划文档。
