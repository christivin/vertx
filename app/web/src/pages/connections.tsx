import { mockConnections } from "@/shared/api/mock-data";
import { ConnectionCard } from "@/shared/ui/connection-card";
import { PageHeader } from "@/shared/ui/page-header";

export function ConnectionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="接入管理" description="连接状态、安装状态和回调状态使用 product API，连接后的活跃事件再通过 realtime 补充。" />
      <div className="grid gap-4 lg:grid-cols-2">
        {mockConnections.map((item) => (
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
