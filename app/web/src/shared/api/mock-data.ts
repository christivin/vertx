import type {
  AuditEventSummary,
  ChannelConnectionSummary,
  SessionSummary,
  SettingsDetail,
  WorkbenchSummary,
  WorkflowRunSummary,
  WorkflowSummary,
} from "@vertx/api";

export const mockWorkbench: WorkbenchSummary = {
  pendingApprovals: 2,
  recentRuns: 12,
  recentSessions: 6,
  connectedChannels: 1,
};

export const mockWorkflows: WorkflowSummary[] = [
  { id: "wf-1", name: "飞书日报汇总", status: "active", lastRunAt: "2026-04-20T08:05:00.000Z" },
  { id: "wf-2", name: "巡检提醒", status: "draft", lastRunAt: "2026-04-20T07:35:00.000Z" },
];

export const mockRuns: WorkflowRunSummary[] = [
  { id: "run-1", workflowId: "wf-1", title: "飞书日报汇总", status: "running", startedAt: "2026-04-20T08:10:00.000Z" },
  { id: "run-2", workflowId: "wf-2", title: "巡检提醒", status: "failed", startedAt: "2026-04-20T07:00:00.000Z" },
];

export const mockSessions: SessionSummary[] = [
  { id: "session-1", title: "日报汇总会话", channelType: "feishu", status: "active", updatedAt: "2026-04-20T08:12:00.000Z" },
  { id: "session-2", title: "文档总结会话", channelType: "web", status: "ended", updatedAt: "2026-04-20T06:45:00.000Z" },
];

export const mockConnections: ChannelConnectionSummary[] = [
  { id: "conn-feishu", channelType: "feishu", status: "connected", lastActiveAt: "2026-04-20T08:00:00.000Z" },
  { id: "conn-wecom", channelType: "wecom", status: "offline", lastActiveAt: "2026-04-19T12:00:00.000Z" },
];

export const mockSettings: SettingsDetail = {
  defaultModel: "gpt-5.2",
  realtimeMode: "proxy-openclaw-events",
  workspaceName: "Vertx Workspace",
};

export const mockAuditEvents: AuditEventSummary[] = [
  { id: "audit-1", action: "workflow.run.started", level: "info", happenedAt: "2026-04-20T08:10:00.000Z" },
  { id: "audit-2", action: "approval.requested", level: "warning", happenedAt: "2026-04-20T08:13:00.000Z" },
];
