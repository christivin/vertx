# Vertx 上游项目尽调分析

## 1. 文档目的与结论摘要

本文对当前工作区中的全部项目做前期尽职调查，目标不是做开源项目综述，而是回答两个直接服务于 Vertx 的问题：

1. 哪个项目最适合作为 Vertx 的主基座。
2. 其他项目分别能为 Vertx 提供哪些值得吸收的产品、架构和实现经验。

本轮调研对象包括：

- 根目录 `vertagentv2`
- `openclaw`
- `hermes-agent`
- `openhanako`
- `nanobot`
- `deepagents`

### 最终结论

- **主基座：`openclaw`**
  - 原因：agent runtime、gateway、多通道、自动化、skills、插件/扩展体系最完整，平台化能力最强，且上游演进速度快，适合做长期企业级产品的运行时底座。
- **第一参考源：`hermes-agent`**
  - 原因：更接近企业办公助手的产品表达，Web 控制台结构清晰，学习闭环、技能自进化、自动化与多平台办公入口的产品心智非常值得吸收。
- **产品体验参考：`openhanako`**
  - 原因：桌面产品感强，用户体验包装成熟，适合作为记忆、人格、文件协作与高完成度交互的设计参考。
- **轻量工程参考：`nanobot`**
  - 原因：agent loop 小而清晰，WebUI 轻，结构易读，适合在 Vertx 自建产品层时参考其“低复杂度表达方式”。
- **能力模式参考：`deepagents`**
  - 原因：更偏 harness / SDK / sub-agent / task planning，适合作为子代理、任务拆解与研究型能力的引入参考，不适合直接做企业产品主壳。

### 推荐路线

- Vertx 不复用任一上游现成 UI 作为最终产品壳。
- Vertx 采用 **“OpenClaw runtime 复用 + Vertx 产品层自建 + 其他项目特性吸收”** 的路线。
- Vertx v1 的产品定位是：**企业级办公助手**，重点能力是 **流程与自动化**，入口为 **Web 工作台 + 飞书双入口**。

---

## 2. 当前根目录 `vertagentv2`

### 产品定位与目标用户

- 当前根目录本身还不是一个已成型产品，而是一个 **上游项目调研与未来集成的工作区**。
- 用户不是终端用户，而是 Vertx 的研发者与架构决策者。

### 技术栈与运行形态

- 当前仅有一个极简 `README.md`，没有业务代码、没有统一的 package manager、没有可运行主程序。
- 更适合作为后续 Vertx 自有代码与文档的宿主仓库。

### agent runtime 结构

- 无 runtime。

### 通道能力

- 无。

### 工具体系

- 无。

### 记忆与知识体系

- 无。

### 技能 / 插件 / 扩展机制

- 无。

### 子代理 / 多代理 / 调度能力

- 无。

### 可观测性、安全性、权限模型

- 无。

### 前端/UI 形态与产品完成度

- 无 UI。

### 二次开发成本

- 低。因为没有既有业务包袱。

### 对 Vertx 的可复用价值

- 作为 **Vertx 自有产品层与文档层的宿主工作区** 非常合适。
- 可以从零开始按照 Vertx 的产品边界组织代码，而不被任一上游项目的目录结构绑死。

### 对 Vertx 的不适配点与风险

- 不提供现成能力，只能作为承载容器。

### 建议

- 保持根仓库干净，把 Vertx 的自有代码、文档、适配层、前端、测试都收敛到这里。
- 不建议直接把任何一个上游项目“改造成”根仓库主线。

---

## 3. `openclaw`

### 基本事实

- 当前提交：`84cd786911`
- 最近提交日期：`2026-04-19`
- `package.json` 版本：`2026.4.19-beta.2`
- 核心形态：Node.js / TypeScript 主导的大型 agent gateway 与多平台个人助理系统

### 产品定位与目标用户

