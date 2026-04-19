import { jsx as _jsx } from "react/jsx-runtime";
export function CustomTabs({ items, activeKey, onChange, }) {
    return (_jsx("div", { className: "inline-flex rounded-full bg-surface-3 p-1", children: items.map((item) => {
            const active = item.key === activeKey;
            return (_jsx("button", { type: "button", onClick: () => onChange(item.key), className: [
                    "rounded-full px-4 py-2 text-sm transition-colors",
                    active ? "bg-surface-1 text-text-primary shadow-card" : "text-text-secondary",
                ].join(" "), children: item.label }, item.key));
        }) }));
}
