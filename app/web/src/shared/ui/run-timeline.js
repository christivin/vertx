import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StatusBadge } from "@/shared/ui/status-badge";
export function RunTimeline({ items }) {
    return (_jsx("ol", { className: "space-y-3", children: items.map((item) => (_jsxs("li", { className: "rounded-[20px] border border-border-subtle bg-surface-1 p-4", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [_jsx("p", { className: "font-medium", children: item.title }), _jsx(StatusBadge, { label: item.tone ?? "neutral", tone: item.tone ?? "neutral" })] }), _jsx("p", { className: "text-sm text-text-secondary", children: item.description })] }, item.title))) }));
}