- 官方定位是 **personal AI assistant**，强调“你自己的设备上运行”“多消息通道”“local-first gateway”。
- 虽然文案更偏个人助手，但实际上其能力边界已经达到 **通道中台 + agent runtime + automation 平台** 的级别。
- 目标用户包括开发者、高级个人用户，以及希望自建 agent 平台的团队。

### 技术栈与运行形态

- 运行时：Node 24 / 22.16+
- 主工程：TypeScript / Node.js
- 前端：`ui/` 使用 `Vite + Lit`
- 多端：`apps/` 下有 Android / iOS / macOS / shared
- 文档与脚本体系完整，仓库体量大

### agent runtime 结构

- 运行时核心是 **gateway + embedded PI runner + sessions + tools + channels + automation**。
- 直接依赖 `@mariozechner/pi-agent-core`、`@mariozechner/pi-ai`、`@mariozechner/pi-coding-agent`。
- 提供 `runEmbeddedPiAgent` 一类的嵌入式 agent 执行链路，已经把模型、工具、会话、sandbox、failover、上下文压缩做成体系化能力。
- session、tool、channel、skills、automation 都是平台级一等公民，而不是业务脚本拼起来的功能。

### 通道能力：IM、语音、移动端、Web、桌面端

- 极强。
- README 中直接列出 WhatsApp、Telegram、Slack、Discord、Google Chat、Signal、iMessage、Matrix、Feishu、LINE、Mattermost、Nextcloud Talk、Nostr、QQ、WeChat 等大量通道。
- 本地目录中 `extensions/` 数量达到 **107 个**，说明其扩展面和平台面已经非常广。
- `apps/` 下已有 4 个应用层目录，具备多端协同能力。
- 飞书能力明确存在，且有 `plugin-sdk/feishu` 等导出接口。

### 工具体系：文件、命令、浏览器、MCP、自动化、外部系统接入

- 工具能力最完整。
- README 明确包含 browser、canvas、nodes、cron、sessions、Discord/Slack actions。
- automation 能力覆盖 cron jobs、webhooks、Gmail Pub/Sub 等。
- skills 是标准能力；workspace skills 路径和管理机制明确。
- 插件 SDK 暴露丰富 subpath exports，说明工具与扩展的正式接口已经工程化。

### 记忆与知识体系

- 有 memory 相关扩展与 active-memory 能力。
- 不是以“人格叙事”为主，而是更偏 runtime / channel / task / automation 平台。
- 对 Vertx 来说，这意味着它适合作为底层知识与会话平台，但上层产品语义需要自己再包装。

### 技能 / 插件 / 扩展机制

- 最成熟。
- 有 `extensions/`、`plugin-sdk`、`skills/`、workspace skills、bundled skills、managed skills 等多层机制。
- 不是“仅支持外挂技能文件”，而是完整的平台型扩展能力。

### 子代理 / 多代理 / 调度能力

- 强。
- README 提到 multi-agent routing、sessions_spawn、Cron、tools、sandbox mode。
- 更像一个可以支撑多代理/多入口/多任务长期运行的平台。

### 可观测性、安全性、权限模型

- 很强。
- 文档中明确强调 DM pairing、channel 安全、Docker sandboxing、gateway security。
- 提供 host/default/non-main 等不同安全模式。
- 对企业产品非常关键，因为这类工程基础通常最难补。

### 前端/UI 形态与产品完成度

- 有 `ui/`，但它的角色更像 **control UI / gateway control console**，而不是完整企业工作台。
- 前端采用 `Lit` 而不是 React，结构更偏控制台、系统界面和状态页面。
- 这不是缺点，但意味着 **不适合直接拿来做 Vertx 的最终产品壳**。

### 二次开发成本

- 中高。
- 优势是能力全；成本在于仓库极大、平台面广、内部模块复杂、上游迭代快。
- 如果直接深度魔改核心路径，未来同步会非常痛苦。

### 对 Vertx 的可复用价值

- **最高**。
- 适合继承：
  - agent runtime
  - gateway
  - channels
  - sessions
  - tools
  - skills
  - automation
  - plugin / extension 基础设施
