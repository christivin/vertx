import { useConnectFeishuMutation, useChannelConnectionSummaries } from "@/shared/api/queries";
import { ConnectionCard } from "@/shared/ui/connection-card";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionCard } from "@/shared/ui/section-card";
import { StatusBadge } from "@/shared/ui/status-badge";

export function ConnectionsPage() {
  const connectionsQuery = useChannelConnectionSummaries();
  const connectFeishuMutation = useConnectFeishuMutation();

  if (connectionsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="接入管理" description="连接状态、安装状态和回调状态使用 product API，连接后的活跃事件再通过 realtime 补充。" />
        <ErrorState title="接入状态加载失败" description="Product API 当前不可用，请检查 Vertx API 配置或继续使用 mock fallback。" />
      </div>
    );
  }

  const connections = connectionsQuery.data ?? [];
  const connectedCount = connections.filter((item) => item.status === "connected").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="接入管理"
        description="连接状态、安装状态和回调状态使用 product API，连接后的活跃事件再通过 realtime 补充。"
        actions={<StatusBadge label={`已连接 ${connectedCount}/${connections.length}`} tone={connectedCount > 0 ? "success" : "warning"} />}
      />
      <SectionCard title="连接动作" eyebrow="channel connections">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={connectFeishuMutation.isPending}
            onClick={() => connectFeishuMutation.mutate()}
          >
            {connectFeishuMutation.isPending ? "连接飞书中..." : "连接飞书"}
          </button>
          <button
            className="rounded-full border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={connectionsQuery.isFetching}
            onClick={() => {
              void connectionsQuery.refetch();
            }}
          >
            {connectionsQuery.isFetching ? "刷新中..." : "刷新状态"}
          </button>
          {connectFeishuMutation.data ? (
            <p className="text-sm text-text-secondary">
              已完成 {connectFeishuMutation.data.channelType.toUpperCase()} 连接，最近活跃时间已更新为 {connectFeishuMutation.data.lastActiveAt}。
            </p>
          ) : (
            <p className="text-sm text-text-muted">当前优先闭环飞书接入，其他通道先保留状态查看能力。</p>
          )}
        </div>
      </SectionCard>
      <div className="grid gap-4 lg:grid-cols-2">
        {connections.map((item) => (
          <ConnectionCard
            key={item.id}
            name={item.channelType.toUpperCase()}
            description={`最近活跃于 ${item.lastActiveAt}`}
            status={item.status === "connected" ? "connected" : "offline"}
            actionLabel={item.channelType === "feishu" ? "重新连接" : "暂未开放"}
            actionDisabled={item.channelType !== "feishu" || connectFeishuMutation.isPending}
            onAction={item.channelType === "feishu" ? () => connectFeishuMutation.mutate() : undefined}
          />
        ))}
      </div>
    </div>
  );
}
