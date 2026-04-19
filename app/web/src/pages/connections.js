import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { mockConnections } from "@/shared/api/mock-data";
import { ConnectionCard } from "@/shared/ui/connection-card";
import { PageHeader } from "@/shared/ui/page-header";
export function ConnectionsPage() {
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "\u63A5\u5165\u7BA1\u7406", description: "\u8FDE\u63A5\u72B6\u6001\u3001\u5B89\u88C5\u72B6\u6001\u548C\u56DE\u8C03\u72B6\u6001\u4F7F\u7528 product API\uFF0C\u8FDE\u63A5\u540E\u7684\u6D3B\u8DC3\u4E8B\u4EF6\u518D\u901A\u8FC7 realtime \u8865\u5145\u3002" }), _jsx("div", { className: "grid gap-4 lg:grid-cols-2", children: mockConnections.map((item) => (_jsx(ConnectionCard, { name: item.channelType.toUpperCase(), description: `最近活跃于 ${item.lastActiveAt}`, status: item.status === "connected" ? "connected" : "offline" }, item.id))) })] }));
}
