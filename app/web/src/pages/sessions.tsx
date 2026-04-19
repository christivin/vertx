import { useSessionSummaries } from "@/shared/api/queries";
import { DataTable } from "@/shared/ui/data-table";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

export function SessionsPage() {
  const sessionsQuery = useSessionSummaries();

  if (sessionsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="会话" description="会话列表使用 product API，活跃对话的实时状态将在详情页中通过 realtime plane 渲染。" />
        <ErrorState title="会话列表加载失败" description="Product API 当前不可用，请检查 Vertx API 配置或继续使用 mock fallback。" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="会话" description="会话列表使用 product API，活跃对话的实时状态将在详情页中通过 realtime plane 渲染。" />
      <DataTable
        columns={[
          { key: "title", title: "会话名", render: (item) => item.title },
          { key: "channel", title: "来源", render: (item) => item.channelType },
          {
            key: "status",
            title: "状态",
            render: (item) => <StatusBadge label={item.status} tone={item.status === "active" ? "success" : "neutral"} />,
          },
        ]}
        rows={sessionsQuery.data ?? []}
      />
    </div>
  );
}
