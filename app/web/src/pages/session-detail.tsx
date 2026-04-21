import { useEffect, useRef } from "react";
import { useSessionRealtime } from "@/shared/realtime";
import { useSessionDetail } from "@/shared/api/queries";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionCard } from "@/shared/ui/section-card";
import { StatusBadge } from "@/shared/ui/status-badge";
import { StreamBubble } from "@/shared/ui/stream-bubble";
import { TaskComposer } from "@/shared/ui/task-composer";
import { ToolCallCard } from "@/shared/ui/tool-call-card";
import { useParams, useSearchParams } from "react-router-dom";

function sessionTone(status: string | undefined) {
  if (status === "active") {
    return "success" as const;
  }
  if (status === "ended") {
    return "neutral" as const;
  }
  return "neutral" as const;
}

export function SessionDetailPage() {
  const { sessionId = "session-1" } = useParams();
  const [searchParams] = useSearchParams();
  const didAutoplayDemoRef = useRef(false);
  const sessionQuery = useSessionDetail(sessionId);
  const { state, plane, submitTask, stopTask, replayDemoRun, loadHistory } = useSessionRealtime({
    sessionKey: sessionId,
  });
  const session = sessionQuery.data;

  useEffect(() => {
    didAutoplayDemoRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (plane !== "mock" || searchParams.get("demo") !== "1" || didAutoplayDemoRef.current) {
      return;
    }
    if (state.chatMessages.length > 0 || state.chatStreamSegments.length > 0 || state.chatStream || state.chatRunId) {
      return;
    }
    didAutoplayDemoRef.current = true;
    replayDemoRun();
  }, [
    plane,
    replayDemoRun,
    searchParams,
    state.chatMessages.length,
    state.chatRunId,
    state.chatStream,
    state.chatStreamSegments.length,
  ]);

  if (sessionQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="会话详情" description="这里负责承载 Vertx 与 openclaw 风格 realtime 对话体验。" />
        <ErrorState title="会话详情加载失败" description="Product API 当前不可用，请检查 Vertx API 配置或继续使用 mock fallback。" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={session?.title ?? `会话 ${sessionId}`}
        description={
          plane === "gateway"
            ? "当前优先通过 Vertx Realtime Gateway 直接消费 openclaw 风格事件流，避免 controller 聚合转义。"
            : "当前未配置 Realtime Gateway，页面回退到 mock frames，但仍保持 openclaw 风格的本地 stream / tool / run 状态模型。"
        }
        actions={
          <div className="flex flex-wrap gap-3">
            {plane === "gateway" ? (
              <button
                className="rounded-full border border-[var(--vx-border-subtle)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--vx-text-primary)] shadow-sm transition hover:border-[var(--vx-accent)]"
                type="button"
                onClick={() => {
                  void loadHistory();
                }}
              >
                同步历史
              </button>
            ) : (
              <button
                className="rounded-full border border-[var(--vx-border-subtle)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--vx-text-primary)] shadow-sm transition hover:border-[var(--vx-accent)]"
                type="button"
                onClick={replayDemoRun}
              >
                回放示例运行
              </button>
            )}
            <StatusBadge label={state.connectionStatus} tone={state.connectionStatus === "connected" ? "success" : "warning"} />
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          title="对话线程"
          eyebrow={`session: ${sessionId} · plane: ${plane}${state.lastError ? ` · ${state.lastError}` : ""}`}
        >
          <div className="space-y-3">
            {state.chatQueue.length > 0 ? (
              <div className="rounded-[20px] border border-dashed border-border-strong bg-surface-2 px-4 py-3 text-sm text-text-secondary">
                当前队列中有 {state.chatQueue.length} 个待发送任务，正在等待 runId 和流式事件。
              </div>
            ) : null}
            {state.chatMessages.map((message) => (
              <StreamBubble key={message.id} text={`${message.role === "user" ? "用户" : "助手"}：${message.text}`} />
            ))}
            {state.chatStreamSegments.map((segment) => (
              <StreamBubble key={`${segment.ts}:${segment.text}`} text={`处理中：${segment.text}`} />
            ))}
            {state.chatStream ? <StreamBubble text={state.chatStream} active /> : null}
            {state.chatMessages.length === 0 && state.chatStreamSegments.length === 0 && !state.chatStream ? (
              <EmptyState
                title="当前还没有对话流"
                description={
                  plane === "gateway"
                    ? "发送一条任务消息后，这里会直接展示 openclaw 风格的 chat stream、tool stream 与审批状态。"
                    : "点击“回放示例运行”或直接发起任务，即可在本页观察完整的 mock realtime 执行过程。"
                }
              />
            ) : null}
          </div>
        </SectionCard>
        <div className="space-y-6">
          <SectionCard title="会话概览">
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">会话 ID</dt>
                <dd>{session?.id ?? sessionId}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">来源通道</dt>
                <dd>{session?.channelType ?? (plane === "gateway" ? "openclaw-gateway" : "mock")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">状态</dt>
                <dd>
                  <StatusBadge
                    label={session?.status ?? (state.chatRunId ? "active" : "idle")}
                    tone={sessionTone(session?.status)}
                  />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">消息数</dt>
                <dd>{session?.messageCount ?? state.chatMessages.length}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">活跃 run</dt>
                <dd>{state.chatRunId ?? "无"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">最后事件序号</dt>
                <dd>{state.lastSeq ?? "无"}</dd>
              </div>
            </dl>
          </SectionCard>
          <SectionCard
            title="审批状态"
            actions={
              <StatusBadge
                label={state.pendingApprovals.length > 0 ? `${state.pendingApprovals.length} 待处理` : "无待审批"}
                tone={state.pendingApprovals.length > 0 ? "warning" : "neutral"}
              />
            }
          >
            {state.pendingApprovals.length > 0 ? (
              <div className="space-y-3">
                {state.pendingApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="rounded-[20px] border border-border-subtle bg-surface-2 px-4 py-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-medium">{approval.title}</p>
                      <StatusBadge label="等待处理" tone="warning" />
                    </div>
                    <p className="text-xs text-text-muted">
                      approvalId: {approval.id}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">当前没有待处理审批。收到 `approval.requested` 后会立刻出现在这里。</p>
            )}
          </SectionCard>
          <SectionCard title="工具状态">
            {state.chatToolMessages.length > 0 ? (
              <div className="space-y-3">
                {state.chatToolMessages.map((tool) => (
                  <ToolCallCard
                    key={tool.toolCallId}
                    name={tool.name}
                    phase={tool.phase}
                    startedAt={tool.startedAt}
                    output={tool.output}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">当前没有工具调用。发起任务后，这里会显示 tool stream 的阶段变化。</p>
            )}
          </SectionCard>
        </div>
      </div>
      <TaskComposer
        busy={Boolean(state.chatRunId)}
        onSubmit={submitTask}
        onStop={stopTask}
      />
    </div>
  );
}
