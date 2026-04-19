import { mockSettings } from "@/shared/api/mock-data";
import { CustomTabs } from "@/shared/ui/custom-tabs";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionCard } from "@/shared/ui/section-card";
import { useState } from "react";

export function SettingsPage() {
  const [tab, setTab] = useState("model");

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
            <dd>{mockSettings.defaultModel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Realtime 模式</dt>
            <dd>{mockSettings.realtimeMode}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">工作区</dt>
            <dd>{mockSettings.workspaceName}</dd>
          </div>
        </dl>
      </SectionCard>
    </div>
  );
}
