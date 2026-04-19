import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function DataTable({ columns, rows }) {
    return (_jsx("div", { className: "overflow-hidden rounded-[24px] border border-border-subtle", children: _jsxs("table", { className: "w-full border-collapse bg-surface-1 text-left", children: [_jsx("thead", { className: "bg-surface-3 text-sm text-text-secondary", children: _jsx("tr", { children: columns.map((column) => (_jsx("th", { className: "px-4 py-3 font-medium", children: column.title }, column.key))) }) }), _jsx("tbody", { children: rows.map((row, index) => (_jsx("tr", { className: "border-t border-border-subtle", children: columns.map((column) => (_jsx("td", { className: "px-4 py-3 text-sm", children: column.render(row) }, column.key))) }, index))) })] }) }));
}
