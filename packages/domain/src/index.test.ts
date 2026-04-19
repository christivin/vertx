import { describe, expect, it } from "vitest";
import { createProductApiStore } from "./index";

describe("createProductApiStore", () => {
  it("keeps workbench summary derived from runs, sessions, and connected channels", () => {
    const store = createProductApiStore();

    expect(store.getWorkbenchSummary()).toMatchObject({
      recentRuns: 2,
      recentSessions: 2,
      connectedChannels: 1,
    });
  });

  it("creates workflows and records audit events", () => {
    const store = createProductApiStore();

    const workflow = store.createWorkflow({
      name: "知识库巡检",
      description: "定时检查知识源更新状态",
    });

    expect(workflow).toMatchObject({
      name: "知识库巡检",
      status: "draft",
    });
    expect(store.getWorkflowDetail(workflow.id)).toMatchObject({
      description: "定时检查知识源更新状态",
    });
    expect(store.listWorkflows()[0]).toMatchObject({
      id: workflow.id,
      name: "知识库巡检",
    });
    expect(store.listAuditEvents()[0]).toMatchObject({
      action: "workflow.created",
    });
  });

  it("creates and retries workflow runs", () => {
    const store = createProductApiStore();

    const run = store.startWorkflowRun("wf-1");
    expect(run).toMatchObject({
      workflowId: "wf-1",
      status: "queued",
    });

    const retryRun = store.retryRun(run?.id ?? "");
    expect(retryRun).toMatchObject({
      workflowId: "wf-1",
      status: "queued",
    });
    expect(store.listAuditEvents()[0]).toMatchObject({
      action: "workflow.run.retried",
    });
  });

  it("updates feishu connection and settings as domain actions", () => {
    const store = createProductApiStore();

    expect(store.connectFeishu()).toMatchObject({
      channelType: "feishu",
      status: "connected",
    });
    expect(store.updateSettings({ defaultModel: "gpt-5.4" })).toMatchObject({
      defaultModel: "gpt-5.4",
    });
    expect(store.listAuditEvents()[0]).toMatchObject({
      action: "settings.updated",
    });
  });
});
