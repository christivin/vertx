# Vertx v1 实施计划与技术方案

## 1. 目标与核心决策

### 1.1 产品目标

Vertx v1 不是通用聊天机器人，也不是纯编码 agent，而是一个 **企业级办公助手**。它的首发重点是：

- 流程与自动化
- Web 工作台
- 飞书双入口
- 基础知识问答
- 审计与可观测

### 1.2 已固定的关键决策

- 主基座：`openclaw`
- 第一参考源：`hermes-agent`
- 其他参考源：
  - `openhanako`：产品体验、记忆叙事、文件协作感
  - `nanobot`：轻量 WebUI、小而清晰的工程表达
  - `deepagents`：任务拆解、sub-agent、harness 模式
- UI 策略：**Vertx 自建 Web 前端，不复用上游现成 UI**
- 产品入口：**Web 工作台 + 飞书**
- 不在 v1 首期引入：
  - 复杂 BPMN 设计器
  - 完整多租户 RBAC
  - 全量跨 IM 平台同时上线
  - 桌面客户端

---

## 2. 总体架构方案

Vertx 采用三层架构：

### 2.1 底层：OpenClaw Runtime Layer

由 `openclaw` 提供底层通用能力：

- agent runtime
- gateway
- channels
- tools
- sessions
- skills
- automation
- sandbox
- plugins / extensions

这层是 Vertx 的“执行引擎”和“外部连接层”。

### 2.2 中间层：Vertx Adapter / Domain Layer

Vertx 在 OpenClaw 之上建立自己的适配层与业务语义层，负责：

- 对 OpenClaw 配置、事件、任务、会话、通道做统一封装
- 隔离 OpenClaw 内部文件结构与 Vertx 产品代码
- 将 runtime 语义转换为企业办公产品语义

这层的资源模型固定为：

- `workflow`
- `workflow_run`
- `channel_connection`
- `knowledge_source`
- `approval`
- `audit_event`
- `workspace_app`

### 2.3 上层：Vertx Product Layer

Vertx 自建 Web 工作台，提供企业办公产品体验。该层不直接依赖 OpenClaw 内部模块，而只依赖 Vertx Adapter / Domain Layer 暴露的稳定接口。

---

## 3. 代码组织与目录边界

当前根仓库几乎为空，因此建议 Vertx 直接在根目录建立自有工作区，而不是把业务长期埋在任一上游项目内部。

推荐目录结构如下：

```text
docs/
  vertx-upstream-dd.md
  vertx-v1-plan.md

vertx/
  app/
    web/                    # Vertx 自建前端工作台
  openclaw/                # 内嵌的 OpenClaw 基座源码，作为二次开发基础
  packages/
    openclaw-adapter/       # 对 OpenClaw 的稳定适配层
    domain/                 # workflow / approval / audit 等业务模型
    api/                    # 对前端暴露的服务接口 / DTO / client
    contracts/              # 上游契约测试
  ops/
    upstream/
      openclaw-mods.md      # 对 OpenClaw 的修改清单
      sync-checklist.md     # 上游升级评估清单
```

### 3.1 边界原则

- **Vertx 业务逻辑不直接深入 OpenClaw 核心路径。**
- **OpenClaw 的必要改动收敛到薄适配点。**
- **前端和业务层只依赖 Vertx 自己定义的接口。**
- **OpenClaw 保持为可跟踪的 upstream 来源，而不是被大量混写后难以同步的内嵌代码。**
- **`openclaw/` 视作 Vertx 仓库的一部分，作为二次开发基座，但仍需记录改动清单与 upstream 跟进策略。**

---

## 4. 产品模块设计

Vertx Web 工作台的首批模块固定为：

- `工作台`
- `流程`
- `会话`
- `知识`
- `自动化`
- `接入管理`
- `审计与日志`
- `设置`

### 4.1 各模块职责

#### 工作台

- 今日待办
- 流程运行概览
- 飞书入口状态
- 最近会话与最近自动化任务

#### 流程

- 流程模板列表
- 流程创建与参数配置
- 流程运行详情
- 失败重试入口

#### 会话

- 与 agent 的交互会话
- 任务上下文与执行结果查看
- 与飞书入口联动的会话映射

#### 知识

- 知识源管理
- 问答入口
- 后续可扩展文档库、FAQ、企业资料沉淀

#### 自动化

- 定时任务
- 触发器
- 自动化执行历史

#### 接入管理

- 飞书连接状态
- 后续企业微信 / Slack / Teams 扩展入口

#### 审计与日志

- agent 执行日志
- 工具调用摘要
- 关键任务状态与错误信息

#### 设置

- 模型 / Provider
- 工作区
- 安全与入口策略

---

## 5. 首阶段能力范围

### 5.1 v1 重点能力

