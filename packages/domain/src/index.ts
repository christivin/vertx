import {
  type AutomationSummary,
  createMockProductApiState,
  type AuditEventSummary,
  type ChannelConnectionSummary,
  type KnowledgeSourceSummary,
  type ProductApiState,
  type SessionDetail,
  type SessionSummary,
  type SettingsDetail,
  type WorkflowDetail,
  type WorkflowRunDetail,
  type WorkflowRunSummary,
  type WorkflowSummary,
} from "@vertx/api";

export type Workflow = {
  id: string;
  name: string;
  status: "draft" | "active" | "paused";
};

export type WorkflowRun = {
  id: string;
  workflowId: string;
  status: "queued" | "running" | "completed" | "failed";
};

export type ChannelConnection = {
  id: string;
  channelType: string;
  status: "connected" | "offline" | "pending";
};

export type CreateWorkflowInput = {
  name?: string;
  description?: string;
};

export type UpdateSettingsInput = Partial<SettingsDetail>;

export type CreateKnowledgeSourceInput = {
  name?: string;
  sourceType?: KnowledgeSourceSummary["sourceType"];
};

export type CreateAutomationInput = {
  name?: string;
  triggerType?: AutomationSummary["triggerType"];
};

export type ProductApiStore = ReturnType<typeof createProductApiStore>;

export type ProductApiRepository = {
  getWorkbenchState: () => ProductApiState["workbench"];
  setWorkbenchState: (workbench: ProductApiState["workbench"]) => void;
  listWorkflows: () => WorkflowSummary[];
  listWorkflowDetails: () => WorkflowDetail[];
  getWorkflowSummary: (workflowId: string) => WorkflowSummary | undefined;
  getWorkflowDetail: (workflowId: string) => WorkflowDetail | undefined;
  prependWorkflow: (workflow: WorkflowDetail) => void;
  updateWorkflowLastRunAt: (workflowId: string, lastRunAt: string) => void;
  listRuns: () => WorkflowRunSummary[];
  listRunDetails: () => WorkflowRunDetail[];
  getRunDetail: (runId: string) => WorkflowRunDetail | undefined;
  prependRun: (run: WorkflowRunDetail) => void;
  upsertRun: (run: WorkflowRunDetail) => WorkflowRunDetail;
  listSessions: () => SessionSummary[];
  listSessionDetails: () => SessionDetail[];
  getSessionDetail: (sessionId: string) => SessionDetail | undefined;
  upsertSession: (session: SessionDetail) => SessionDetail;
  listConnections: () => ChannelConnectionSummary[];
  upsertConnection: (connection: ChannelConnectionSummary) => ChannelConnectionSummary;
  getSettings: () => SettingsDetail;
  setSettings: (settings: SettingsDetail) => void;
  listKnowledgeSources: () => KnowledgeSourceSummary[];
  prependKnowledgeSource: (knowledgeSource: KnowledgeSourceSummary) => void;
  listAutomations: () => AutomationSummary[];
  getAutomation: (automationId: string) => AutomationSummary | undefined;
  prependAutomation: (automation: AutomationSummary) => void;
  upsertAutomation: (automation: AutomationSummary) => AutomationSummary;
  listAuditEvents: () => AuditEventSummary[];
  prependAuditEvent: (event: AuditEventSummary) => void;
};

export type ProductApiMirrorEvent = {
  event:
    | "chat"
    | "session.message"
    | "sessions.changed"
    | "run.status"
    | "tool.status"
    | "approval.requested"
    | "approval.resolved";
  payload: unknown;
};

function isoNow() {
  return new Date().toISOString();
}

function buildAuditEvent(id: number, action: string, level: AuditEventSummary["level"] = "info"): AuditEventSummary {
  return {
    id: `audit-${id}`,
    action,
    level,
    happenedAt: isoNow(),
  };
}

