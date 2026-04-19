import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PageHeader } from "@/shared/ui/page-header";
import { RunTimeline } from "@/shared/ui/run-timeline";
import { SectionCard } from "@/shared/ui/section-card";
import { ToolCallCard } from "@/shared/ui/tool-call-card";
export function RunDetailPage() {
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "\u8FD0\u884C\u8BE6\u60C5", description: "\u8FD9\u91CC\u4F1A\u6210\u4E3A run status\u3001timeline\u3001tool cards\u3001result summary \u7684\u4E3B\u9875\u9762\u3002" }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.5fr_1fr]", children: [_jsx(SectionCard, { title: "\u6267\u884C\u65F6\u95F4\u7EBF", children: _jsx(RunTimeline, { items: [
                                { title: "收到飞书触发", description: "来自飞书机器人的日报汇总请求。", tone: "success" },
                                { title: "读取日报文档", description: "进入 openclaw runtime 并调用知识检索工具。", tone: "warning" },
                            ] }) }), _jsx(SectionCard, { title: "\u5DE5\u5177\u72B6\u6001", children: _jsxs("div", { className: "space-y-3", children: [_jsx(ToolCallCard, { name: "feishu.search_docs", phase: "completed", startedAt: "2026-04-20T08:12:00.000Z", output: "\u547D\u4E2D 18 \u7BC7\u65E5\u62A5\u6587\u6863" }), _jsx(ToolCallCard, { name: "summary.generate", phase: "streaming", startedAt: "2026-04-20T08:13:00.000Z", output: "\u6B63\u5728\u751F\u6210\u6458\u8981\u7247\u6BB5..." })] }) })] })] }));
}
