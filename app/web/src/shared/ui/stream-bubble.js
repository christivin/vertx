import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StreamBubble({ text, active = false }) {
    return (_jsx("div", { className: "rounded-[22px] bg-surface-2 px-4 py-3", children: _jsxs("p", { className: "whitespace-pre-wrap text-sm leading-6", children: [text, active ? _jsx("span", { className: "ml-1 inline-block h-4 w-2 animate-pulse rounded bg-accent align-middle" }) : null] }) }));
}
