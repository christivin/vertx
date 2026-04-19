import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StatusBadge } from "@/shared/ui/status-badge";
export function ConnectionCard({ name, description, status, }) {
    const tone = status === "connected" ? "success" : status === "pending" ? "warning" : "danger";
    return (_jsxs("div", { className: "rounded-[24px] border border-border-subtle bg-surface-1 p-5 shadow-card", children: [_jsxs("div", { className: "mb-4 flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold", children: name }), _jsx("p", { className: "mt-1 text-sm text-text-muted", children: description })] }), _jsx(StatusBadge, { label: status, tone: tone })] }), _jsx("button", { type: "button", className: "rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground", children: "\u6253\u5F00\u914D\u7F6E" })] }));
}
