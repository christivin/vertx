import { useAuditEventSummaries } from "@/shared/api/queries";
import { DataTable } from "@/shared/ui/data-table";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";

export function AuditPage() {
  const auditQuery = useAuditEventSummaries();

  if (auditQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="审计与日志" description="审计页先通过 Product API 展示关键事件摘要，运行中的实时状态仍由会话与运行详情负责。" />
        <ErrorState title="审计事件加载失败" description="Product API 当前不可用，请检查 Vertx API 配置或继续使用 mock fallback。" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="审计与日志" description="审计页先通过 Product API 展示关键事件摘要，运行中的实时状态仍由会话与运行详情负责。" />
      <DataTable
        columns={[
          { key: "action", title: "事件", render: (item) => item.action },
          { key: "level", title: "级别", render: (item) => item.level },
          { key: "time", title: "发生时间", render: (item) => item.happenedAt },
        ]}
        rows={auditQuery.data ?? []}
      />
    </div>
  );
}
