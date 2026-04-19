import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { mockSessions } from "@/shared/api/mock-data";
import { DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
export function SessionsPage() {
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "\u4F1A\u8BDD", description: "\u4F1A\u8BDD\u5217\u8868\u4F7F\u7528 product API\uFF0C\u6D3B\u8DC3\u5BF9\u8BDD\u7684\u5B9E\u65F6\u72B6\u6001\u5C06\u5728\u8BE6\u60C5\u9875\u4E2D\u901A\u8FC7 realtime plane \u6E32\u67D3\u3002" }), _jsx(DataTable, { columns: [
                    { key: "title", title: "会话名", render: (item) => item.title },
                    { key: "channel", title: "来源", render: (item) => item.channelType },
                    {
                        key: "status",
                        title: "状态",
                        render: (item) => _jsx(StatusBadge, { label: item.status, tone: item.status === "active" ? "success" : "neutral" }),
                    },
                ], rows: mockSessions })] }));
}