- 适合做 Vertx 的底层与中间层，而不是最终产品界面。

### 对 Vertx 的不适配点与风险

- 产品定位偏个人助理，不是企业办公产品。
- 现有 UI 技术路线与 Vertx 自建工作台路线不一致。
- 平台面过大，若 Vertx 过早追求“全量复用”，会把自身产品边界淹没在 OpenClaw 的平台复杂度中。

### 对 Vertx 的吸收建议

- **直接复用**：runtime、gateway、skills、automation、sessions、channels、sandbox
- **业务侧再包装**：workflow、approval、audit、knowledge source、enterprise connection
- **不复用 UI**：Vertx 自建 Web 产品前端

---

## 4. `hermes-agent`

### 基本事实

- 当前提交：`6af04474`
- 最近提交日期：`2026-04-19`
- Python 包版本：`0.10.0`
- 核心形态：Python 自学习 agent + gateway + Web 控制台 + TUI

### 产品定位与目标用户

- 官方定位非常鲜明：**the self-improving AI agent**。
- 强调技能自生成、自改进、持续记忆、跨会话用户模型。
- 比 OpenClaw 更像一个“产品成品”，尤其在办公助手、云上运行、自动化、远程通道方面的表达更贴近企业办公助手。

### 技术栈与运行形态

- Python 3.11+
- CLI/TUI 主导
- Web 前端：`web/` 使用 `React 19 + Vite + Tailwind v4`
- TUI：`ui-tui/` 使用 `Ink + React`
- 后端还有 FastAPI、gateway、cron、plugins、skills、ACP 等模块

### agent runtime 结构

- 不像 OpenClaw 那样突出“平台 SDK”品牌，而是更偏成品 agent runtime。
- 具备 agent、gateway、cron、plugins、skills、tools、ACP、web、tui 等完整目录层级。
- 适合做成一体化办公代理产品。

### 通道能力：IM、语音、移动端、Web、桌面端

- 很强。
- README 明确支持 Telegram、Discord、Slack、WhatsApp、Signal、CLI。
- 飞书支持可以从 `gateway/config.py` 和 optional dependency `feishu` 看出。
- Web 控制台存在，但更偏“管理与监控面板”。

### 工具体系：文件、命令、浏览器、MCP、自动化、外部系统接入

- 强。
- 包含 MCP、cron、skills、toolsets、browser 工具、环境后端、平台能力。
- 更偏通用 agent / automation / ops assistant，而不只是 chat bot。

### 记忆与知识体系

- 这是其最突出的差异点之一。
- README 强调：
  - closed learning loop
  - memory nudges
  - autonomous skill creation
  - skills self-improve during use
  - FTS5 session search + LLM summarization
  - dialectic user modeling
- 对 Vertx 的启发不是直接复制全部学习机制，而是学习它如何把 **长期记忆 + 技能沉淀 + 用户画像** 组织成产品卖点。

### 技能 / 插件 / 扩展机制

- 强。
- 有 `skills/`、`optional-skills/`、`plugins/`、`gateway/builtin_hooks` 等多个扩展入口。
- skill 数量达到 **25 个顶层分类**，说明它在“办公可用能力组织”方面做得很好。

### 子代理 / 多代理 / 调度能力

- 有 subagent、parallel workstreams、cron、batch trajectory generation 等能力。
- 更偏智能任务执行与长期运行。

### 可观测性、安全性、权限模型

- 完整度高。
- README 中有 doctor、security、gateway、cron、migration、logs、analytics 等页面与命令。
- 比较适合企业助手产品场景中的运维与可观测诉求。

### 前端/UI 形态与产品完成度

- `web/` 是一个比较成熟的 React 管理后台，页面包括：
  - Status
  - Sessions
  - Config
  - Env
  - Cron
  - Skills
  - Logs
  - Analytics
