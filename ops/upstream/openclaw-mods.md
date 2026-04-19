# Vertx 对 OpenClaw 的修改清单

## 当前基线

- 当前基座路径：`openclaw`
- Upstream 提交：`84cd786911`

## 记录模板

每一条改动都必须至少包含：

| 模块 | 文件/目录 | 分类 | 原因 | 替代方案 | 是否可上游化 | 当前状态 |
| --- | --- | --- | --- | --- | --- | --- |

分类只能是：

- `upstream-safe`
- `adapter-only`
- `temporary-patch`

## 当前记录

暂无正式基座改动。当前阶段仍以分析、契约测试、适配层设计为主。

## 当前适配层进展

虽然当前还没有直接修改 `openclaw/` 基座源码，但已经在 Vertx 侧落地：

| 模块 | 文件/目录 | 分类 | 原因 | 替代方案 | 是否可上游化 | 当前状态 |
| --- | --- | --- | --- | --- | --- | --- |
| OpenClaw Realtime 远程接入 | `packages/openclaw-adapter/src/index.ts` | `adapter-only` | 先复用 OpenClaw websocket 协议，避免过早侵入 runtime 核心路径 | 直接修改 `openclaw/src/gateway` 暴露 Vertx 专属事件 | 否，偏 Vertx 产品边界 | 已实现最小握手、事件归一、请求透传 |

说明：

- 这不是对 `openclaw/` 目录的直接 patch
- 当前仍维持“基座源码尽量不动，先把适配层和契约测试做稳”的策略
