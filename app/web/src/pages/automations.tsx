import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export function AutomationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="自动化" description="自动化列表和执行历史将归属于 Product Data Plane。" />
      <EmptyState title="自动化骨架已就位" description="下一步接 `automation` 资源与执行历史。" />
    </div>
  );
}
