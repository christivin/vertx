import { jsx as _jsx } from "react/jsx-runtime";
const toneClass = {
    success: "bg-[color:rgba(20,128,74,0.12)] text-[color:var(--color-success)]",
    warning: "bg-[color:rgba(183,119,17,0.12)] text-[color:var(--color-warning)]",
    danger: "bg-[color:rgba(209,65,36,0.12)] text-[color:var(--color-danger)]",
    neutral: "bg-surface-3 text-text-secondary",
};
export function StatusBadge({ label, tone = "neutral" }) {
    return _jsx("span", { className: `inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass[tone]}`, children: label });
}
