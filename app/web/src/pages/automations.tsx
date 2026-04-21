import {
  useAutomationSummaries,
  useCreateAutomationMutation,
  useRunAutomationMutation,
  useToggleAutomationMutation,
} from "@/shared/api/queries";
import { CustomTabs } from "@/shared/ui/custom-tabs";
import { DataTable } from "@/shared/ui/data-table";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionCard } from "@/shared/ui/section-card";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useState } from "react";

function statusTone(status: "active" | "paused") {
  return status === "active" ? ("success" as const) : ("warning" as const);
}

export function AutomationsPage() {
  const [tab, setTab] = useState("all");
  const [draftName, setDraftName] = useState("");
  const [triggerType, setTriggerType] = useState<"schedule" | "event" | "manual">("schedule");
  const automationsQuery = useAutomationSummaries();
  const createAutomationMutation = useCreateAutomationMutation();
  const toggleAutomationMutation = useToggleAutomationMutation();
  const runAutomationMutation = useRunAutomationMutation();

  if (automationsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="自动化" description="自动化列表、状态切换和手动触发现在直接走 Product Data Plane。" />
        <ErrorState title="自动化加载失败" description="Product API 当前不可用，请检查 Vertx API 配置或继续使用 mock fallback。" />
      </div>
    );
  }

  const createAutomation = () => {
    createAutomationMutation.mutate({
      name: draftName.trim(),
      triggerType,
    });
    setDraftName("");
  };

  const allAutomations = automationsQuery.data ?? [];
  const automations =
    tab === "all" ? allAutomations : allAutomations.filter((item) => item.status === tab);

  return (
    <div className="space-y-6">
      <PageHeader title="自动化" description="自动化列表、状态切换和手动触发现在直接走 Product Data Plane。" />
      <SectionCard
        title="新增自动化"
        actions={
          <button
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={createAutomationMutation.isPending}
            onClick={createAutomation}
          >
            {createAutomationMutation.isPending ? "创建中..." : "创建自动化"}
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <label className="grid gap-2 text-sm">
            <span className="text-text-muted">自动化名称</span>
            <input
              className="rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none transition focus:border-border-strong"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="例如：每天 8 点汇总飞书日报"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-text-muted">触发方式</span>
            <select
              className="rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none transition focus:border-border-strong"
              value={triggerType}
              onChange={(event) => setTriggerType(event.target.value as "schedule" | "event" | "manual")}
            >
              <option value="schedule">schedule</option>
              <option value="event">event</option>
              <option value="manual">manual</option>
            </select>
          </label>
        </div>
      </SectionCard>
      <CustomTabs
        items={[
          { key: "all", label: "全部" },
          { key: "active", label: "启用中" },
          { key: "paused", label: "已暂停" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />
      <DataTable
        columns={[
          { key: "name", title: "自动化", render: (item) => item.name },
          { key: "triggerType", title: "触发方式", render: (item) => item.triggerType },
          {
            key: "status",
            title: "状态",
            render: (item) => <StatusBadge label={item.status} tone={statusTone(item.status)} />,
          },
          { key: "lastRunAt", title: "上次运行", render: (item) => item.lastRunAt ?? "未运行" },
          { key: "nextRunAt", title: "下次运行", render: (item) => item.nextRunAt ?? "待触发" },
          {
            key: "actions",
            title: "操作",
            render: (item) => (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-primary disabled:opacity-50"
                  disabled={toggleAutomationMutation.isPending}
                  onClick={() => toggleAutomationMutation.mutate(item.id)}
                >
                  {item.status === "active" ? "暂停" : "启用"}
                </button>
                <button
                  type="button"
                  className="rounded-full bg-surface-3 px-3 py-1.5 text-xs text-text-primary disabled:opacity-50"
                  disabled={runAutomationMutation.isPending}
                  onClick={() => runAutomationMutation.mutate(item.id)}
                >
                  立即触发
                </button>
              </div>
            ),
          },
        ]}
        rows={automations}
      />
    </div>
  );
}
