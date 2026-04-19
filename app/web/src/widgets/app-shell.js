import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, NavLink } from "react-router-dom";
const navItems = [
    ["工作台", "/workbench"],
    ["流程", "/workflows"],
    ["会话", "/sessions"],
    ["知识", "/knowledge"],
    ["自动化", "/automations"],
    ["接入管理", "/connections"],
    ["审计", "/audit"],
    ["设置", "/settings"],
];
export function AppShell() {
    return (_jsx("div", { className: "min-h-screen bg-app-bg text-text-primary", children: _jsxs("div", { className: "mx-auto flex min-h-screen max-w-[1600px]", children: [_jsxs("aside", { className: "w-[220px] shrink-0 border-r border-border-subtle bg-surface-2/90 px-4 py-6 backdrop-blur", children: [_jsxs("div", { className: "mb-8 flex items-center gap-3 px-2", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground font-semibold", children: "V" }), _jsxs("div", { children: [_jsx("p", { className: "text-lg font-semibold leading-none", children: "Vertx" }), _jsx("p", { className: "mt-1 text-xs text-text-muted", children: "Workbench v1" })] })] }), _jsx("nav", { className: "space-y-1", children: navItems.map(([label, to]) => (_jsx(NavLink, { to: to, className: ({ isActive }) => [
                                    "flex rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-surface-1 text-text-primary shadow-card"
                                        : "text-text-secondary hover:bg-surface-1 hover:text-text-primary",
                                ].join(" "), children: label }, to))) })] }), _jsx("main", { className: "min-w-0 flex-1 px-6 py-6", children: _jsx(Outlet, {}) })] }) }));
}
