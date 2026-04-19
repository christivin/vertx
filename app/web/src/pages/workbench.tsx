import { mockWorkbench, mockWorkflows } from "@/shared/api/mock-data";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionCard } from "@/shared/ui/section-card";
import { TaskComposer } from "@/shared/ui/task-composer";

export function WorkbenchPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="工作台" description="从这里发起流程、追踪最近运行，并观察飞书入口健康度。" />
      <TaskComposer />
      <div className="grid gap-4 lg:grid-cols-4">
        <SectionCard title="待处理审批">{mockWorkbench.pendingApprovals}</SectionCard>
        <SectionCard title="最近运行">{mockWorkbench.recentRuns}</SectionCard>
        <SectionCard title="最近会话">{mockWorkbench.recentSessions}</SectionCard>
        <SectionCard title="已接入通道">{mockWorkbench.connectedChannels}</SectionCard>
      </div>
      <SectionCard title="快捷流程入口" eyebrow="Quick Start">
        <div className="grid gap-4 md:grid-cols-2">
          {mockWorkflows.map((workflow) => (
            <div key={workflow.id} className="rounded-[20px] bg-surface-3 p-4">
              <p className="font-medium">{workflow.name}</p>
              <p className="mt-1 text-sm text-text-muted">适合从 Web 或飞书直接触发。</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