- 这套信息架构非常适合作为 Vertx 的 **办公产品后台体验参考**。
- 但它依然不是 Vertx 最终产品，因为 Vertx 的核心将是“流程与自动化工作台”，不是 Hermes 的配置/运维面板。

### 二次开发成本

- 中等。
- 相比 OpenClaw，它的产品层表达更亲和，但 runtime 平台能力没有 OpenClaw 那么强和广。
- 如果以它为主基座，通道与平台能力的长期上限会更依赖追加改造。

### 对 Vertx 的可复用价值

- **高，但更适合参考，不适合当主底座。**
- 最值得吸收的点：
  - 办公助手产品表达
  - learning loop 概念
  - skills 自增长叙事
  - Web 控制台模块划分
  - cron/skills 与运维面板结合方式

### 对 Vertx 的不适配点与风险

- 运行时平台广度不如 OpenClaw。
- 虽然有 Web UI，但其定位更偏控制台与管理后台，不是以企业流程产品为中心。
- 若将其作为底座，Vertx 后续为了补 runtime / channels / platform breadth，可能还是要回头借鉴 OpenClaw。

### 对 Vertx 的吸收建议

- **重点吸收，不作为主基座。**
- 建议吸收：
  - 办公自动化产品心智
  - Web 模块划分
  - 自学习 / 技能沉淀的长期演进路线
  - 运营与观察性页面组织方式

---

## 5. `openhanako`

### 基本事实

- 当前提交：`53de5ae`
- 最近提交日期：`2026-04-19`
- 版本：`0.105.3`
- 核心形态：Electron + React 的多 Agent 桌面产品

### 产品定位与目标用户

- 官方定位是更容易使用、具备记忆和灵魂的个人 AI agent。
- 相比 OpenClaw 与 Hermes，它更强调 **成品感、人格化、记忆感、桌面交互体验**。
- 目标用户不只是开发者，也包含普通电脑用户。

### 技术栈与运行形态

- Electron 38
- React 19 + Zustand 5 + CSS Modules
- Vite 7
- Hono server
- Pi SDK 作为 agent runtime
- 多语言 i18n

### agent runtime 结构

- 不是直接基于 OpenClaw，而是自己围绕 Pi SDK 构建了 agent、session、memory、desk、plugin、bridge、hub。
- engine 结构清晰，属于“成品应用中的自有运行时组织”。

### 通道能力：IM、语音、移动端、Web、桌面端

- 桌面端最强。
- 有 Telegram、飞书、QQ、微信等 bridge 能力。
- 但主产品形态是桌面应用，而不是 Web 工作台。

### 工具体系：文件、命令、浏览器、MCP、自动化、外部系统接入

- 文件、命令、浏览器、web search、web fetch、cron、desk、插件、技能都比较齐。
- 更偏“电脑上的个人 agent 助理”。

### 记忆与知识体系

- 记忆是其核心卖点之一。
- 有多层级记忆、fact store、summary manager、memory ticker 等。
- 比 OpenClaw 更像“记忆产品”，而不是单纯 runtime 平台。

### 技能 / 插件 / 扩展机制

- 强。
- 有 `plugins/`、`skills2set/`、plugin manager、provider registry、bridge adapters。
- 更偏成品应用内的扩展，而不是纯平台 SDK。

### 子代理 / 多代理 / 调度能力

- 有 multi-agent、channel collaboration、delegate、heartbeat、cron。
- 更强调“多个助手人格协作”。

### 可观测性、安全性、权限模型

- 有 sandbox、path guard、插件权限级别。
- 但整体关注重点还是桌面产品体验，不像 OpenClaw 那样是 gateway-first 的安全模型。

### 前端/UI 形态与产品完成度

- 这是它最强的优势之一。
- `desktop/src/react` 下组件分层丰富，桌面产品感明显。
- 比 OpenClaw 和 Hermes 的控制台更接近“让用户愿意使用的产品”。

### 二次开发成本

- 中等。
- 从产品壳角度比 OpenClaw 更适合直接改，但 Vertx 已明确选择 Web 工作台优先，因此它的主要优势和 Vertx 首发目标不一致。

