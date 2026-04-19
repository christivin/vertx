import { useEffect, useReducer } from "react";
import { mockHelloFrame, mockRealtimeFrames } from "@/shared/realtime/mock-frames";
import { initialRealtimeState, realtimeReducer } from "@/shared/realtime/state";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionCard } from "@/shared/ui/section-card";
import { StreamBubble } from "@/shared/ui/stream-bubble";
import { TaskComposer } from "@/shared/ui/task-composer";
import { ToolCallCard } from "@/shared/ui/tool-call-card";

export function SessionDetailPage() {
  const [state, dispatch] = useReducer(realtimeReducer, initialRealtimeState);

  useEffect(() => {
    dispatch({ type: "hello", frame: mockHelloFrame });
  }, []);

  const replayMockFrames = () => {
    dispatch({ type: "user.queue", text: "整理本周日报并给出风险结论" });
    mockRealtimeFrames.forEach((frame, index) => {
      window.setTimeout(() => dispatch({ type: "event", frame }), 220 * (index + 1));
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="会话详情" description="这里使用 openclaw 风格的 chatStream / toolStream / runId 状态模型，不依赖 controller 聚合文本。" />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="对话线程" eyebrow={`connection: ${state.connectionStatus}`}>
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
        onSubmit={() => replayMockFrames()}
        onStop={() => dispatch({ type: "connect.close" })}
      />
    </div>
  );
}
