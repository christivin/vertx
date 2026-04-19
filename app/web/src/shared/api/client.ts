import type {
  AuditEventSummary,
  ChannelConnectionSummary,
  SessionSummary,
  SettingsDetail,
  WorkbenchSummary,
  WorkflowSummary,
} from "@vertx/api";
import {
  mockAuditEvents,
  mockConnections,
  mockSessions,
  mockSettings,
  mockWorkbench,
  mockWorkflows,
} from "./mock-data";

type ProductApiClientOptions = {
  baseUrl?: string;
  fallbackToMock?: boolean;
  fetchImpl?: typeof fetch;
};

type MockResolver<T> = () => T;

const JSON_HEADERS = {
  Accept: "application/json",
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

  async getSessionSummaries() {
    return await this.read("/api/sessions", () => mockSessions);
  }

  async getChannelConnectionSummaries() {
    return await this.read("/api/channel-connections", () => mockConnections);
  }

  async getSettingsDetail() {
    return await this.read("/api/settings", () => mockSettings);
  }

  async getAuditEventSummaries() {
    return await this.read("/api/audit-events", () => mockAuditEvents);
  }

  private async read<T>(path: string, mockResolver: MockResolver<T>) {
    if (!this.baseUrl) {
      return mockResolver();
    }

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
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
  ChannelConnectionSummary,
  SessionSummary,
  SettingsDetail,
  WorkbenchSummary,
  WorkflowSummary,
};
