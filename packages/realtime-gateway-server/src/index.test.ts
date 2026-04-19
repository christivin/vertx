import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket, { WebSocketServer } from "ws";
import {
  loadRealtimeGatewayServerConfig,
  startRealtimeGatewayServer,
  type RealtimeGatewayRuntime,
} from "./index";

type JsonFrame = Record<string, unknown>;

function waitForOpen(socket: WebSocket) {
  return new Promise<void>((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("error", reject);
  });
}

function nextFrame(socket: WebSocket) {
  return new Promise<JsonFrame>((resolve, reject) => {
    const handleMessage = (raw: WebSocket.RawData) => {
      socket.off("error", handleError);
      resolve(JSON.parse(String(raw)) as JsonFrame);
    };
    const handleError = (error: Error) => {
      socket.off("message", handleMessage);
      reject(error);
    };

    socket.once("message", handleMessage);
    socket.once("error", handleError);
  });
}

function waitForClose(socket: WebSocket) {
  return new Promise<number>((resolve, reject) => {
    socket.once("close", (code) => resolve(code));
    socket.once("error", reject);
  });
}

function waitForFailedConnection(socket: WebSocket) {
  return new Promise<"close" | "error">((resolve) => {
    const finish = (outcome: "close" | "error") => {
      socket.off("close", handleClose);
      socket.off("error", handleError);
      if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
        socket.terminate();
      }
      resolve(outcome);
    };
    const handleClose = () => finish("close");
    const handleError = () => finish("error");

    socket.once("close", handleClose);
    socket.once("error", handleError);
  });
}

const runtimes: RealtimeGatewayRuntime[] = [];
const sockets: WebSocket[] = [];
const upstreamServers: WebSocketServer[] = [];

afterEach(async () => {
  await Promise.all(
    sockets.splice(0).map(
      (socket) =>
        new Promise<void>((resolve) => {
          if (
            socket.readyState === WebSocket.CLOSING ||
            socket.readyState === WebSocket.CLOSED
          ) {
            resolve();
            return;
          }
          socket.once("close", () => resolve());
          if (socket.readyState === WebSocket.CONNECTING) {
            socket.terminate();
            return;
          }
          socket.close();
        }),
    ),
  );
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.close()));
  await Promise.all(
    upstreamServers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
    ),
  );
});

describe("loadRealtimeGatewayServerConfig", () => {
  it("parses env vars and normalizes paths", () => {
    const config = loadRealtimeGatewayServerConfig({
      VERTX_WORKSPACE_ID: "workspace-dev",
      VERTX_REALTIME_PORT: "9001",
      VERTX_REALTIME_PATH: "gateway/ws/",
      VERTX_REALTIME_HEALTH_PATH: "health",
      OPENCLAW_GATEWAY_URL: "ws://127.0.0.1:9911",
      OPENCLAW_GATEWAY_SCOPES: "operator.read, operator.write",
      OPENCLAW_GATEWAY_CAPS: "tool-events, approvals",
      OPENCLAW_GATEWAY_AUTO_SUBSCRIBE_SESSIONS: "false",
      OPENCLAW_GATEWAY_REQUEST_TIMEOUT_MS: "15000",
    });

    expect(config).toMatchObject({
      host: "127.0.0.1",
      port: 9001,
      path: "/gateway/ws",
      healthPath: "/health",
      workspaceId: "workspace-dev",
      openclaw: {
        url: "ws://127.0.0.1:9911",
        scopes: ["operator.read", "operator.write"],
        caps: ["tool-events", "approvals"],
        autoSubscribeSessions: false,
        requestTimeoutMs: 15000,
      },
    });
  });

  it("rejects invalid numeric env vars", () => {
    expect(() =>
      loadRealtimeGatewayServerConfig({
        VERTX_WORKSPACE_ID: "workspace-dev",
        OPENCLAW_GATEWAY_URL: "ws://127.0.0.1:9911",
        VERTX_REALTIME_PORT: "abc",
      }),
    ).toThrow("invalid number env VERTX_REALTIME_PORT");
  });
});

describe("startRealtimeGatewayServer", () => {
  it("starts an http-backed realtime gateway with health and path routing", async () => {
    const upstream = new WebSocketServer({ port: 0 });
    upstreamServers.push(upstream);

    upstream.on("connection", (socket) => {
      socket.send(
        JSON.stringify({
          type: "event",
          event: "connect.challenge",
          payload: { nonce: "nonce-1" },
        }),
      );
      socket.on("message", (raw) => {
        const request = JSON.parse(String(raw)) as {
          id?: string;
          method?: string;
        };
        if (request.method === "connect") {
          socket.send(
            JSON.stringify({
              type: "res",
              id: request.id,
              ok: true,
              payload: {
                type: "hello-ok",
                protocol: 3,
                server: { version: "openclaw-test" },
                snapshot: {
                  sessionDefaults: { mainSessionKey: "agent:main:main" },
                },
              },
            }),
          );
          return;
        }
        if (request.method === "sessions.subscribe") {
          socket.send(JSON.stringify({ type: "res", id: request.id, ok: true, payload: { ok: true } }));
        }
      });
    });

    const upstreamAddress = upstream.address();
    if (!upstreamAddress || typeof upstreamAddress === "string") {
      throw new Error("expected an inet upstream websocket address");
    }

    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    const runtime = await startRealtimeGatewayServer(
      {
        host: "127.0.0.1",
        port: 0,
        path: "/gateway/realtime",
        healthPath: "/healthz",
        workspaceId: "workspace-runtime",
        serverVersion: "0.3.0",
        openclaw: {
          url: `ws://127.0.0.1:${upstreamAddress.port}`,
        },
      },
      logger,
    );
    runtimes.push(runtime);

    expect(runtime.url).toContain("/gateway/realtime");
    expect(runtime.healthUrl).toContain("/healthz");

    const healthResponse = await fetch(runtime.healthUrl);
    expect(healthResponse.status).toBe(200);
    await expect(healthResponse.json()).resolves.toMatchObject({
      ok: true,
      workspaceId: "workspace-runtime",
    });

    const socket = new WebSocket(runtime.url);
    sockets.push(socket);
    const helloPromise = nextFrame(socket);
    await waitForOpen(socket);
    const hello = await helloPromise;

    expect(hello).toMatchObject({
      type: "hello",
      server: { version: "0.3.0" },
      snapshot: {
        workspaceId: "workspace-runtime",
        sessionDefaults: { mainSessionKey: "agent:main:main" },
      },
    });

    const wrongPathSocket = new WebSocket(runtime.url.replace("/gateway/realtime", "/wrong-path"));
    sockets.push(wrongPathSocket);
    await expect(waitForFailedConnection(wrongPathSocket)).resolves.toSatisfy((outcome) =>
      ["close", "error"].includes(outcome),
    );

    expect(logger.info).toHaveBeenCalledTimes(2);
  });
});
