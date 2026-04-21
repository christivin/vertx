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

  it("creates knowledge sources and records audit events", () => {
    const store = createProductApiStore();

    const knowledgeSource = store.createKnowledgeSource({
      name: "售前 FAQ",
      sourceType: "faq",
    });

    expect(knowledgeSource).toMatchObject({
      name: "售前 FAQ",
      sourceType: "faq",
      status: "syncing",
    });
    expect(store.listKnowledgeSources()[0]).toMatchObject({
      id: knowledgeSource.id,
      name: "售前 FAQ",
    });
    expect(store.listAuditEvents()[0]).toMatchObject({
      action: "knowledge_source.created",
    });
  });

  it("creates, toggles, and runs automations", () => {
    const store = createProductApiStore();

    const automation = store.createAutomation({
      name: "每周巡检提醒",
      triggerType: "schedule",
    });
    expect(automation).toMatchObject({
      name: "每周巡检提醒",
      status: "active",
    });

    const pausedAutomation = store.toggleAutomation(automation.id);
    expect(pausedAutomation).toMatchObject({
      id: automation.id,
      status: "paused",
    });

    const triggeredAutomation = store.runAutomation(automation.id);
    expect(triggeredAutomation).toMatchObject({
      id: automation.id,
      lastRunAt: expect.any(String),
    });
    expect(store.listAuditEvents().map((item) => item.action)).toEqual(
      expect.arrayContaining(["automation.created", "automation.paused", "automation.run.triggered"]),
    );
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

  it("mirrors sessions.changed events without requiring a transcript message", () => {
    const repository = createInMemoryProductApiRepository();

    mirrorRealtimeEventToProductApiRepository(repository, {
      event: "sessions.changed",
      payload: {
        sessionKey: "session-openclaw-2",
        status: "active",
        updatedAt: "2026-04-20T10:05:00.000Z",
      },
    });
    mirrorRealtimeEventToProductApiRepository(repository, {
      event: "sessions.changed",
      payload: {
        sessionKey: "session-openclaw-2",
        status: "ended",
        updatedAt: "2026-04-20T10:06:00.000Z",
      },
    });

    expect(repository.getSessionDetail("session-openclaw-2")).toMatchObject({
      id: "session-openclaw-2",
      status: "ended",
      messageCount: 0,
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

  it("mirrors approval events into workbench counters and audit events", () => {
    const repository = createInMemoryProductApiRepository();
    const initialPendingApprovals = repository.getWorkbenchState().pendingApprovals;

    mirrorRealtimeEventToProductApiRepository(repository, {
      event: "approval.requested",
      payload: {
        approvalId: "approval-openclaw-1",
        title: "允许执行飞书文档写入",
      },
    });

    expect(repository.getWorkbenchState().pendingApprovals).toBe(initialPendingApprovals + 1);
    expect(repository.listAuditEvents()[0]).toMatchObject({
      action: "runtime.approval.requested.approval-openclaw-1",
      level: "warning",
    });

    mirrorRealtimeEventToProductApiRepository(repository, {
      event: "approval.resolved",
      payload: {
        approvalId: "approval-openclaw-1",
        approved: true,
      },
    });

    expect(repository.getWorkbenchState().pendingApprovals).toBe(initialPendingApprovals);
    expect(repository.listAuditEvents()[0]).toMatchObject({
      action: "runtime.approval.resolved.approval-openclaw-1",
      level: "info",
    });
  });
});
