import { useStartWorkflowRunMutation, useWorkflowDetail } from "@/shared/api/queries";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionCard } from "@/shared/ui/section-card";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useParams } from "react-router-dom";

export function WorkflowDetailPage() {
  const { workflowId = "" } = useParams();
  const workflowQuery = useWorkflowDetail(workflowId);
  const startRunMutation = useStartWorkflowRunMutation(workflowId);

  if (workflowQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="流程详情" description="此页面承接流程配置、参数说明和最近运行摘要。" />
        <ErrorState title="流程详情加载失败" description="Product API 当前不可用，请检查 Vertx API 配置或继续使用 mock fallback。" />
      </div>
    );
  }

  const workflow = workflowQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={workflow?.name ?? "流程详情"}
        description={workflow?.description ?? "此页面承接流程配置、参数说明和最近运行摘要。"}
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="流程概览"
          actions={
            <button
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-[color:var(--color-accent-contrast)] disabled:opacity-50"
              disabled={!workflow || startRunMutation.isPending}
              onClick={() => startRunMutation.mutate()}
              type="button"
            >
              {startRunMutation.isPending ? "启动中..." : "立即运行"}
            </button>
          }
        >
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">流程 ID</dt>
              <dd>{workflow?.id ?? workflowId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">状态</dt>
              <dd>{workflow ? <StatusBadge label={workflow.status} tone={workflow.status === "active" ? "success" : "neutral"} /> : "..."}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">最近运行</dt>
              <dd>{workflow?.lastRunAt ?? "..."}</dd>
            </div>
          </dl>
        </SectionCard>
        <SectionCard title="运行入口状态">
          <p className="text-sm text-text-secondary">
            {startRunMutation.data
              ? `已创建运行 ${startRunMutation.data.id}，状态为 ${startRunMutation.data.status}。`
              : "当前按钮会调用 Product API 的 workflow run mutation，后续会衔接 OpenClaw runtime 执行。"}
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
