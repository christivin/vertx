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

export type KnowledgeSourceSummary = {
  id: string;
  name: string;
  sourceType: "feishu-doc" | "web-upload" | "faq";
  status: "ready" | "syncing" | "error";
  updatedAt: string;
  documentCount: number;
};

export type AutomationSummary = {
  id: string;
  name: string;
  triggerType: "schedule" | "event" | "manual";
  status: "active" | "paused";
  lastRunAt?: string;
  nextRunAt?: string;
};

export type AuditEventSummary = {
  id: string;
  action: string;
  level: "info" | "warning" | "error";
  happenedAt: string;
};

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

export const mockWorkflowDetails: WorkflowDetail[] = [
  {
    id: "wf-1",
    name: "飞书日报汇总",
    status: "active",
    lastRunAt: "2026-04-20T08:05:00.000Z",
    description: "聚合飞书入口中的日报内容，生成结构化汇总并同步到工作台。",
  },
  {
    id: "wf-2",
    name: "巡检提醒",
    status: "draft",
    lastRunAt: "2026-04-20T07:35:00.000Z",
    description: "按预设时间触发巡检任务，并将异常项写入审计事件列表。",
  },
];

export const mockRuns: WorkflowRunSummary[] = [
  { id: "run-1", workflowId: "wf-1", title: "飞书日报汇总", status: "running", startedAt: "2026-04-20T08:10:00.000Z" },
  { id: "run-2", workflowId: "wf-2", title: "巡检提醒", status: "failed", startedAt: "2026-04-20T07:00:00.000Z" },
];

export const mockRunDetails: WorkflowRunDetail[] = [
  {
    id: "run-1",
    workflowId: "wf-1",
    title: "飞书日报汇总",
    status: "running",
    startedAt: "2026-04-20T08:10:00.000Z",
    resultSummary: "等待 OpenClaw runtime 完成流式执行，当前处于工具调用阶段。",
  },
  {
    id: "run-2",
    workflowId: "wf-2",
    title: "巡检提醒",
    status: "failed",
    startedAt: "2026-04-20T07:00:00.000Z",
    resultSummary: "调用外部系统失败，等待人工重试。",
  },
];

export const mockSessions: SessionSummary[] = [
  { id: "session-1", title: "日报汇总会话", channelType: "feishu", status: "active", updatedAt: "2026-04-20T08:12:00.000Z" },
  { id: "session-2", title: "文档总结会话", channelType: "web", status: "ended", updatedAt: "2026-04-20T06:45:00.000Z" },
];

export const mockSessionDetails: SessionDetail[] = [
  {
    id: "session-1",
    title: "日报汇总会话",
    channelType: "feishu",
    status: "active",
    updatedAt: "2026-04-20T08:12:00.000Z",
    messageCount: 14,
  },
  {
    id: "session-2",
    title: "文档总结会话",
    channelType: "web",
    status: "ended",
    updatedAt: "2026-04-20T06:45:00.000Z",
    messageCount: 9,
  },
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

export const mockKnowledgeSources: KnowledgeSourceSummary[] = [
  {
    id: "knowledge-1",
    name: "飞书销售知识库",
    sourceType: "feishu-doc",
    status: "ready",
    updatedAt: "2026-04-20T08:20:00.000Z",
    documentCount: 24,
  },
  {
    id: "knowledge-2",
    name: "FAQ 导入集合",
    sourceType: "faq",
    status: "syncing",
    updatedAt: "2026-04-20T07:55:00.000Z",
    documentCount: 8,
  },
];

export const mockAutomations: AutomationSummary[] = [
  {
    id: "automation-1",
    name: "日报汇总定时任务",
    triggerType: "schedule",
    status: "active",
    lastRunAt: "2026-04-20T08:00:00.000Z",
    nextRunAt: "2026-04-21T08:00:00.000Z",
  },
  {
    id: "automation-2",
    name: "知识库增量同步",
    triggerType: "event",
    status: "paused",
    lastRunAt: "2026-04-19T18:30:00.000Z",
    nextRunAt: undefined,
  },
];

export const mockAuditEvents: AuditEventSummary[] = [
  { id: "audit-1", action: "workflow.run.started", level: "info", happenedAt: "2026-04-20T08:10:00.000Z" },
  { id: "audit-2", action: "approval.requested", level: "warning", happenedAt: "2026-04-20T08:13:00.000Z" },
];

export type ProductApiState = {
  workbench: WorkbenchSummary;
  workflows: WorkflowSummary[];
  workflowDetails: WorkflowDetail[];
  runs: WorkflowRunSummary[];
  runDetails: WorkflowRunDetail[];
  sessions: SessionSummary[];
  sessionDetails: SessionDetail[];
  connections: ChannelConnectionSummary[];
  settings: SettingsDetail;
  knowledgeSources: KnowledgeSourceSummary[];
  automations: AutomationSummary[];
  auditEvents: AuditEventSummary[];
};

export function createMockProductApiState(): ProductApiState {
  return {
    workbench: structuredClone(mockWorkbench),
    workflows: structuredClone(mockWorkflows),
    workflowDetails: structuredClone(mockWorkflowDetails),
    runs: structuredClone(mockRuns),
    runDetails: structuredClone(mockRunDetails),
    sessions: structuredClone(mockSessions),
    sessionDetails: structuredClone(mockSessionDetails),
    connections: structuredClone(mockConnections),
    settings: structuredClone(mockSettings),
    knowledgeSources: structuredClone(mockKnowledgeSources),
    automations: structuredClone(mockAutomations),
    auditEvents: structuredClone(mockAuditEvents),
  };
}
