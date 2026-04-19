import { useSettingsDetail } from "@/shared/api/queries";
import { CustomTabs } from "@/shared/ui/custom-tabs";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionCard } from "@/shared/ui/section-card";
import { useState } from "react";

export function SettingsPage() {
  const [tab, setTab] = useState("model");
  const settingsQuery = useSettingsDetail();

  if (settingsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="设置" description="保持 `vertagent system-settings` 的 tabs 节奏，但语义切换为 Vertx 的模型、工作区和实时模式。" />
        <ErrorState title="设置加载失败" description="Product API 当前不可用，请检查 Vertx API 配置或继续使用 mock fallback。" />
      </div>
    );
  }

  const settings = settingsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader title="设置" description="保持 `vertagent system-settings` 的 tabs 节奏，但语义切换为 Vertx 的模型、工作区和实时模式。" />
      <CustomTabs
        items={[
          { key: "model", label: "模型配置" },
          { key: "general", label: "通用设置" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />
      <SectionCard title={tab === "model" ? "模型配置" : "通用设置"}>
        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">默认模型</dt>
            <dd>{settings?.defaultModel ?? "..."}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Realtime 模式</dt>
            <dd>{settings?.realtimeMode ?? "..."}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">工作区</dt>
            <dd>{settings?.workspaceName ?? "..."}</dd>
          </div>
        </dl>
      </SectionCard>
    </div>
  );
}
