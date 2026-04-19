import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { mockSettings } from "@/shared/api/mock-data";
import { CustomTabs } from "@/shared/ui/custom-tabs";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionCard } from "@/shared/ui/section-card";
import { useState } from "react";
export function SettingsPage() {
    const [tab, setTab] = useState("model");
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "\u8BBE\u7F6E", description: "\u4FDD\u6301 `vertagent system-settings` \u7684 tabs \u8282\u594F\uFF0C\u4F46\u8BED\u4E49\u5207\u6362\u4E3A Vertx \u7684\u6A21\u578B\u3001\u5DE5\u4F5C\u533A\u548C\u5B9E\u65F6\u6A21\u5F0F\u3002" }), _jsx(CustomTabs, { items: [
                    { key: "model", label: "模型配置" },
                    { key: "general", label: "通用设置" },
                ], activeKey: tab, onChange: setTab }), _jsx(SectionCard, { title: tab === "model" ? "模型配置" : "通用设置", children: _jsxs("dl", { className: "grid gap-3 text-sm", children: [_jsxs("div", { className: "flex justify-between gap-4", children: [_jsx("dt", { className: "text-text-muted", children: "\u9ED8\u8BA4\u6A21\u578B" }), _jsx("dd", { children: mockSettings.defaultModel })] }), _jsxs("div", { className: "flex justify-between gap-4", children: [_jsx("dt", { className: "text-text-muted", children: "Realtime \u6A21\u5F0F" }), _jsx("dd", { children: mockSettings.realtimeMode })] }), _jsxs("div", { className: "flex justify-between gap-4", children: [_jsx("dt", { className: "text-text-muted", children: "\u5DE5\u4F5C\u533A" }), _jsx("dd", { children: mockSettings.workspaceName })] })] }) })] }));
}
