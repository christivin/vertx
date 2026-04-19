import { mockAuditEvents } from "@/shared/api/mock-data";
import { DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";

export function AuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="审计与日志" description="审计页先通过 Product API 展示关键事件摘要，运行中的实时状态仍由会话与运行详情负责。" />
      <DataTable
        columns={[
          { key: "action", title: "事件", render: (item) => item.action },
          { key: "level", title: "级别", render: (item) => item.level },
          { key: "time", title: "发生时间", render: (item) => item.happenedAt },
        ]}
        rows={mockAuditEvents}
      />
    </div>
  );
}