### 对 Vertx 的可复用价值

- 不适合做主底座。
- 非常适合做 **产品设计、记忆叙事、文件协作交互、产品包装语言** 的参考源。

### 对 Vertx 的不适配点与风险

- 首发形态不一致：它是桌面优先，Vertx 是 Web + 飞书双入口。
- 如果强行继承其产品结构，会把 Vertx 拖向 Electron 产品路线。

### 对 Vertx 的吸收建议

- 吸收：
  - 产品感与界面完成度
  - 记忆与人格的产品叙事方法
  - 文件/工作台/desk 协作感
  - 面向最终用户的表达方式
- 不吸收：
  - Electron 主壳
  - 桌面优先架构

---

## 6. `nanobot`

### 基本事实

- 当前提交：`7527961`
- 最近提交日期：`2026-04-19`
- Python 包版本：`0.1.5.post1`
- 核心形态：超轻量 AI agent 框架 / 成品混合体

### 产品定位与目标用户

- 官方强调 ultra-lightweight、small readable core、practical deployment。
- 明确提到 spirit of OpenClaw / Claude Code / Codex。
- 目标用户是希望快速跑起、读得懂、改得动 agent 的开发者。

### 技术栈与运行形态

- Python 3.11+
- CLI / gateway
- WebUI：`Vite + React 18 + TypeScript + Tailwind 3 + shadcn/ui`
- 文档齐全，结构清楚

### agent runtime 结构

- 强调“小 agent loop”。
- 目录层级包括 `agent/`、`session/`、`channels/`、`providers/`、`security/`、`cron/`、`skills/` 等。
- 非常适合作为“怎样把复杂平台讲清楚”的工程样板。

### 通道能力：IM、语音、移动端、Web、桌面端

- 有 Telegram、Feishu、QQ、Slack、Discord、WeChat 等多通道能力。
- 飞书文档与测试都较明确。
- WebUI 存在，但当前仍偏 chat 和 gateway 视角。

### 工具体系：文件、命令、浏览器、MCP、自动化、外部系统接入

- 工具能力不弱，且持续在增强。
- README 的 release notes 多次出现 MCP、web search、tool fixes、notebook editing、API uploads、channel plugins 等。

### 记忆与知识体系

- 有 memory 与 Dream skill discovery。
- 但整体表达仍是轻量 core，不像 Hermes 那样把 learning loop 打造成头号卖点。

### 技能 / 插件 / 扩展机制

- skills、channel plugins、MCP 都有。
- 更偏轻量演进，而不是重平台抽象。

### 子代理 / 多代理 / 调度能力

- 支持 subagents、long-running tasks、cron、unified session 等。
- 对 Vertx 来说足够有参考价值，但平台深度仍不如 OpenClaw。

### 可观测性、安全性、权限模型

- 有安全、cron、provider、tests 等结构，测试桶分成 **10 个顶层目录**。
- 比较强调“稳妥、可读、可控”。

### 前端/UI 形态与产品完成度

- `webui/` 是个相对轻便的 React 产品面。
- 组件结构包含 ChatPane、MessageList、Sidebar、Composer、ConnectionBadge 等。
- 这非常适合给 Vertx 的前端团队做“轻量聊天工作台”的参考。

### 二次开发成本

- 低到中。
- 优点是容易读、容易改、概念清楚。
- 缺点是平台厚度不够，不适合承担 Vertx 作为企业产品长期底座的全部需求。

### 对 Vertx 的可复用价值

- 高参考价值，中等继承价值。
- 最适合吸收：
  - 小而清晰的 agent loop
  - 简洁工程结构
  - 轻量 WebUI 的构成方式
  - 低复杂度表达

### 对 Vertx 的不适配点与风险

- 作为主基座会面临平台厚度、扩展深度和长期演进能力不足的问题。
- 更适合“借鉴其简洁表达”，不适合成为 Vertx 的长期 runtime 主干。

