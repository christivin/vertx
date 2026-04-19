import { useChannelConnectionSummaries } from "@/shared/api/queries";
import { ConnectionCard } from "@/shared/ui/connection-card";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";

export function ConnectionsPage() {
  const connectionsQuery = useChannelConnectionSummaries();

  if (connectionsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="接入管理" description="连接状态、安装状态和回调状态使用 product API，连接后的活跃事件再通过 realtime 补充。" />
        <ErrorState title="接入状态加载失败" description="Product API 当前不可用，请检查 Vertx API 配置或继续使用 mock fallback。" />
      </div>
    );
  }

  const connections = connectionsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="接入管理" description="连接状态、安装状态和回调状态使用 product API，连接后的活跃事件再通过 realtime 补充。" />
      <div className="grid gap-4 lg:grid-cols-2">
        {connections.map((item) => (
          <ConnectionCard
            key={item.id}
            name={item.channelType.toUpperCase()}
            description={`最近活跃于 ${item.lastActiveAt}`}
            status={item.status === "connected" ? "connected" : "offline"}
          />
        ))}
      </div>
    </div>
  );
}
