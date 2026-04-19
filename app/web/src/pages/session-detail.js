import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "\u4F1A\u8BDD\u8BE6\u60C5", description: "\u8FD9\u91CC\u4F7F\u7528 openclaw \u98CE\u683C\u7684 chatStream / toolStream / runId \u72B6\u6001\u6A21\u578B\uFF0C\u4E0D\u4F9D\u8D56 controller \u805A\u5408\u6587\u672C\u3002" }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.5fr_1fr]", children: [_jsx(SectionCard, { title: "\u5BF9\u8BDD\u7EBF\u7A0B", eyebrow: `connection: ${state.connectionStatus}`, children: _jsxs("div", { className: "space-y-3", children: [state.chatMessages.map((message) => (_jsx(StreamBubble, { text: `${message.role === "user" ? "用户" : "助手"}：${message.text}` }, message.id))), state.chatStream ? _jsx(StreamBubble, { text: state.chatStream, active: true }) : null] }) }), _jsx(SectionCard, { title: "\u5DE5\u5177\u72B6\u6001", children: _jsx("div", { className: "space-y-3", children: state.chatToolMessages.map((tool) => (_jsx(ToolCallCard, { name: tool.name, phase: tool.phase, startedAt: tool.startedAt, output: tool.output }, tool.toolCallId))) }) })] }), _jsx(TaskComposer, { busy: Boolean(state.chatRunId), onSubmit: () => replayMockFrames(), onStop: () => dispatch({ type: "connect.close" }) })] }));
}