export function createInMemoryProductApiRepository(
  initialState: ProductApiState = createMockProductApiState(),
): ProductApiRepository {
  const state = initialState;

  return {
    getWorkbenchState() {
      return state.workbench;
    },
    setWorkbenchState(workbench) {
      state.workbench = workbench;
    },
    listWorkflows() {
      return state.workflows;
    },
    listWorkflowDetails() {
      return state.workflowDetails;
    },
    getWorkflowSummary(workflowId) {
      return state.workflows.find((item) => item.id === workflowId);
    },
    getWorkflowDetail(workflowId) {
      return state.workflowDetails.find((item) => item.id === workflowId);
    },
    prependWorkflow(workflow) {
      state.workflowDetails.unshift(workflow);
      state.workflows.unshift({
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        lastRunAt: workflow.lastRunAt,
      });
    },
    updateWorkflowLastRunAt(workflowId, lastRunAt) {
      const workflowSummary = state.workflows.find((item) => item.id === workflowId);
      if (workflowSummary) {
        workflowSummary.lastRunAt = lastRunAt;
      }
      const workflowDetail = state.workflowDetails.find((item) => item.id === workflowId);
      if (workflowDetail) {
        workflowDetail.lastRunAt = lastRunAt;
      }
    },
    listRuns() {
      return state.runs;
    },
    listRunDetails() {
      return state.runDetails;
    },
    getRunDetail(runId) {
      return state.runDetails.find((item) => item.id === runId);
    },
    prependRun(run) {
      state.runDetails.unshift(run);
      state.runs.unshift({
        id: run.id,
        workflowId: run.workflowId,
        title: run.title,
        status: run.status,
        startedAt: run.startedAt,
      });
    },
    upsertRun(run) {
      const detailIndex = state.runDetails.findIndex((item) => item.id === run.id);
      if (detailIndex >= 0) {
        state.runDetails[detailIndex] = {
          ...state.runDetails[detailIndex],
          ...run,
        };
      } else {
        state.runDetails.unshift(run);
      }

      const summary = {
        id: run.id,
        workflowId: run.workflowId,
        title: run.title,
        status: run.status,
        startedAt: run.startedAt,
      };
      const summaryIndex = state.runs.findIndex((item) => item.id === run.id);
      if (summaryIndex >= 0) {
        state.runs[summaryIndex] = {
          ...state.runs[summaryIndex],
          ...summary,
        };
      } else {
        state.runs.unshift(summary);
      }

      return state.runDetails.find((item) => item.id === run.id) ?? run;
    },
    listSessions() {
      return state.sessions;
    },
    listSessionDetails() {
      return state.sessionDetails;
    },
    getSessionDetail(sessionId) {
      return state.sessionDetails.find((item) => item.id === sessionId);
    },
    upsertSession(session) {
      const detailIndex = state.sessionDetails.findIndex((item) => item.id === session.id);
      if (detailIndex >= 0) {
        state.sessionDetails[detailIndex] = {
          ...state.sessionDetails[detailIndex],
          ...session,
        };
      } else {
        state.sessionDetails.unshift(session);
      }

      const summary = {
        id: session.id,
        title: session.title,
        channelType: session.channelType,
        status: session.status,
        updatedAt: session.updatedAt,
      };
      const summaryIndex = state.sessions.findIndex((item) => item.id === session.id);
      if (summaryIndex >= 0) {
        state.sessions[summaryIndex] = {
          ...state.sessions[summaryIndex],
          ...summary,
        };
      } else {
        state.sessions.unshift(summary);
      }

      return state.sessionDetails.find((item) => item.id === session.id) ?? session;
    },
    listConnections() {
      return state.connections;
    },
    upsertConnection(connection) {
      const existingIndex = state.connections.findIndex((item) => item.id === connection.id);
      if (existingIndex >= 0) {
        state.connections[existingIndex] = connection;
        return connection;
      }
      state.connections.unshift(connection);
      return connection;
    },
    getSettings() {
      return state.settings;
    },
    setSettings(settings) {
      state.settings = settings;
    },
    listKnowledgeSources() {
      return state.knowledgeSources;
    },
    prependKnowledgeSource(knowledgeSource) {
      state.knowledgeSources.unshift(knowledgeSource);
    },
    listAutomations() {
      return state.automations;
    },
    getAutomation(automationId) {
      return state.automations.find((item) => item.id === automationId);
    },
    prependAutomation(automation) {
      state.automations.unshift(automation);
    },
    upsertAutomation(automation) {
      const existingIndex = state.automations.findIndex((item) => item.id === automation.id);
      if (existingIndex >= 0) {
        state.automations[existingIndex] = automation;
        return automation;
      }
      state.automations.unshift(automation);
      return automation;
    },
    listAuditEvents() {
      return state.auditEvents;
    },
    prependAuditEvent(event) {
      state.auditEvents.unshift(event);
    },
  };
}

