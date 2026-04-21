import type {
  AuditEventSummary,
  AutomationSummary,
  ChannelConnectionSummary,
  KnowledgeSourceSummary,
  SessionDetail,
  SessionSummary,
  SettingsDetail,
  WorkbenchSummary,
  WorkflowDetail,
  WorkflowRunDetail,
  WorkflowRunSummary,
  WorkflowSummary,
} from "@vertx/api";
import {
  mockAuditEvents,
  mockAutomations,
  mockConnections,
  mockKnowledgeSources,
  mockRunDetails,
  mockRuns,
  mockSessionDetails,
  mockSessions,
  mockSettings,
  mockWorkbench,
  mockWorkflowDetails,
  mockWorkflows,
} from "./mock-data";

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

type ProductApiClientOptions = {
  baseUrl?: string;
  fallbackToMock?: boolean;
  fetchImpl?: typeof fetch;
};

type MockResolver<T> = () => T;

const JSON_HEADERS = {
  Accept: "application/json",
} as const;

const JSON_MUTATION_HEADERS = {
  ...JSON_HEADERS,
  "Content-Type": "application/json",
} as const;

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function trimTrailingSlash(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

async function readJsonResponse<T>(response: Response) {
  if (!response.ok) {
    throw new Error(`product api request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export class ProductApiClient {
  private readonly baseUrl: string | undefined;
  private readonly fallbackToMock: boolean;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ProductApiClientOptions = {}) {
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.fallbackToMock = options.fallbackToMock ?? true;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getWorkbenchSummary() {
    return await this.read("/api/workbench/summary", () => mockWorkbench);
  }

  async getWorkflowSummaries() {
    return await this.read("/api/workflows", () => mockWorkflows);
  }

  async createWorkflow(input: CreateWorkflowInput) {
    return await this.write(
      "/api/workflows",
      {
        method: "POST",
        body: input,
      },
      () => ({
        id: "wf-local",
        name: input.name?.trim() || "未命名流程",
        status: "draft" as const,
        lastRunAt: new Date().toISOString(),
        description: input.description?.trim() || "本地 mock fallback 创建的流程。",
      }),
    );
  }

  async getWorkflowDetail(workflowId: string) {
    return await this.read(`/api/workflows/${encodeURIComponent(workflowId)}`, () => {
      const detail = mockWorkflowDetails.find((item) => item.id === workflowId);
      if (detail) {
        return detail;
      }
      const summary = mockWorkflows.find((item) => item.id === workflowId) ?? mockWorkflows[0];
      return {
        ...summary,
        description: "Product API mock fallback 未找到该流程详情，已返回默认流程。",
      };
    });
  }

  async startWorkflowRun(workflowId: string) {
    return await this.write(
      `/api/workflows/${encodeURIComponent(workflowId)}/run`,
      {
        method: "POST",
      },
      () => ({
        id: "run-local",
        workflowId,
        title: mockWorkflows.find((item) => item.id === workflowId)?.name ?? "本地流程运行",
        status: "queued" as const,
        startedAt: new Date().toISOString(),
        resultSummary: "Product API mock fallback 已创建本地运行。",
      }),
    );
  }

  async getWorkflowRunSummaries() {
    return await this.read("/api/runs", () => mockRuns);
  }

  async getWorkflowRunDetail(runId: string) {
    return await this.read(`/api/runs/${encodeURIComponent(runId)}`, () => {
      const detail = mockRunDetails.find((item) => item.id === runId);
      if (detail) {
        return detail;
      }
      const summary = mockRuns.find((item) => item.id === runId) ?? mockRuns[0];
      return {
        ...summary,
        resultSummary: "Product API mock fallback 未找到该运行详情，已返回默认运行。",
      };
    });
  }

  async retryWorkflowRun(runId: string) {
    return await this.write(
      `/api/runs/${encodeURIComponent(runId)}/retry`,
      {
        method: "POST",
      },
      () => ({
        id: "run-retry-local",
        workflowId: mockRunDetails.find((item) => item.id === runId)?.workflowId ?? "wf-local",
        title: "本地重试运行",
        status: "queued" as const,
        startedAt: new Date().toISOString(),
        resultSummary: "Product API mock fallback 已创建本地重试运行。",
      }),
    );
  }

  async getSessionSummaries() {
    return await this.read("/api/sessions", () => mockSessions);
  }

  async getSessionDetail(sessionId: string) {
    return await this.read(`/api/sessions/${encodeURIComponent(sessionId)}`, () => {
      const detail = mockSessionDetails.find((item) => item.id === sessionId);
      if (detail) {
        return detail;
      }
      const summary = mockSessions.find((item) => item.id === sessionId) ?? mockSessions[0];
      return {
        ...summary,
        messageCount: 0,
      };
    });
  }

  async getChannelConnectionSummaries() {
    return await this.read("/api/channel-connections", () => mockConnections);
  }

  async connectFeishu() {
    return await this.write(
      "/api/channel-connections/feishu/connect",
      {
        method: "POST",
      },
      () => ({
        id: "conn-feishu",
        channelType: "feishu",
        status: "connected" as const,
        lastActiveAt: new Date().toISOString(),
      }),
    );
  }

  async getSettingsDetail() {
    return await this.read("/api/settings", () => mockSettings);
  }

  async updateSettings(input: UpdateSettingsInput) {
    return await this.write(
      "/api/settings",
      {
        method: "PUT",
        body: input,
      },
      () => ({
        ...mockSettings,
        ...input,
      }),
    );
  }

  async getAuditEventSummaries() {
    return await this.read("/api/audit-events", () => mockAuditEvents);
  }

  async getKnowledgeSourceSummaries() {
    return await this.read("/api/knowledge-sources", () => mockKnowledgeSources);
  }

  async createKnowledgeSource(input: CreateKnowledgeSourceInput) {
    return await this.write(
      "/api/knowledge-sources",
      {
        method: "POST",
        body: input,
      },
      () => ({
        id: "knowledge-local",
        name: input.name?.trim() || "未命名知识源",
        sourceType: input.sourceType ?? "web-upload",
        status: "syncing" as const,
        updatedAt: new Date().toISOString(),
        documentCount: 0,
      }),
    );
  }

  async getAutomationSummaries() {
    return await this.read("/api/automations", () => mockAutomations);
  }

  async createAutomation(input: CreateAutomationInput) {
    return await this.write(
      "/api/automations",
      {
        method: "POST",
        body: input,
      },
      () => ({
        id: "automation-local",
        name: input.name?.trim() || "未命名自动化",
        triggerType: input.triggerType ?? "schedule",
        status: "active" as const,
        lastRunAt: undefined,
        nextRunAt: (input.triggerType ?? "schedule") === "manual" ? undefined : new Date().toISOString(),
      }),
    );
  }

  async toggleAutomation(automationId: string) {
    return await this.write(
      `/api/automations/${encodeURIComponent(automationId)}/toggle`,
      {
        method: "POST",
      },
      () => {
        const current = mockAutomations.find((item) => item.id === automationId) ?? mockAutomations[0];
        const nextStatus = current.status === "active" ? "paused" : "active";
        return {
          ...current,
          status: nextStatus,
          nextRunAt: nextStatus === "active" && current.triggerType !== "manual" ? new Date().toISOString() : undefined,
        };
      },
    );
  }

  async runAutomation(automationId: string) {
    return await this.write(
      `/api/automations/${encodeURIComponent(automationId)}/run`,
      {
        method: "POST",
      },
      () => {
        const current = mockAutomations.find((item) => item.id === automationId) ?? mockAutomations[0];
        return {
          ...current,
          lastRunAt: new Date().toISOString(),
        };
      },
    );
  }

  private buildUrl(path: string) {
    if (!this.baseUrl) {
      return path;
    }
    if (this.baseUrl.endsWith("/api") && path.startsWith("/api/")) {
      return `${this.baseUrl}${path.slice("/api".length)}`;
    }
    return `${this.baseUrl}${path}`;
  }

  private async read<T>(path: string, mockResolver: MockResolver<T>) {
    if (!this.baseUrl) {
      return mockResolver();
    }

    try {
      const response = await this.fetchImpl(this.buildUrl(path), {
        headers: JSON_HEADERS,
      });
      return await readJsonResponse<T>(response);
    } catch (error) {
      if (this.fallbackToMock) {
        return mockResolver();
      }
      throw error;
    }
  }

  private async write<T>(
    path: string,
    options: {
      method: "POST" | "PUT";
      body?: unknown;
    },
    mockResolver: MockResolver<T>,
  ) {
    if (!this.baseUrl) {
      return mockResolver();
    }

    try {
      const response = await this.fetchImpl(this.buildUrl(path), {
        method: options.method,
        headers: JSON_MUTATION_HEADERS,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      return await readJsonResponse<T>(response);
    } catch (error) {
      if (this.fallbackToMock) {
        return mockResolver();
      }
      throw error;
    }
  }
}

export function createProductApiClient(options: ProductApiClientOptions = {}) {
  return new ProductApiClient(options);
}

export const productApiClient = createProductApiClient({
  baseUrl: trimTrailingSlash(import.meta.env.VITE_VERTX_API_BASE_URL),
  fallbackToMock: parseBooleanEnv(import.meta.env.VITE_VERTX_API_FALLBACK_TO_MOCK, true),
});

export type {
  AuditEventSummary,
  AutomationSummary,
  ChannelConnectionSummary,
  KnowledgeSourceSummary,
  SessionDetail,
  SessionSummary,
  SettingsDetail,
  WorkbenchSummary,
  WorkflowDetail,
  WorkflowRunDetail,
  WorkflowRunSummary,
  WorkflowSummary,
};
