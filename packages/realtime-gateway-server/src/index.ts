import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import {
  createOpenClawBackedRealtimeGatewayServer,
  type OpenClawBackedRealtimeGatewayOptions,
  type RealtimeGatewayServer,
} from "@vertx/realtime-gateway";

export type RealtimeGatewayServerConfig = {
  host: string;
  port: number;
  path: string;
  healthPath: string;
  workspaceId: string;
  serverVersion: string;
  openclaw: OpenClawBackedRealtimeGatewayOptions["openclaw"];
};

export type RealtimeGatewayRuntime = {
  config: RealtimeGatewayServerConfig;
  gateway: RealtimeGatewayServer;
  httpServer: ReturnType<typeof createHttpServer>;
  url: string;
  healthUrl: string;
  close: () => Promise<void>;
};

type Logger = Pick<Console, "error" | "info">;

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;
const DEFAULT_PATH = "/realtime";
const DEFAULT_HEALTH_PATH = "/healthz";
const DEFAULT_SERVER_VERSION = "0.1.0";

function readRequiredEnv(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim();
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

function readOptionalBooleanEnv(env: NodeJS.ProcessEnv, key: string) {
  const raw = env[key]?.trim().toLowerCase();
  if (!raw) {
    return undefined;
  }
  if (["1", "true", "yes", "on"].includes(raw)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(raw)) {
    return false;
  }
  throw new Error(`invalid boolean env ${key}: ${env[key]}`);
}

function readOptionalListEnv(env: NodeJS.ProcessEnv, key: string) {
  const raw = env[key]?.trim();
  if (!raw) {
    return undefined;
  }
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function httpBaseUrl(host: string, port: number) {
  const normalizedHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  return `http://${normalizedHost}:${port}`;
}

function wsBaseUrl(host: string, port: number) {
  const normalizedHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  return `ws://${normalizedHost}:${port}`;
}

function handleHealthRequest(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  config: RealtimeGatewayServerConfig,
) {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (request.method === "GET" && pathname === config.healthPath) {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(
      JSON.stringify({
        ok: true,
        service: "vertx-realtime-gateway",
        workspaceId: config.workspaceId,
      }),
    );
    return;
  }

  response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ ok: false, error: "not_found" }));
}

async function listen(
  server: ReturnType<typeof createHttpServer>,
  config: Pick<RealtimeGatewayServerConfig, "host" | "port">,
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

export function loadRealtimeGatewayServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): RealtimeGatewayServerConfig {
  const host = env.VERTX_REALTIME_HOST?.trim() || DEFAULT_HOST;
  const port = readOptionalNumberEnv(env, "VERTX_REALTIME_PORT") ?? DEFAULT_PORT;
  const path = normalizePath(env.VERTX_REALTIME_PATH, DEFAULT_PATH);
  const healthPath = normalizePath(env.VERTX_REALTIME_HEALTH_PATH, DEFAULT_HEALTH_PATH);
  const workspaceId = readRequiredEnv(env, "VERTX_WORKSPACE_ID");

  return {
    host,
    port,
    path,
    healthPath,
    workspaceId,
    serverVersion: env.VERTX_REALTIME_SERVER_VERSION?.trim() || DEFAULT_SERVER_VERSION,
    openclaw: {
      url: readRequiredEnv(env, "OPENCLAW_GATEWAY_URL"),
      token: env.OPENCLAW_GATEWAY_TOKEN?.trim() || undefined,
      password: env.OPENCLAW_GATEWAY_PASSWORD?.trim() || undefined,
      role: env.OPENCLAW_GATEWAY_ROLE?.trim() || undefined,
      scopes: readOptionalListEnv(env, "OPENCLAW_GATEWAY_SCOPES"),
      caps: readOptionalListEnv(env, "OPENCLAW_GATEWAY_CAPS"),
      protocolVersion: readOptionalNumberEnv(env, "OPENCLAW_GATEWAY_PROTOCOL_VERSION"),
      autoSubscribeSessions: readOptionalBooleanEnv(env, "OPENCLAW_GATEWAY_AUTO_SUBSCRIBE_SESSIONS"),
      reconnectDelayMs: readOptionalNumberEnv(env, "OPENCLAW_GATEWAY_RECONNECT_DELAY_MS"),
      requestTimeoutMs: readOptionalNumberEnv(env, "OPENCLAW_GATEWAY_REQUEST_TIMEOUT_MS"),
      client: {
        id: env.OPENCLAW_GATEWAY_CLIENT_ID?.trim() || undefined,
        displayName: env.OPENCLAW_GATEWAY_CLIENT_NAME?.trim() || undefined,
        version: env.OPENCLAW_GATEWAY_CLIENT_VERSION?.trim() || undefined,
        platform: env.OPENCLAW_GATEWAY_CLIENT_PLATFORM?.trim() || undefined,
        mode: env.OPENCLAW_GATEWAY_CLIENT_MODE?.trim() || undefined,
        instanceId: env.OPENCLAW_GATEWAY_CLIENT_INSTANCE_ID?.trim() || undefined,
      },
    },
  };
}

export async function startRealtimeGatewayServer(
  config: RealtimeGatewayServerConfig,
  logger: Logger = console,
): Promise<RealtimeGatewayRuntime> {
  const httpServer = createHttpServer((request, response) => {
    handleHealthRequest(request, response, config);
  });

  const gateway = createOpenClawBackedRealtimeGatewayServer({
    workspaceId: config.workspaceId,
    serverVersion: config.serverVersion,
    path: config.path,
    server: httpServer,
    openclaw: config.openclaw,
  });

  try {
    await listen(httpServer, config);
  } catch (error) {
    await gateway.close();
    throw error;
  }

  const address = httpServer.address();
  if (!address || typeof address === "string") {
    await gateway.close();
    await closeHttpServer(httpServer);
    throw new Error("realtime gateway server did not expose an inet address");
  }

  const url = `${wsBaseUrl(config.host, address.port)}${config.path}`;
  const healthUrl = `${httpBaseUrl(config.host, address.port)}${config.healthPath}`;

  logger.info(`[vertx-realtime] listening on ${url}`);
  logger.info(`[vertx-realtime] health check on ${healthUrl}`);

  return {
    config: {
      ...config,
      port: address.port,
    },
    gateway,
    httpServer,
    url,
    healthUrl,
    close: async () => {
      await gateway.close();
      await closeHttpServer(httpServer);
    },
  };
}

export async function runRealtimeGatewayServer(
  env: NodeJS.ProcessEnv = process.env,
  logger: Logger = console,
) {
  const runtime = await startRealtimeGatewayServer(loadRealtimeGatewayServerConfig(env), logger);

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) {
      return;
    }
    closing = true;
    logger.info(`[vertx-realtime] received ${signal}, shutting down...`);
    try {
      await runtime.close();
    } catch (error) {
      logger.error("[vertx-realtime] shutdown failed", error);
      process.exitCode = 1;
      return;
    }
    logger.info("[vertx-realtime] shutdown complete");
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
  void runRealtimeGatewayServer().catch((error) => {
    console.error("[vertx-realtime] failed to start", error);
    process.exitCode = 1;
  });
}