function computeWorkbenchFromRepository(repository: ProductApiRepository) {
  return {
    ...repository.getWorkbenchState(),
    recentRuns: repository.listRuns().length,
    recentSessions: repository.listSessions().length,
    connectedChannels: repository.listConnections().filter((item) => item.status === "connected").length,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function stringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function numberField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function isoFromValue(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return isoNow();
}

function toRunStatus(value: unknown): WorkflowRunSummary["status"] {
  if (value === "queued") {
    return "queued";
  }
  if (value === "completed" || value === "final") {
    return "completed";
  }
  if (value === "failed" || value === "error" || value === "aborted") {
    return "failed";
  }
  return "running";
}

function sessionIdFromPayload(payload: Record<string, unknown>) {
  return stringField(payload, ["sessionKey", "sessionId", "id", "key"]);
}

function approvalIdFromPayload(payload: Record<string, unknown>) {
  return stringField(payload, ["approvalId", "id", "toolCallId", "requestId"]);
}

function mirrorApprovalRequest(repository: ProductApiRepository, payload: Record<string, unknown>) {
  const workbench = repository.getWorkbenchState();
  const approvalId = approvalIdFromPayload(payload);
  repository.setWorkbenchState({
    ...workbench,
    pendingApprovals: workbench.pendingApprovals + 1,
  });
  repository.prependAuditEvent(
    buildAuditEvent(
      repository.listAuditEvents().length + 1,
      `runtime.approval.requested${approvalId ? `.${approvalId}` : ""}`,
      "warning",
    ),
  );
}

function mirrorApprovalResolved(repository: ProductApiRepository, payload: Record<string, unknown>) {
  const workbench = repository.getWorkbenchState();
  const approvalId = approvalIdFromPayload(payload);
  repository.setWorkbenchState({
    ...workbench,
    pendingApprovals: Math.max(0, workbench.pendingApprovals - 1),
  });
  repository.prependAuditEvent(
    buildAuditEvent(
      repository.listAuditEvents().length + 1,
      `runtime.approval.resolved${approvalId ? `.${approvalId}` : ""}`,
    ),
  );
}

function mirrorRun(
  repository: ProductApiRepository,
  input: {
    runId: string;
    sessionKey?: string;
    status?: unknown;
    title?: string;
    ts?: unknown;
    resultSummary?: string;
  },
) {
  const existing = repository.getRunDetail(input.runId);
  const status = toRunStatus(input.status);
  const startedAt = existing?.startedAt ?? isoFromValue(input.ts);
  const workflowId = existing?.workflowId ?? input.sessionKey ?? "openclaw-runtime";
  const run: WorkflowRunDetail = {
    id: input.runId,
    workflowId,
    title: existing?.title ?? input.title ?? `OpenClaw Run ${input.runId}`,
    status,
    startedAt,
    resultSummary: input.resultSummary ?? existing?.resultSummary ?? `OpenClaw runtime 状态已同步为 ${status}。`,
  };
  repository.upsertRun(run);
  return run;
}

function mirrorSession(
  repository: ProductApiRepository,
  input: {
    sessionId: string;
    title?: string;
    channelType?: string;
    status?: SessionSummary["status"];
    updatedAt?: unknown;
    incrementMessageCount?: boolean;
  },
) {
  const existing = repository.getSessionDetail(input.sessionId);
  const session: SessionDetail = {
    id: input.sessionId,
    title: existing?.title ?? input.title ?? `OpenClaw Session ${input.sessionId}`,
    channelType: existing?.channelType ?? input.channelType ?? "openclaw",
    status: input.status ?? existing?.status ?? "active",
    updatedAt: isoFromValue(input.updatedAt),
    messageCount: (existing?.messageCount ?? 0) + (input.incrementMessageCount ? 1 : 0),
  };
  repository.upsertSession(session);
  return session;
}

export function mirrorRealtimeEventToProductApiRepository(
  repository: ProductApiRepository,
  event: ProductApiMirrorEvent,
) {
  if (!isRecord(event.payload)) {
    return;
  }

  if (event.event === "run.status") {
    const runId = stringField(event.payload, ["runId", "id"]);
    if (!runId) {
      return;
    }
    const run = mirrorRun(repository, {
      runId,
      sessionKey: stringField(event.payload, ["sessionKey", "sessionId"]),
      status: event.payload.status ?? event.payload.phase,
      ts: event.payload.ts,
    });
    repository.prependAuditEvent(buildAuditEvent(repository.listAuditEvents().length + 1, `runtime.run.${run.status}`));
    return;
  }

  if (event.event === "chat") {
    const runId = stringField(event.payload, ["runId"]);
    const sessionId = sessionIdFromPayload(event.payload);
    const state = stringField(event.payload, ["state"]);
    if (runId) {
      mirrorRun(repository, {
        runId,
        sessionKey: sessionId,
        status: state,
        resultSummary: state === "error" ? stringField(event.payload, ["errorMessage"]) : undefined,
      });
    }
    if (sessionId) {
      mirrorSession(repository, {
        sessionId,
        updatedAt: isoNow(),
        incrementMessageCount: Boolean(state && ["final", "error"].includes(state)),
        status: state === "final" || state === "aborted" || state === "error" ? "ended" : "active",
      });
    }
    return;
  }

  if (event.event === "session.message") {
    const sessionId = sessionIdFromPayload(event.payload);
    if (!sessionId) {
      return;
    }
    mirrorSession(repository, {
      sessionId,
      updatedAt: stringField(event.payload, ["updatedAt", "createdAt"]) ?? numberField(event.payload, ["ts"]),
      incrementMessageCount: true,
    });
    return;
  }

  if (event.event === "sessions.changed") {
    const sessionId = sessionIdFromPayload(event.payload);
    if (!sessionId) {
      return;
    }
    mirrorSession(repository, {
      sessionId,
      updatedAt: stringField(event.payload, ["updatedAt"]) ?? numberField(event.payload, ["ts"]),
      status: event.payload.status === "ended" ? "ended" : "active",
    });
    return;
  }

  if (event.event === "tool.status") {
    const runId = stringField(event.payload, ["runId"]);
    if (!runId) {
      return;
    }
    const phase = stringField(event.payload, ["phase"]);
    mirrorRun(repository, {
      runId,
      sessionKey: stringField(event.payload, ["sessionKey", "sessionId"]),
      status: phase === "failed" ? "failed" : phase === "completed" ? "running" : "running",
      title: stringField(event.payload, ["name"]),
      ts: stringField(event.payload, ["startedAt", "updatedAt"]),
      resultSummary: `工具 ${stringField(event.payload, ["name"]) ?? "tool"} 状态：${phase ?? "unknown"}`,
    });
    repository.prependAuditEvent(
      buildAuditEvent(repository.listAuditEvents().length + 1, `runtime.tool.${phase ?? "unknown"}`),
    );
    return;
  }

  if (event.event === "approval.requested") {
    mirrorApprovalRequest(repository, event.payload);
    return;
  }

  if (event.event === "approval.resolved") {
    mirrorApprovalResolved(repository, event.payload);
  }
}

export function createProductApiStore(
  repositoryOrState: ProductApiRepository | ProductApiState = createInMemoryProductApiRepository(),
) {
  const repository =
    "getWorkbenchState" in repositoryOrState
      ? repositoryOrState
      : createInMemoryProductApiRepository(repositoryOrState);
  let workflowCounter = repository.listWorkflows().length + 1;
  let runCounter = repository.listRuns().length + 1;
  let knowledgeCounter = repository.listKnowledgeSources().length + 1;
  let automationCounter = repository.listAutomations().length + 1;
  let auditCounter = repository.listAuditEvents().length + 1;

  const appendAuditEvent = (action: string, level: AuditEventSummary["level"] = "info") => {
    repository.prependAuditEvent(buildAuditEvent(auditCounter++, action, level));
  };

  const createRunFromWorkflow = (workflow: WorkflowDetail, action: string) => {
    const runId = `run-${runCounter++}`;
    const startedAt = isoNow();
    const runSummary = {
      id: runId,
      workflowId: workflow.id,
      title: workflow.name,
      status: "queued" as const,
      startedAt,
    };
    const runDetail: WorkflowRunDetail = {
      ...runSummary,
      resultSummary: "已进入队列，等待 OpenClaw runtime 执行。",
    };
    repository.prependRun(runDetail);
    repository.updateWorkflowLastRunAt(workflow.id, startedAt);
    appendAuditEvent(action);
    return runDetail;
  };

  return {
    getWorkbenchSummary() {
      return computeWorkbenchFromRepository(repository);
    },
    listWorkflows() {
      return repository.listWorkflows();
    },
    getWorkflowDetail(workflowId: string) {
      return repository.getWorkflowDetail(workflowId);
    },
    createWorkflow(input: CreateWorkflowInput) {
      const id = `wf-${workflowCounter++}`;
      const workflow: WorkflowDetail = {
        id,
        name: input.name?.trim() || `未命名流程 ${id}`,
        status: "draft",
        lastRunAt: isoNow(),
        description: input.description?.trim() || "等待补充流程描述。",
      };
      repository.prependWorkflow(workflow);
      appendAuditEvent("workflow.created");
      return workflow;
    },
    startWorkflowRun(workflowId: string) {
      const workflow = repository.getWorkflowDetail(workflowId);
      if (!workflow) {
        return null;
      }
      return createRunFromWorkflow(workflow, "workflow.run.started");
    },
    listRuns() {
      return repository.listRuns();
    },
    getRunDetail(runId: string) {
      return repository.getRunDetail(runId);
    },
    retryRun(runId: string) {
      const runDetail = repository.getRunDetail(runId);
      if (!runDetail) {
        return null;
      }
      const workflow = repository.getWorkflowDetail(runDetail.workflowId);
      if (!workflow) {
        return null;
      }
      return createRunFromWorkflow(workflow, "workflow.run.retried");
    },
    listSessions() {
      return repository.listSessions();
    },
    getSessionDetail(sessionId: string) {
      return repository.getSessionDetail(sessionId);
    },
    listConnections() {
      return repository.listConnections();
    },
    connectFeishu() {
      const existing = repository.listConnections().find((item) => item.channelType === "feishu");
      const lastActiveAt = isoNow();
      let connection: ChannelConnectionSummary;

      if (existing) {
        connection = {
          ...existing,
          status: "connected",
          lastActiveAt,
        };
      } else {
        connection = {
          id: "conn-feishu",
          channelType: "feishu",
          status: "connected",
          lastActiveAt,
        };
      }
      repository.upsertConnection(connection);
      appendAuditEvent("channel_connection.feishu.connected");
      return connection;
    },
    getSettings() {
      return repository.getSettings();
    },
    updateSettings(input: UpdateSettingsInput) {
      const settings = {
        ...repository.getSettings(),
        ...input,
      };
      repository.setSettings(settings);
      appendAuditEvent("settings.updated");
      return settings;
    },
    listKnowledgeSources() {
      return repository.listKnowledgeSources();
    },
    createKnowledgeSource(input: CreateKnowledgeSourceInput) {
      const id = `knowledge-${knowledgeCounter++}`;
      const knowledgeSource: KnowledgeSourceSummary = {
        id,
        name: input.name?.trim() || `未命名知识源 ${id}`,
        sourceType: input.sourceType ?? "web-upload",
        status: "syncing",
        updatedAt: isoNow(),
        documentCount: 0,
      };
      repository.prependKnowledgeSource(knowledgeSource);
      appendAuditEvent("knowledge_source.created");
      return knowledgeSource;
    },
    listAutomations() {
      return repository.listAutomations();
    },
    createAutomation(input: CreateAutomationInput) {
      const id = `automation-${automationCounter++}`;
      const triggerType = input.triggerType ?? "schedule";
      const automation: AutomationSummary = {
        id,
        name: input.name?.trim() || `未命名自动化 ${id}`,
        triggerType,
        status: "active",
        lastRunAt: undefined,
        nextRunAt: triggerType === "manual" ? undefined : isoNow(),
      };
      repository.prependAutomation(automation);
      appendAuditEvent("automation.created");
      return automation;
    },
    toggleAutomation(automationId: string) {
      const automation = repository.getAutomation(automationId);
      if (!automation) {
        return null;
      }
      const nextStatus = automation.status === "active" ? "paused" : "active";
      const nextAutomation: AutomationSummary = {
        ...automation,
        status: nextStatus,
        nextRunAt: nextStatus === "active" && automation.triggerType !== "manual" ? isoNow() : undefined,
      };
      repository.upsertAutomation(nextAutomation);
      appendAuditEvent(`automation.${nextStatus}`);
      return nextAutomation;
    },
    runAutomation(automationId: string) {
      const automation = repository.getAutomation(automationId);
      if (!automation) {
        return null;
      }
      const nextAutomation: AutomationSummary = {
        ...automation,
        lastRunAt: isoNow(),
        nextRunAt: automation.status === "active" && automation.triggerType !== "manual" ? isoNow() : automation.nextRunAt,
      };
      repository.upsertAutomation(nextAutomation);
      appendAuditEvent("automation.run.triggered");
      return nextAutomation;
    },
    listAuditEvents() {
      return repository.listAuditEvents();
    },
  };
}
