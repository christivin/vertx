import { useRetryWorkflowRunMutation, useWorkflowRunDetail } from "@/shared/api/queries";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { RunTimeline } from "@/shared/ui/run-timeline";
import { SectionCard } from "@/shared/ui/section-card";
import { StatusBadge } from "@/shared/ui/status-badge";
import { ToolCallCard } from "@/shared/ui/tool-call-card";
import { useParams } from "react-router-dom";

function runTone(status: string) {
  if (status === "completed") {
    return "success" as const;
  }
  if (status === "failed") {
    return "danger" as const;
  }
  if (status === "running") {
    return "warning" as const;
  }
  return "neutral" as const;
}

export function RunDetailPage() {
  const { runId = "" } = useParams();
  const runQuery = useWorkflowRunDetail(runId);
  const retryRunMutation = useRetryWorkflowRunMutation(runId);

  if (runQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="运行详情" description="这里会成为 run status、timeline、tool cards、result summary 的主页面。" />
        <ErrorState title="运行详情加载失败" description="Product API 当前不可用，请检查 Vertx API 配置或继续使用 mock fallback。" />
      </div>
    );
  }

  const run = runQuery.data;
  const tone = run ? runTone(run.status) : "neutral";

  return (
    <div className="space-y-6">
      <PageHeader
        title={run?.title ?? "运行详情"}
        description={run?.resultSummary ?? "这里会成为 run status、timeline、tool cards、result summary 的主页面。"}
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          title="运行摘要"
          actions={
            <button
              className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium disabled:opacity-50"
              disabled={!run || retryRunMutation.isPending}
              onClick={() => retryRunMutation.mutate()}
              type="button"
            >
              {retryRunMutation.isPending ? "重试中..." : "重试运行"}
            </button>
          }
        >
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">运行 ID</dt>
              <dd>{run?.id ?? runId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">流程 ID</dt>
              <dd>{run?.workflowId ?? "..."}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">状态</dt>
              <dd>{run ? <StatusBadge label={run.status} tone={tone} /> : "..."}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">开始时间</dt>
              <dd>{run?.startedAt ?? "..."}</dd>
            </div>
          </dl>
        </SectionCard>
        <SectionCard title="执行时间线">
          <RunTimeline
            items={[
              { title: "创建运行", description: run?.startedAt ?? "等待 Product API 返回运行时间。", tone },
              { title: "等待 runtime", description: "后续会由 OpenClaw realtime plane 补充更细的 tool/run 状态。", tone: "warning" },
            ]}
          />
        </SectionCard>
        <SectionCard title="工具状态">
          <div className="space-y-3">
            <ToolCallCard
              name="feishu.search_docs"
              phase="completed"
              startedAt="2026-04-20T08:12:00.000Z"
              output="命中 18 篇日报文档"
            />
            <ToolCallCard
              name="summary.generate"
              phase="streaming"
              startedAt="2026-04-20T08:13:00.000Z"
              output="正在生成摘要片段..."
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
