import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PageHeader({ title, description, actions }) {
    return (_jsxs("div", { className: "mb-6 flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-semibold tracking-tight", children: title }), _jsx("p", { className: "mt-2 text-sm text-text-muted", children: description })] }), actions] }));
}
