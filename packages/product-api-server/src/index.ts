import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import {
  createMockProductApiState,
  type AuditEventSummary,
  type ChannelConnectionSummary,
  type ProductApiState,
  type SessionDetail,
  type SettingsDetail,
  type WorkflowDetail,
  type WorkflowRunDetail,
} from "@vertx/api";

export type ProductApiServerConfig = {
  host: string;
  port: number;
  basePath: string;
  healthPath: string;
  workspaceId: string;
  serverVersion: string;
};

export type ProductApiRuntime = {
  config: ProductApiServerConfig;
  httpServer: ReturnType<typeof createHttpServer>;
  url: string;
  healthUrl: string;
  close: () => Promise<void>;
};

type Logger = Pick<Console, "error" | "info">;

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8788;
const DEFAULT_BASE_PATH = "/api";
const DEFAULT_HEALTH_PATH = "/healthz";
const DEFAULT_SERVER_VERSION = "0.1.0";
const DEFAULT_WORKSPACE_ID = "workspace-dev";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type",
} as const;

function readRequiredEnv(env: NodeJS.ProcessEnv, key: string, fallback?: string) {
  const value = env[key]?.trim() || fallback;
  if (!value) {
    throw new Error(`missing required env: ${key}`);
  }
  return value;
}

function normalizePath(value: string | undefined, fallback: string) {
  const raw = value?.trim() || fallback;
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
  if (prefixed.length > 1 && prefixed.endsWith("/")) {
    return prefixed.slice(0, -1);
  }
  return prefixed;
}

function readOptionalNumberEnv(env: NodeJS.ProcessEnv, key: string) {
  const raw = env[key]?.trim();
  if (!raw) {
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`invalid number env ${key}: ${raw}`);
  }
  return parsed;
}

function httpBaseUrl(host: string, port: number) {
  const normalizedHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  return `http://${normalizedHost}:${port}`;
}

function writeJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    ...CORS_HEADERS,
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody<T>(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {} as T;
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf-8")) as T;
}

async function listen(
  server: ReturnType<typeof createHttpServer>,
  config: Pick<ProductApiServerConfig, "host" | "port">,
) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

