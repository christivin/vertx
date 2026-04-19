import { PageHeader } from "@/shared/ui/page-header";
import { RunTimeline } from "@/shared/ui/run-timeline";
import { SectionCard } from "@/shared/ui/section-card";
import { ToolCallCard } from "@/shared/ui/tool-call-card";

export function RunDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="运行详情" description="这里会成为 run status、timeline、tool cards、result summary 的主页面。" />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="执行时间线">
          <RunTimeline
            items={[
              { title: "收到飞书触发", description: "来自飞书机器人的日报汇总请求。", tone: "success" },
              { title: "读取日报文档", description: "进入 openclaw runtime 并调用知识检索工具。", tone: "warning" },
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
