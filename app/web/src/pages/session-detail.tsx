import { useSessionRealtime } from "@/shared/realtime";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionCard } from "@/shared/ui/section-card";
import { StreamBubble } from "@/shared/ui/stream-bubble";
import { TaskComposer } from "@/shared/ui/task-composer";
import { ToolCallCard } from "@/shared/ui/tool-call-card";

export function SessionDetailPage() {
  const { state, plane, submitTask, stopTask } = useSessionRealtime({
    sessionKey: "session-1",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="会话详情"
        description={
          plane === "gateway"
            ? "当前优先通过 Vertx Realtime Gateway 直接消费 openclaw 风格事件流，避免 controller 聚合转义。"
            : "当前未配置 Realtime Gateway，页面回退到 mock frames，但仍保持 openclaw 风格的本地 stream / tool / run 状态模型。"
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          title="对话线程"
          eyebrow={`plane: ${plane} · connection: ${state.connectionStatus}${state.lastError ? ` · ${state.lastError}` : ""}`}
        >
          <div className="space-y-3">
            {state.chatMessages.map((message) => (
              <StreamBubble key={message.id} text={`${message.role === "user" ? "用户" : "助手"}：${message.text}`} />
            ))}
            {state.chatStream ? <StreamBubble text={state.chatStream} active /> : null}
          </div>
        </SectionCard>
        <SectionCard title="工具状态">
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
        </SectionCard>
      </div>
      <TaskComposer
        busy={Boolean(state.chatRunId)}
        onSubmit={submitTask}
        onStop={stopTask}
      />
    </div>
  );
}