async function closeHttpServer(server: ReturnType<typeof createHttpServer>) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

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
    createWorkflow(input: { name?: string; description?: string }) {
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
    updateSettings(input: Partial<SettingsDetail>) {
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

function notFound(response: ServerResponse) {
  writeJson(response, 404, {
    ok: false,
    error: "not_found",
  });
}

export function loadProductApiServerConfig(env: NodeJS.ProcessEnv = process.env): ProductApiServerConfig {
  return {
    host: env.VERTX_API_HOST?.trim() || DEFAULT_HOST,
    port: readOptionalNumberEnv(env, "VERTX_API_PORT") ?? DEFAULT_PORT,
    basePath: normalizePath(env.VERTX_API_BASE_PATH, DEFAULT_BASE_PATH),
    healthPath: normalizePath(env.VERTX_API_HEALTH_PATH, DEFAULT_HEALTH_PATH),
    workspaceId: readRequiredEnv(env, "VERTX_WORKSPACE_ID", DEFAULT_WORKSPACE_ID),
    serverVersion: env.VERTX_API_SERVER_VERSION?.trim() || DEFAULT_SERVER_VERSION,
  };
}

export async function startProductApiServer(
  config: ProductApiServerConfig,
  logger: Logger = console,
): Promise<ProductApiRuntime> {
  const store = createProductApiStore();

  const httpServer = createHttpServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const pathname = url.pathname;

    if (request.method === "OPTIONS") {
      response.writeHead(204, CORS_HEADERS);
      response.end();
      return;
    }

    if (request.method === "GET" && pathname === config.healthPath) {
      writeJson(response, 200, {
        ok: true,
        service: "vertx-product-api",
        workspaceId: config.workspaceId,
        version: config.serverVersion,
      });
      return;
    }

    if (!pathname.startsWith(config.basePath)) {
      notFound(response);
      return;
    }

    const routePath = pathname.slice(config.basePath.length) || "/";

    try {
      if (request.method === "GET" && routePath === "/workbench/summary") {
        writeJson(response, 200, store.getWorkbenchSummary());
        return;
      }

      if (request.method === "GET" && routePath === "/workflows") {
        writeJson(response, 200, store.listWorkflows());
        return;
      }

      if (request.method === "POST" && routePath === "/workflows") {
        const payload = await readJsonBody<{ name?: string; description?: string }>(request);
        writeJson(response, 201, store.createWorkflow(payload));
        return;
      }

      const workflowDetailMatch = routePath.match(/^\/workflows\/([^/]+)$/);
      if (request.method === "GET" && workflowDetailMatch) {
        const workflow = store.getWorkflowDetail(workflowDetailMatch[1] ?? "");
        if (!workflow) {
          notFound(response);
          return;
        }
        writeJson(response, 200, workflow);
        return;
      }

      const workflowRunMatch = routePath.match(/^\/workflows\/([^/]+)\/run$/);
      if (request.method === "POST" && workflowRunMatch) {
        const run = store.startWorkflowRun(workflowRunMatch[1] ?? "");
        if (!run) {
          notFound(response);
          return;
        }
        writeJson(response, 201, run);
        return;
      }

      if (request.method === "GET" && routePath === "/runs") {
        writeJson(response, 200, store.listRuns());
        return;
      }

      const runDetailMatch = routePath.match(/^\/runs\/([^/]+)$/);
      if (request.method === "GET" && runDetailMatch) {
        const run = store.getRunDetail(runDetailMatch[1] ?? "");
        if (!run) {
          notFound(response);
          return;
        }
        writeJson(response, 200, run);
        return;
      }

      const runRetryMatch = routePath.match(/^\/runs\/([^/]+)\/retry$/);
      if (request.method === "POST" && runRetryMatch) {
        const run = store.retryRun(runRetryMatch[1] ?? "");
        if (!run) {
          notFound(response);
          return;
        }
        writeJson(response, 201, run);
        return;
      }

      if (request.method === "GET" && routePath === "/sessions") {
        writeJson(response, 200, store.listSessions());
        return;
      }

      const sessionDetailMatch = routePath.match(/^\/sessions\/([^/]+)$/);
      if (request.method === "GET" && sessionDetailMatch) {
        const session = store.getSessionDetail(sessionDetailMatch[1] ?? "");
        if (!session) {
          notFound(response);
          return;
        }
        writeJson(response, 200, session);
        return;
      }

      if (request.method === "GET" && routePath === "/channel-connections") {
        writeJson(response, 200, store.listConnections());
        return;
      }

      if (request.method === "POST" && routePath === "/channel-connections/feishu/connect") {
        writeJson(response, 200, store.connectFeishu());
        return;
      }

      if (request.method === "GET" && routePath === "/settings") {
        writeJson(response, 200, store.getSettings());
        return;
      }

      if (request.method === "PUT" && routePath === "/settings") {
        const payload = await readJsonBody<Partial<SettingsDetail>>(request);
        writeJson(response, 200, store.updateSettings(payload));
        return;
      }

      if (request.method === "GET" && routePath === "/audit-events") {
        writeJson(response, 200, store.listAuditEvents());
        return;
      }
    } catch (error) {
      writeJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "internal_error",
      });
      return;
    }

    notFound(response);
  });

  await listen(httpServer, config);

  const address = httpServer.address();
  if (!address || typeof address === "string") {
    await closeHttpServer(httpServer);
    throw new Error("product api server did not expose an inet address");
  }

  const url = `${httpBaseUrl(config.host, address.port)}${config.basePath}`;
  const healthUrl = `${httpBaseUrl(config.host, address.port)}${config.healthPath}`;

  logger.info(`[vertx-api] listening on ${url}`);
  logger.info(`[vertx-api] health check on ${healthUrl}`);

  return {
    config: {
      ...config,
      port: address.port,
    },
    httpServer,
    url,
    healthUrl,
    close: async () => {
      await closeHttpServer(httpServer);
    },
  };
}

export async function runProductApiServer(
  env: NodeJS.ProcessEnv = process.env,
  logger: Logger = console,
) {
  const runtime = await startProductApiServer(loadProductApiServerConfig(env), logger);

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) {
      return;
    }
    closing = true;
    logger.info(`[vertx-api] received ${signal}, shutting down...`);
    try {
      await runtime.close();
    } catch (error) {
      logger.error("[vertx-api] shutdown failed", error);
      process.exitCode = 1;
      return;
    }
    logger.info("[vertx-api] shutdown complete");
  };

  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }

  return runtime;
}

const isEntrypoint =
  typeof process.argv[1] === "string" && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntrypoint) {
  void runProductApiServer().catch((error) => {
    console.error("[vertx-api] failed to start", error);
    process.exitCode = 1;
  });
}