### 对 Vertx 的吸收建议

- 吸收：
  - Web chat 体验
  - 工程简洁性
  - 目录边界清晰的组织方式
  - 从小而稳出发的节奏
- 不吸收：
  - 以其作为唯一平台底座

---

## 7. `deepagents`

### 基本事实

- 当前提交：`a827cdd`
- 最近提交日期：`2026-04-18`
- `deepagents` 包版本：`0.5.3`
- `deepagents-cli` 版本：`0.0.39`
- 核心形态：LangGraph / LangChain 生态中的 agent harness + CLI

### 产品定位与目标用户

- 官方自称 batteries-included agent harness。
- 更像“现成 agent SDK + CLI”，而不是成品办公平台。
- 非常面向开发者、研究者和需要快速试验 agent pattern 的团队。

### 技术栈与运行形态

- Python 3.11+
- LangChain / LangGraph
- CLI 使用 `Textual`
- 支持 sandbox、LangSmith、MCP adapters
- monorepo 结构，`libs/deepagents` 与 `libs/cli` 分离

### agent runtime 结构

- 明确包含：
  - planning / todo
  - file ops
  - shell
  - sub-agents
  - context management
- 其本质是 **agent harness**，不是完整 gateway 平台。

### 通道能力：IM、语音、移动端、Web、桌面端

- 弱。
- 没有 OpenClaw/Hermes 这种成熟多通道平台能力。
- CLI 是主入口。

### 工具体系：文件、命令、浏览器、MCP、自动化、外部系统接入

- 对 coding / research agent 非常够用。
- MCP 有支持。
- 但企业办公自动化、通道接入、长期运行平台不是其主场。

### 记忆与知识体系

- 有 context management、auto-summarization、persistent memory 等说法。
- 但不是面向办公产品的显式知识系统。

### 技能 / 插件 / 扩展机制

- 有 custom tools、MCP adapters、LangGraph Native 等扩展方式。
- 更像编程框架级扩展，而不是产品插件市场。

### 子代理 / 多代理 / 调度能力

- 这是强项。
- sub-agent、task delegation、planning / todo 是其最值得学习的部分。

### 可观测性、安全性、权限模型

- 借助 LangSmith / sandbox，有不错基础。
- 但企业级平台的权限、审批、通道安全模型不是重点。

### 前端/UI 形态与产品完成度

- 几乎没有成品 Web 产品外壳。
- CLI 强，UI 产品感弱。

### 二次开发成本

- 如果只是引入子代理 / harness 思想，成本低。
- 如果想把它改造成企业办公产品，成本很高，因为大量平台能力都要自己补。

### 对 Vertx 的可复用价值

- 适合做 **能力模式参考**。
- 尤其适合 Vertx 后续引入：
  - 任务拆解
  - 子代理
  - harness 化实验能力
  - research / evaluation 型工作流

### 对 Vertx 的不适配点与风险

- 平台能力不足。
- 缺少企业工作台、消息入口、办公自动化产品视角。

### 对 Vertx 的吸收建议

- 吸收：
  - task planning
  - sub-agent
  - harness 与 evaluation 思路
  - 用 SDK 思维组织某些高级 agent 能力
- 不吸收：
  - 作为主基座或主产品壳

---

## 8. 其他项目的特征总结与吸收建议

### `hermes-agent`

**值得吸收的特征**

- 学习闭环：技能从经验中生成，并在使用中改进
- 办公自动化表达：cron、skills、logs、analytics、status 等模块化很适合办公产品
- 平台接入完整度：多入口、多工具、多运行环境
- Web 控制台结构：适合作为 Vertx 工作台信息架构参考

**不建议直接继承的部分**

- 将 Hermes 作为 runtime 主基座
- 其现有后台 UI 直接变成 Vertx 产品壳

### `openhanako`

**值得吸收的特征**

- 桌面产品感与高完成度交互
- 人格与记忆的叙事方式
- 面向用户的产品包装语言
- 文件/工作台/desk 协作体验

