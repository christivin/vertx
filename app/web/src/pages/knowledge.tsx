import { useCreateKnowledgeSourceMutation, useKnowledgeSourceSummaries } from "@/shared/api/queries";
import { DataTable } from "@/shared/ui/data-table";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionCard } from "@/shared/ui/section-card";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useState } from "react";

function statusTone(status: "ready" | "syncing" | "error") {
  if (status === "ready") {
    return "success" as const;
  }
  if (status === "syncing") {
    return "warning" as const;
  }
  return "danger" as const;
}

export function KnowledgePage() {
  const knowledgeSourcesQuery = useKnowledgeSourceSummaries();
  const createKnowledgeSourceMutation = useCreateKnowledgeSourceMutation();
  const [draftName, setDraftName] = useState("");
  const [sourceType, setSourceType] = useState<"feishu-doc" | "web-upload" | "faq">("web-upload");

  const createKnowledgeSource = () => {
    createKnowledgeSourceMutation.mutate({
      name: draftName.trim(),
      sourceType,
    });
    setDraftName("");
  };

  const knowledgeSources = createKnowledgeSourceMutation.data
    ? [
        createKnowledgeSourceMutation.data,
        ...(knowledgeSourcesQuery.data ?? []).filter((item) => item.id !== createKnowledgeSourceMutation.data?.id),
      ]
    : (knowledgeSourcesQuery.data ?? []);

  if (knowledgeSourcesQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="知识" description="知识源列表与创建动作现在直接走 Product API，为后续问答与检索能力预留统一入口。" />
        <ErrorState title="知识源加载失败" description="Product API 当前不可用，请检查 Vertx API 配置或继续使用 mock fallback。" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="知识" description="知识源列表与创建动作现在直接走 Product API，为后续问答与检索能力预留统一入口。" />
      <SectionCard
        title="新增知识源"
        actions={
          <button
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={createKnowledgeSourceMutation.isPending}
            onClick={createKnowledgeSource}
          >
            {createKnowledgeSourceMutation.isPending ? "创建中..." : "创建知识源"}
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <label className="grid gap-2 text-sm">
            <span className="text-text-muted">知识源名称</span>
            <input
              className="rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none transition focus:border-border-strong"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="例如：售前 FAQ、飞书项目文档"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-text-muted">来源类型</span>
            <select
              className="rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none transition focus:border-border-strong"
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as "feishu-doc" | "web-upload" | "faq")}
            >
              <option value="web-upload">web-upload</option>
              <option value="feishu-doc">feishu-doc</option>
              <option value="faq">faq</option>
            </select>
          </label>
        </div>
        {createKnowledgeSourceMutation.data ? (
          <p className="mt-4 text-sm text-text-secondary">
            最近创建：{createKnowledgeSourceMutation.data.name}，当前状态为 {createKnowledgeSourceMutation.data.status}。
          </p>
        ) : null}
      </SectionCard>
      <DataTable
        columns={[
          { key: "name", title: "知识源", render: (item) => item.name },
          { key: "sourceType", title: "来源类型", render: (item) => item.sourceType },
          {
            key: "status",
            title: "同步状态",
            render: (item) => <StatusBadge label={item.status} tone={statusTone(item.status)} />,
          },
          { key: "documentCount", title: "文档数", render: (item) => item.documentCount },
          { key: "updatedAt", title: "更新时间", render: (item) => item.updatedAt },
        ]}
        rows={knowledgeSources}
      />
    </div>
  );
}
