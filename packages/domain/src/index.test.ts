import { describe, expect, it } from "vitest";
import {
  createInMemoryProductApiRepository,
  createProductApiStore,
  mirrorRealtimeEventToProductApiRepository,
} from "./index";

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

  it("can run against an injected repository boundary", () => {
    const repository = createInMemoryProductApiRepository();
    const store = createProductApiStore(repository);

    store.createWorkflow({ name: "外部仓储流程" });

    expect(repository.listWorkflows()[0]).toMatchObject({
      name: "外部仓储流程",
    });
    expect(repository.listAuditEvents()[0]).toMatchObject({
      action: "workflow.created",
    });
  });

  it("mirrors realtime run status events into run and audit state", () => {
    const repository = createInMemoryProductApiRepository();

    mirrorRealtimeEventToProductApiRepository(repository, {
      event: "run.status",
      payload: {
        runId: "openclaw-run-1",
        sessionKey: "agent:main:main",
        status: "started",
        ts: 1_700_000_000_000,
      },
    });
    mirrorRealtimeEventToProductApiRepository(repository, {
      event: "run.status",
      payload: {
        runId: "openclaw-run-1",
        sessionKey: "agent:main:main",
        status: "completed",
        ts: 1_700_000_001_000,
      },
    });

    expect(repository.getRunDetail("openclaw-run-1")).toMatchObject({
      id: "openclaw-run-1",
      workflowId: "agent:main:main",
      status: "completed",
    });
    expect(repository.listAuditEvents()[0]).toMatchObject({
      action: "runtime.run.completed",
    });
  });

  it("mirrors realtime chat and session events into session state", () => {
    const repository = createInMemoryProductApiRepository();

    mirrorRealtimeEventToProductApiRepository(repository, {
      event: "chat",
      payload: {
        runId: "openclaw-run-2",
        sessionKey: "session-openclaw-1",
        state: "delta",
      },
    });
    mirrorRealtimeEventToProductApiRepository(repository, {
      event: "session.message",
      payload: {
        sessionKey: "session-openclaw-1",
        ts: 1_700_000_002_000,
      },
    });
    mirrorRealtimeEventToProductApiRepository(repository, {
      event: "chat",
      payload: {
        runId: "openclaw-run-2",
        sessionKey: "session-openclaw-1",
        state: "final",
      },
    });

    expect(repository.getSessionDetail("session-openclaw-1")).toMatchObject({
      id: "session-openclaw-1",
      channelType: "openclaw",
      status: "ended",
      messageCount: 2,
    });
    expect(repository.getRunDetail("openclaw-run-2")).toMatchObject({
      status: "completed",
    });
  });

  it("mirrors tool status events into run summaries and audit events", () => {
    const repository = createInMemoryProductApiRepository();

    mirrorRealtimeEventToProductApiRepository(repository, {
      event: "tool.status",
      payload: {
        runId: "openclaw-run-3",
        sessionKey: "session-openclaw-3",
        name: "feishu.search_docs",
        phase: "failed",
        updatedAt: "2026-04-20T09:00:00.000Z",
      },
    });

    expect(repository.getRunDetail("openclaw-run-3")).toMatchObject({
      id: "openclaw-run-3",
      status: "failed",
      resultSummary: "工具 feishu.search_docs 状态：failed",
    });
    expect(repository.listAuditEvents()[0]).toMatchObject({
      action: "runtime.tool.failed",
    });
  });
});
