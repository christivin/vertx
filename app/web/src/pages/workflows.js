import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { mockWorkflows } from "@/shared/api/mock-data";
import { DataTable } from "@/shared/ui/data-table";
import { FilterBar } from "@/shared/ui/filter-bar";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { CustomTabs } from "@/shared/ui/custom-tabs";
import { useState } from "react";
export function WorkflowsPage() {
    const [tab, setTab] = useState("all");
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "\u6D41\u7A0B", description: "\u4EE5\u4F01\u4E1A\u6D41\u7A0B\u6A21\u677F\u4E3A\u4E2D\u5FC3\u67E5\u770B\u72B6\u6001\u3001\u7B5B\u9009\u6765\u6E90\u5E76\u8FDB\u5165\u8FD0\u884C\u8BE6\u60C5\u3002" }), _jsx(CustomTabs, { items: [
                    { key: "all", label: "全部流程" },
                    { key: "active", label: "启用中" },
                    { key: "draft", label: "草稿" },
                ], activeKey: tab, onChange: setTab }), _jsx(FilterBar, {}), _jsx(DataTable, { columns: [
                    { key: "name", title: "流程名", render: (item) => item.name },
                    {
                        key: "status",
                        title: "状态",
                        render: (item) => _jsx(StatusBadge, { label: item.status, tone: item.status === "active" ? "success" : "neutral" }),
                    },
                    { key: "run", title: "最近运行", render: (item) => item.lastRunAt },
                ], rows: mockWorkflows.filter((item) => (tab === "all" ? true : item.status === tab)) })] }));
}
