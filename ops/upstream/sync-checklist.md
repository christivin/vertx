# OpenClaw Upstream 跟进清单

## 固定检查项

- 当前 `openclaw/` 对应的 upstream 提交是否已记录
- 是否存在安全修复
- 是否存在 gateway / session / automation / skills 的破坏性变更
- 是否存在新的 channel 能力，尤其是 Feishu 相关增强
- 是否存在影响 `chatStream / toolStream / run lifecycle` 的协议变化
- 契约测试是否通过
- 是否需要调整 Vertx Realtime Gateway 映射
- 是否需要更新 `openclaw-mods.md`

## 升级顺序

1. 先拉取并对比 upstream
2. 跑契约测试
3. 识别是否有 runtime 核心路径变化
4. 再判断是否需要改 Vertx adapter / realtime layer
