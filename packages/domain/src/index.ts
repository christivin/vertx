import {
  createMockProductApiState,
  type AuditEventSummary,
  type ChannelConnectionSummary,
  type ProductApiState,
  type SettingsDetail,
  type WorkflowDetail,
  type WorkflowRunDetail,
  type WorkflowRunSummary,
  type WorkflowSummary,
  type SessionDetail,
  type SessionSummary,
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
  listSessions: () => SessionSummary[];
  listSessionDetails: () => SessionDetail[];
  getSessionDetail: (sessionId: string) => SessionDetail | undefined;
  listConnections: () => ChannelConnectionSummary[];
  upsertConnection: (connection: ChannelConnectionSummary) => ChannelConnectionSummary;
  getSettings: () => SettingsDetail;
  setSettings: (settings: SettingsDetail) => void;
  listAuditEvents: () => AuditEventSummary[];
  prependAuditEvent: (event: AuditEventSummary) => void;
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
    listSessions() {
      return state.sessions;
    },
    listSessionDetails() {
      return state.sessionDetails;
    },
    getSessionDetail(sessionId) {
      return state.sessionDetails.find((item) => item.id === sessionId);
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

export function createProductApiStore(
  repositoryOrState: ProductApiRepository | ProductApiState = createInMemoryProductApiRepository(),
) {
  const repository =
    "getWorkbenchState" in repositoryOrState
      ? repositoryOrState
      : createInMemoryProductApiRepository(repositoryOrState);
  let workflowCounter = repository.listWorkflows().length + 1;
  let runCounter = repository.listRuns().length + 1;
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
    listAuditEvents() {
      return repository.listAuditEvents();
    },
  };
}
