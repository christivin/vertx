import { mockSessions } from "@/shared/api/mock-data";
import { DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

export function SessionsPage() {
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
        rows={mockSessions}
      />
    </div>
  );
}
