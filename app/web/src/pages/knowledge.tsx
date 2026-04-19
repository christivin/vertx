import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export function KnowledgePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="知识" description="v1 先保留知识源管理与问答入口骨架，后续接 `knowledge_source` 资源。" />
      <EmptyState title="知识模块待接入" description="下一步接 Product API 与上传链路。" />
    </div>
  );
}
