import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function SectionCard({ title, eyebrow, actions, className, children, }) {
    return (_jsxs("section", { className: [
            "rounded-[var(--radius-card)] border border-border-subtle bg-surface-1 px-5 py-5 shadow-card",
            className ?? "",
        ].join(" "), children: [(title || eyebrow || actions) && (_jsxs("div", { className: "mb-4 flex items-start justify-between gap-3", children: [_jsxs("div", { children: [eyebrow ? _jsx("p", { className: "mb-1 text-xs uppercase tracking-[0.12em] text-text-muted", children: eyebrow }) : null, title ? _jsx("h2", { className: "text-lg font-semibold", children: title }) : null] }), actions] })), children] }));
}
