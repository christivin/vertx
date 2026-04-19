import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export function WorkflowDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="流程详情" description="此页面将承接流程配置、参数说明和最近运行摘要。" />
      <EmptyState title="流程详情骨架已就位" description="下一步接入 workflow detail、参数 schema 与运行入口。" />
    </div>
  );
}
