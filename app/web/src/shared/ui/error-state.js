import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ErrorState({ title, description }) {
    return (_jsxs("div", { className: "rounded-[24px] border border-[color:rgba(209,65,36,0.2)] bg-[color:rgba(209,65,36,0.06)] px-6 py-10 text-center", children: [_jsx("h3", { className: "text-lg font-semibold text-[color:var(--color-danger)]", children: title }), _jsx("p", { className: "mt-2 text-sm text-text-secondary", children: description })] }));
}