- 流程自动化
- 飞书双入口
- Web 工作台
- 基础知识问答
- 审计与可观测

### 5.2 首批流程模板

固定先做以下四类模板：

- 日报 / 周报
- 文档总结
- 定时提醒与巡检
- 知识检索问答

### 5.3 v1 不做的内容

- 复杂图形化 BPMN 编排器
- 真正的多租户平台化权限系统
- 同时支持大量企业 IM 的产品化运营
- 桌面客户端

这些能力都保留扩展空间，但不进入 v1 交付范围。

---

## 6. 前端方案与 Figma 落地流程

Vertx 的前端必须自建，原因如下：

- `openclaw/ui` 更像 gateway control UI，技术栈是 `Lit`，不适合直接承接企业工作台产品
- `hermes-agent/web` 更像管理后台而不是流程型产品工作台
- `openhanako` 是桌面产品形态
- `nanobot/webui` 更偏 chat surface

### 6.1 前端技术方向

建议 Vertx Web 前端采用现代 React 产品栈，保持与企业工作台开发习惯一致：

- React
- TypeScript
- Vite
- 设计 token 驱动的主题系统
- 组件层与页面层分离

### 6.2 Figma 到前端的固定流程

收到 Figma 设计稿后，不直接页面照抄，而是按下面流程实现：

1. **Frame inventory**
   - 识别页面、弹窗、表单、表格、状态卡片、导航结构
2. **Design tokens 抽取**
   - 颜色、字号、间距、圆角、阴影、断点、栅格、图标体系
3. **Token 映射**
   - 映射到 Vertx 前端主题变量和基础组件层
4. **静态页面骨架**
   - 先完成结构和布局，不接真实接口
5. **假数据联调**
   - 用 workflow / session / audit 等假数据验证页面心智
6. **接口接入**
   - 接入 Vertx adapter / API 层
7. **实时状态接入**
   - 补 WebSocket / polling / streaming 状态

### 6.3 前端验收标准

每个页面至少满足：

- 视觉一致性
- 响应式正确
- 状态流与真实接口一致

### 6.4 前端实时交互架构

Vertx 前端固定采用双链路：

- `Product Data Plane`
  - 承载工作台、流程列表、接入管理、设置、知识、自动化、审计等页面
  - 通过 Vertx Product API / Domain API 提供数据
- `Realtime Conversation Plane`
  - 承载会话详情、运行详情中的流式输出、tool 状态、approval 状态、run 生命周期
  - 通过 Vertx Realtime Gateway 提供实时事件

#### 固定原则

- 主聊天体验不走 controller 聚合文本链路
- Vertx Realtime Gateway 代理 `openclaw` 原始事件帧，但不把 delta 合并成最终文本
- 前端本地维护 `chatStream / toolStream / runId / queue` 等状态
- `会话 / 运行详情` 以 realtime plane 为主，历史补全再结合 Product API 或 gateway history

---

## 7. 对其他项目的吸收方式

### 7.1 从 OpenClaw 继承

- gateway
- channels
- session model
- tools
- automation
- skills
- agent runtime
- sandbox

### 7.2 从 Hermes 吸收

- 办公助手产品心智
- Web 模块组织方式
- cron / skills / logs / analytics 的后台表达
- 学习闭环的长期演进方向
- “云上持续工作”的产品叙事

### 7.3 从 OpenHanako 吸收

- 高完成度产品体验
- 记忆与人格包装方法
- 文件 / 工作台协作感
- 面向用户的产品表达

### 7.4 从 nanobot 吸收

- 轻量核心
- 小而清晰的 agent loop
- 轻量 Web chat 体验
- 可读性优先的结构组织

### 7.5 从 deepagents 吸收

- 任务拆解
- sub-agent
- harness 化思路
- 研究型 / 评估型能力组合

---

## 8. 实施路径

## 阶段 0：上游尽调与 Vertx 技术边界确认

目标：

- 完成两份文档
- 明确 OpenClaw 可复用模块与需隔离模块
- 确定 Vertx 产品层目录结构、命名体系、接口边界

交付：

- `docs/vertx-upstream-dd.md`
- `docs/vertx-v1-plan.md`
- 初步的代码组织草案

## 阶段 1：OpenClaw 基座接入与最小壳层

目标：

- 在 Vertx 自己的工作区中接入 OpenClaw runtime
- 跑通最小链路：
  - agent
  - session
  - tools
  - gateway
  - automation

必须验证：

- 飞书消息进出
- 会话保持
- 任务调度

阶段结果：

- Vertx 对 OpenClaw 的集成不再是概念，而是可运行的基础链路

## 阶段 2：Vertx Web 工作台基线

目标：

- 建立独立前端工程
- 实现核心页面：
  - 工作台
  - 流程列表
  - 流程执行详情
  - 会话
  - 设置