**不建议直接继承的部分**

- Electron 主壳
- 桌面优先架构

### `nanobot`

**值得吸收的特征**

- 小而清晰的 agent loop
- 轻量 WebUI
- 可读性高的工程结构
- 快速上手路径

**不建议直接继承的部分**

- 以其作为长期企业底座
- 用其平台厚度承载复杂企业场景

### `deepagents`

**值得吸收的特征**

- harness 化
- 子代理与任务拆解
- 研究友好
- 可组合 agent 模式

**不建议直接继承的部分**

- 将其作为产品平台主线
- 把 LangGraph/SDK 层设计直接当成企业产品架构

---

## 9. 对比矩阵

| 项目 | 企业办公适配度 | 流程自动化能力 | 飞书接入成熟度 | Web 产品化适配度 | agent runtime 成熟度 | 扩展机制成熟度 | 上游演进活跃度 | 二次开发复杂度 | 与 Vertx 目标一致性 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `openclaw` | 高 | 高 | 高 | 中 | 极高 | 极高 | 极高 | 高 | **最高** |
| `hermes-agent` | 高 | 高 | 高 | 高 | 高 | 高 | 高 | 中 | 很高 |
| `openhanako` | 中 | 中高 | 中 | 中 | 中高 | 中高 | 中高 | 中 | 中 |
| `nanobot` | 中高 | 中高 | 中高 | 中高 | 中高 | 中 | 高 | 低中 | 中高 |
| `deepagents` | 低中 | 中 | 低 | 低 | 中 | 中 | 高 | 中 | 低中 |
| `vertagentv2` 根目录 | 不适用 | 不适用 | 不适用 | 不适用 | 不适用 | 不适用 | 不适用 | 低 | 作为宿主最高 |

> 注：
> - “Web 产品化适配度”指其是否适合承接企业工作台产品层，而非是否存在 Web 页面。
> - “二次开发复杂度”分值越高表示成本越高。

---

## 10. 最终建议

### 10.1 为什么 `openclaw` 是主基座

- 它是当前目录中 **平台能力最完整、通道覆盖最广、runtime 最成熟、长期扩展上限最高** 的项目。
- 它已经具备成为 Vertx 底层中台的条件：agent runtime、gateway、skills、automation、sessions、sandbox、plugin/extension 都是体系化能力。
- 它的不足不是“能力不够”，而是“产品壳不适合直接复用”。这一点正好与 Vertx 自建产品层的路线相容。

### 10.2 为什么 `hermes-agent` 是第一参考源

- 它提供了更贴近办公助手产品的表达方式，尤其是：
  - 学习闭环
  - 技能沉淀
  - 自动化运营
  - Web 控制台结构
- 它可以帮助 Vertx 把 OpenClaw 的平台能力，包装成更具产品感的企业办公助手。

### 10.3 为什么 Vertx 不复用任一上游现成 UI

- `openclaw` UI 更偏控制台 / gateway control UI
- `hermes-agent` Web 更偏管理后台
- `openhanako` 更偏桌面产品
- `nanobot` WebUI 更偏轻量 chat surface

Vertx 目标是 **企业办公工作台**，需要自己的：

- 工作台信息架构
- 流程中心
- 审批与审计界面
- 企业连接管理
- 知识与自动化产品体验

因此 UI 必须自建。

### 10.4 Vertx 的推荐路线

- **runtime 复用**：以 `openclaw` 为主
- **产品层自建**：Vertx Web 工作台、业务模型、企业语义层
- **特性吸收**：
  - 从 `hermes-agent` 吸收办公助手产品表达
  - 从 `openhanako` 吸收产品感与记忆叙事
  - 从 `nanobot` 吸收轻量表达与 Web 交互方式
  - 从 `deepagents` 吸收子代理与任务拆解模式

这条路线既保留了平台上限，也避免了直接 fork 单一上游带来的产品约束。
