import { useSettingsDetail, useUpdateSettingsMutation } from "@/shared/api/queries";
import { CustomTabs } from "@/shared/ui/custom-tabs";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionCard } from "@/shared/ui/section-card";
import { StatusBadge } from "@/shared/ui/status-badge";
import { useEffect, useState } from "react";

export function SettingsPage() {
  const [tab, setTab] = useState("model");
  const [draft, setDraft] = useState({
    defaultModel: "",
    realtimeMode: "",
    workspaceName: "",
  });
  const settingsQuery = useSettingsDetail();
  const updateSettingsMutation = useUpdateSettingsMutation();

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }
    setDraft({
      defaultModel: settingsQuery.data.defaultModel,
      realtimeMode: settingsQuery.data.realtimeMode,
      workspaceName: settingsQuery.data.workspaceName,
    });
  }, [settingsQuery.data]);

  if (settingsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="设置" description="保持 `vertagent system-settings` 的 tabs 节奏，但语义切换为 Vertx 的模型、工作区和实时模式。" />
        <ErrorState title="设置加载失败" description="Product API 当前不可用，请检查 Vertx API 配置或继续使用 mock fallback。" />
      </div>
    );
  }

  const settings = settingsQuery.data;
  const isDirty =
    draft.defaultModel !== (settings?.defaultModel ?? "") ||
    draft.realtimeMode !== (settings?.realtimeMode ?? "") ||
    draft.workspaceName !== (settings?.workspaceName ?? "");

  const saveDraft = () => {
    updateSettingsMutation.mutate({
      defaultModel: draft.defaultModel.trim(),
      realtimeMode: draft.realtimeMode.trim(),
      workspaceName: draft.workspaceName.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="设置"
        description="保持 `vertagent system-settings` 的 tabs 节奏，但语义切换为 Vertx 的模型、工作区和实时模式。"
        actions={
          updateSettingsMutation.isSuccess ? <StatusBadge label="已保存" tone="success" /> : <StatusBadge label={isDirty ? "待保存" : "已同步"} tone={isDirty ? "warning" : "neutral"} />
        }
      />
      <CustomTabs
        items={[
          { key: "model", label: "模型配置" },
          { key: "general", label: "通用设置" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />
      <SectionCard
        title={tab === "model" ? "模型配置" : "通用设置"}
        actions={
          <button
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={!isDirty || updateSettingsMutation.isPending}
            onClick={saveDraft}
          >
            {updateSettingsMutation.isPending ? "保存中..." : "保存设置"}
          </button>
        }
      >
        <div className="grid gap-4 text-sm">
          {tab === "model" ? (
            <>
              <label className="grid gap-2">
                <span className="text-text-muted">默认模型</span>
                <input
                  className="rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none transition focus:border-border-strong"
                  value={draft.defaultModel}
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      defaultModel: event.target.value,
                    }));
                  }}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-text-muted">Realtime 模式</span>
                <select
                  className="rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none transition focus:border-border-strong"
                  value={draft.realtimeMode}
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      realtimeMode: event.target.value,
                    }));
                  }}
                >
                  <option value="proxy-openclaw-events">proxy-openclaw-events</option>
                  <option value="mirror-product-api">mirror-product-api</option>
                  <option value="mock-only">mock-only</option>
                </select>
              </label>
            </>
          ) : (
            <label className="grid gap-2">
              <span className="text-text-muted">工作区名称</span>
              <input
                className="rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3 outline-none transition focus:border-border-strong"
                value={draft.workspaceName}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    workspaceName: event.target.value,
                  }));
                }}
              />
            </label>
          )}
          <div className="rounded-[20px] border border-dashed border-border-subtle bg-surface-2 px-4 py-3 text-sm text-text-secondary">
            {updateSettingsMutation.data
              ? `最近一次保存已写回 Product API：默认模型 ${updateSettingsMutation.data.defaultModel}，Realtime 模式 ${updateSettingsMutation.data.realtimeMode}。`
              : "当前设置保存后会回写 Product API，并通过审计日志记录 settings.updated 事件。"}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