必须完成：

- API client
- 状态订阅模型
- 页面级假数据与真实接口切换机制

## 阶段 3：企业流程自动化闭环

目标：

- 打通：
  - 飞书触发
  - OpenClaw runtime 执行
  - Web 可视化查看
  - 飞书回执

首批流程模板固定为：

- 日报 / 周报
- 文档总结
- 定时提醒与巡检
- 知识检索问答

## 阶段 4：产品化补强

目标：

- 补足企业可用性与运维能力

范围：

- 审计日志
- 执行历史
- 失败重试
- 审批点
- 基础权限与入口白名单
- 运营与调试工具页

---

## 9. OpenClaw 上游快速跟进方案

这是 Vertx 技术方案的一部分，不是附注。

### 9.1 代码组织原则

- 不在 OpenClaw 核心模块中做大面积侵入式改造
- Vertx 自有业务逻辑优先放在独立产品层和适配层
- 对 OpenClaw 的必要修改尽量收敛到少数薄适配点
- 避免在 runtime 核心路径中混入产品语义

### 9.2 上游修改分类制度

Vertx 对 OpenClaw 的所有修改，必须归类为以下三种之一：

- `upstream-safe`
  - 可争取回贡献上游
  - 不包含 Vertx 专属业务语义
- `adapter-only`
  - Vertx 专属适配
  - 用于连接 OpenClaw 与 Vertx 域模型
- `temporary-patch`
  - 暂时性补丁
  - 后续要删除、替换或上游化

### 9.3 上游修改清单

在 `ops/upstream/openclaw-mods.md` 中维护修改清单。每条记录至少包含：

- 模块 / 路径
- 修改类别
- 修改原因
- 是否可上游化
- 升级时的关注点
- 替代方案

建议模板如下：

```md
## 修改项：<名称>

- 路径：
- 类别：upstream-safe / adapter-only / temporary-patch
- 原因：
- 对 Vertx 的作用：
- 是否建议回贡献上游：
- 升级风险：
- 后续处理计划：
```

### 9.4 上游跟进节奏

建立固定的 upstream diff review 机制。每次跟进优先评估四类变化：

- 安全修复
- 通道能力增强
- tool/runtime 稳定性提升
- automation / session / skills 相关增强

### 9.5 契约测试要求

为了避免 OpenClaw 升级把 Vertx 打穿，必须建立最小契约测试集合，至少覆盖：

- session 生命周期
- tool 调用
- channel 消息进出
- automation 创建与执行
- skills 装载

升级流程固定为：

1. 拉取 OpenClaw 新版本或新提交
2. 运行 Vertx 契约测试
3. 判断是适配层调整还是 runtime patch 调整
4. 更新修改清单与升级记录

### 9.6 版本策略

- Vertx 的产品版本独立于 OpenClaw
- 文档中始终记录当前基于的 OpenClaw 版本 / 提交
- 不要求与 OpenClaw 发布节奏完全同步
- 但必须在短周期内完成：
  - 安全更新
  - 关键通道能力更新
  - automation / session / skills 关键增强跟进

---

## 10. 验收标准

### 10.1 研究文档验收

- 所有项目都有详尽特征分析
- 有统一对比矩阵
- 有“吸收哪些优点、放弃哪些部分”的结论
- 有主基座选择与理由

### 10.2 技术方案验收

- 明确 OpenClaw 与 Vertx 的边界
- 明确 UI 自建策略
- 明确上游同步机制
- 明确分阶段交付

### 10.3 原型与基线验收

- OpenClaw runtime 可在 Vertx 环境下跑通最小链路
- 飞书消息触发链路可打通
- Web 工作台至少能查看会话、流程、任务状态

### 10.4 上游跟进验收

- 建立 upstream 修改清单模板
- 建立最小契约测试集合
- 建立升级评估 checklist

---

## 11. 默认假设

- 文档默认使用中文 Markdown
- 当前尚无具体 Figma 链接，因此本轮只定义设计稿到前端工程的固定实现流程
- 首个企业 IM 默认是飞书
- 首发目标仍然是企业办公自动化
- OpenClaw 的 UI 只作为控制台参考，不作为 Vertx 产品外壳
- Hermes 作为产品与办公助手能力参考源，不作为运行时主基座

---

## 12. 当前基线记录

本计划基于以下本地基线判断：

- `openclaw` 当前提交：`84cd786911`
- `openclaw` 当前版本：`2026.4.19-beta.2`
- `hermes-agent` 当前提交：`6af04474`
- `nanobot` 当前提交：`7527961`
- `openhanako` 当前提交：`53de5ae`
- `deepagents` 当前提交：`a827cdd`

后续若 OpenClaw 版本显著变化，优先更新本节和第 9 节的跟进策略记录。
