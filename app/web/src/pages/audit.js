import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { mockAuditEvents } from "@/shared/api/mock-data";
import { DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
export function AuditPage() {
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "\u5BA1\u8BA1\u4E0E\u65E5\u5FD7", description: "\u5BA1\u8BA1\u9875\u5148\u901A\u8FC7 Product API \u5C55\u793A\u5173\u952E\u4E8B\u4EF6\u6458\u8981\uFF0C\u8FD0\u884C\u4E2D\u7684\u5B9E\u65F6\u72B6\u6001\u4ECD\u7531\u4F1A\u8BDD\u4E0E\u8FD0\u884C\u8BE6\u60C5\u8D1F\u8D23\u3002" }), _jsx(DataTable, { columns: [
                    { key: "action", title: "事件", render: (item) => item.action },
                    { key: "level", title: "级别", render: (item) => item.level },
                    { key: "time", title: "发生时间", render: (item) => item.happenedAt },
                ], rows: mockAuditEvents })] }));
}
