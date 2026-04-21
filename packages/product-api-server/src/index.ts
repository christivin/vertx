import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import {
  createInMemoryProductApiRepository,
  type CreateKnowledgeSourceInput,
  createProductApiStore,
  type CreateWorkflowInput,
  type UpdateSettingsInput,
} from "@vertx/domain";
import { createFileProductApiRepository } from "./file-repository";
import { startRealtimeMirrorClient, type RealtimeMirrorClient } from "./realtime-mirror-client";

export type ProductApiServerConfig = {
  host: string;
  port: number;
  basePath: string;
  healthPath: string;
  workspaceId: string;
  serverVersion: string;
  stateFilePath?: string;
  realtimeMirrorUrl?: string;
  realtimeMirrorReconnectDelayMs?: number;
};

export type ProductApiRuntime = {
  config: ProductApiServerConfig;
  httpServer: ReturnType<typeof createHttpServer>;
  url: string;
  healthUrl: string;
  realtimeMirror?: RealtimeMirrorClient;
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
    stateFilePath: env.VERTX_API_STATE_FILE?.trim() || undefined,
    realtimeMirrorUrl: env.VERTX_REALTIME_MIRROR_URL?.trim() || undefined,
    realtimeMirrorReconnectDelayMs: readOptionalNumberEnv(env, "VERTX_REALTIME_MIRROR_RECONNECT_DELAY_MS"),
  };
}

export async function startProductApiServer(
  config: ProductApiServerConfig,
  logger: Logger = console,
): Promise<ProductApiRuntime> {
  const repository = config.stateFilePath
    ? createFileProductApiRepository(config.stateFilePath)
    : createInMemoryProductApiRepository();
  const store = createProductApiStore(repository);
  const realtimeMirror = config.realtimeMirrorUrl
    ? startRealtimeMirrorClient({
        url: config.realtimeMirrorUrl,
        repository,
        reconnectDelayMs: config.realtimeMirrorReconnectDelayMs,
        logger,
      })
    : undefined;

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
        const payload = await readJsonBody<CreateWorkflowInput>(request);
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
        const payload = await readJsonBody<UpdateSettingsInput>(request);
        writeJson(response, 200, store.updateSettings(payload));
        return;
      }

      if (request.method === "GET" && routePath === "/knowledge-sources") {
        writeJson(response, 200, store.listKnowledgeSources());
        return;
      }

      if (request.method === "POST" && routePath === "/knowledge-sources") {
        const payload = await readJsonBody<CreateKnowledgeSourceInput>(request);
        writeJson(response, 201, store.createKnowledgeSource(payload));
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

  try {
    await listen(httpServer, config);
  } catch (error) {
    await realtimeMirror?.close();
    throw error;
  }

  const address = httpServer.address();
  if (!address || typeof address === "string") {
    await realtimeMirror?.close();
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
    realtimeMirror,
    close: async () => {
      await realtimeMirror?.close();
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
