import { useWorkflowSummaries } from "@/shared/api/queries";
import { DataTable } from "@/shared/ui/data-table";
import { ErrorState } from "@/shared/ui/error-state";
import { FilterBar } from "@/shared/ui/filter-bar";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";
import { CustomTabs } from "@/shared/ui/custom-tabs";
import { useState } from "react";

export function WorkflowsPage() {
  const [tab, setTab] = useState("all");
  const workflowsQuery = useWorkflowSummaries();

  if (workflowsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="流程" description="以企业流程模板为中心查看状态、筛选来源并进入运行详情。" />
        <ErrorState title="流程列表加载失败" description="Product API 当前不可用，请检查 Vertx API 配置或继续使用 mock fallback。" />
      </div>
    );
  }

  const workflows = workflowsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="流程" description="以企业流程模板为中心查看状态、筛选来源并进入运行详情。" />
      <CustomTabs
        items={[
          { key: "all", label: "全部流程" },
          { key: "active", label: "启用中" },
          { key: "draft", label: "草稿" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />
      <FilterBar />
      <DataTable
        columns={[
          { key: "name", title: "流程名", render: (item) => item.name },
          {
            key: "status",
            title: "状态",
            render: (item) => <StatusBadge label={item.status} tone={item.status === "active" ? "success" : "neutral"} />,
          },
          { key: "run", title: "最近运行", render: (item) => item.lastRunAt },
        ]}
        rows={workflows.filter((item) => (tab === "all" ? true : item.status === tab))}
      />
    </div>
  );
}
