import {
  createMockProductApiState,
  type AuditEventSummary,
  type ChannelConnectionSummary,
  type ProductApiState,
  type SettingsDetail,
  type WorkflowDetail,
  type WorkflowRunDetail,
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

function computeWorkbench(state: ProductApiState) {
  return {
    ...state.workbench,
    recentRuns: state.runs.length,
    recentSessions: state.sessions.length,
    connectedChannels: state.connections.filter((item) => item.status === "connected").length,
  };
}

export function createProductApiStore(initialState: ProductApiState = createMockProductApiState()) {
  const state = initialState;
  let workflowCounter = state.workflows.length + 1;
  let runCounter = state.runs.length + 1;
  let auditCounter = state.auditEvents.length + 1;

  const appendAuditEvent = (action: string, level: AuditEventSummary["level"] = "info") => {
    state.auditEvents.unshift(buildAuditEvent(auditCounter++, action, level));
  };

  const findWorkflowDetail = (workflowId: string) => state.workflowDetails.find((item) => item.id === workflowId);
  const findRunDetail = (runId: string) => state.runDetails.find((item) => item.id === runId);
  const findSessionDetail = (sessionId: string) => state.sessionDetails.find((item) => item.id === sessionId);

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
    state.runs.unshift(runSummary);
    state.runDetails.unshift(runDetail);
    const workflowSummary = state.workflows.find((item) => item.id === workflow.id);
    if (workflowSummary) {
      workflowSummary.lastRunAt = startedAt;
    }
    workflow.lastRunAt = startedAt;
    appendAuditEvent(action);
    return runDetail;
  };

  return {
    getWorkbenchSummary() {
      return computeWorkbench(state);
    },
    listWorkflows() {
      return state.workflows;
    },
    getWorkflowDetail(workflowId: string) {
      return findWorkflowDetail(workflowId);
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
      state.workflowDetails.unshift(workflow);
      state.workflows.unshift({
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        lastRunAt: workflow.lastRunAt,
      });
      appendAuditEvent("workflow.created");
      return workflow;
    },
    startWorkflowRun(workflowId: string) {
      const workflow = findWorkflowDetail(workflowId);
      if (!workflow) {
        return null;
      }
      return createRunFromWorkflow(workflow, "workflow.run.started");
    },
    listRuns() {
      return state.runs;
    },
    getRunDetail(runId: string) {
      return findRunDetail(runId);
    },
    retryRun(runId: string) {
      const runDetail = findRunDetail(runId);
      if (!runDetail) {
        return null;
      }
      const workflow = findWorkflowDetail(runDetail.workflowId);
      if (!workflow) {
        return null;
      }
      return createRunFromWorkflow(workflow, "workflow.run.retried");
    },
    listSessions() {
      return state.sessions;
    },
    getSessionDetail(sessionId: string) {
      return findSessionDetail(sessionId);
    },
    listConnections() {
      return state.connections;
    },
    connectFeishu() {
      const existing = state.connections.find((item) => item.channelType === "feishu");
      const lastActiveAt = isoNow();
      let connection: ChannelConnectionSummary;

      if (existing) {
        existing.status = "connected";
        existing.lastActiveAt = lastActiveAt;
        connection = existing;
      } else {
        connection = {
          id: "conn-feishu",
          channelType: "feishu",
          status: "connected",
          lastActiveAt,
        };
        state.connections.unshift(connection);
      }
      appendAuditEvent("channel_connection.feishu.connected");
      return connection;
    },
    getSettings() {
      return state.settings;
    },
    updateSettings(input: UpdateSettingsInput) {
      state.settings = {
        ...state.settings,
        ...input,
      };
      appendAuditEvent("settings.updated");
      return state.settings;
    },
    listAuditEvents() {
      return state.auditEvents;
    },
  };
}
