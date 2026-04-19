import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatDateTime } from "@/shared/lib/format";
import { StatusBadge } from "@/shared/ui/status-badge";
export function ToolCallCard({ name, phase, startedAt, output, }) {
    const tone = phase === "completed" ? "success" : phase === "failed" ? "danger" : phase === "streaming" ? "warning" : "neutral";
    return (_jsxs("div", { className: "rounded-[20px] border border-border-subtle bg-surface-1 p-4", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-medium", children: name }), _jsx("p", { className: "text-xs text-text-muted", children: formatDateTime(startedAt) })] }), _jsx(StatusBadge, { label: phase, tone: tone })] }), output ? _jsx("pre", { className: "overflow-auto rounded-2xl bg-surface-3 p-3 text-xs leading-5 text-text-secondary", children: output }) : null] }));
}
