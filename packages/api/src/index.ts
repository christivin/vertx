export type WorkbenchSummary = {
  pendingApprovals: number;
  recentRuns: number;
  recentSessions: number;
  connectedChannels: number;
};

export type WorkflowSummary = {
  id: string;
  name: string;
  status: "draft" | "active" | "paused";
  lastRunAt: string;
};

export type WorkflowDetail = WorkflowSummary & {
  description?: string;
};

export type WorkflowRunSummary = {
  id: string;
  workflowId: string;
  title: string;
  status: "queued" | "running" | "completed" | "failed";
  startedAt: string;
};

export type WorkflowRunDetail = WorkflowRunSummary & {
  resultSummary?: string;
};

export type SessionSummary = {
  id: string;
  title: string;
  channelType: string;
  status: "active" | "ended";
  updatedAt: string;
};

export type SessionDetail = SessionSummary & {
  messageCount?: number;
};

export type ChannelConnectionSummary = {
  id: string;
  channelType: string;
  status: "connected" | "offline" | "pending";
  lastActiveAt: string;
};

export type SettingsDetail = {
  defaultModel: string;
  realtimeMode: string;
  workspaceName: string;
};

export type AuditEventSummary = {
  id: string;
  action: string;
  level: "info" | "warning" | "error";
  happenedAt: string;
};
