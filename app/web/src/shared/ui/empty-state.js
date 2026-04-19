import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function EmptyState({ title, description }) {
    return (_jsxs("div", { className: "rounded-[24px] border border-dashed border-border-strong bg-surface-2 px-6 py-10 text-center", children: [_jsx("h3", { className: "text-lg font-semibold", children: title }), _jsx("p", { className: "mt-2 text-sm text-text-muted", children: description })] }));
}
