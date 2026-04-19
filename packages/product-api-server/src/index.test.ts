import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket, { WebSocketServer } from "ws";
import {
  loadProductApiServerConfig,
  startProductApiServer,
  type ProductApiRuntime,
} from "./index";

const runtimes: ProductApiRuntime[] = [];
const realtimeServers: WebSocketServer[] = [];

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.close()));
  await Promise.all(
    realtimeServers.splice(0).map(
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

function waitForConnection(server: WebSocketServer) {
  return new Promise<WebSocket>((resolve) => {
    server.once("connection", (socket) => {
      resolve(socket);
    });
  });
}

async function expectEventually<T>(read: () => Promise<T>, assert: (value: T) => void) {
  let lastError: unknown;
  for (let index = 0; index < 20; index += 1) {
    try {
      const value = await read();
      assert(value);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw lastError;
}

describe("loadProductApiServerConfig", () => {
  it("parses env vars and normalizes paths", () => {
    const config = loadProductApiServerConfig({
      VERTX_WORKSPACE_ID: "workspace-api",
      VERTX_API_PORT: "9002",
      VERTX_API_BASE_PATH: "gateway/api/",
      VERTX_API_HEALTH_PATH: "ready",
      VERTX_API_SERVER_VERSION: "0.4.0",
      VERTX_API_STATE_FILE: "/tmp/vertx-state.json",
      VERTX_REALTIME_MIRROR_URL: "ws://127.0.0.1:8787/realtime",
      VERTX_REALTIME_MIRROR_RECONNECT_DELAY_MS: "1500",
    });

    expect(config).toMatchObject({
      host: "127.0.0.1",
      port: 9002,
      basePath: "/gateway/api",
      healthPath: "/ready",
      workspaceId: "workspace-api",
      serverVersion: "0.4.0",
      stateFilePath: "/tmp/vertx-state.json",
      realtimeMirrorUrl: "ws://127.0.0.1:8787/realtime",
      realtimeMirrorReconnectDelayMs: 1500,
    });
  });

  it("rejects invalid numeric env vars", () => {
    expect(() =>
      loadProductApiServerConfig({
        VERTX_API_PORT: "abc",
      }),
    ).toThrow("invalid number env VERTX_API_PORT");
  });
});

describe("startProductApiServer", () => {
  it("serves health and product list endpoints", async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    const runtime = await startProductApiServer(
      {
        host: "127.0.0.1",
        port: 0,
        basePath: "/api",
        healthPath: "/healthz",
        workspaceId: "workspace-api",
        serverVersion: "0.4.0",
      },
      logger,
    );
    runtimes.push(runtime);

    const healthResponse = await fetch(runtime.healthUrl);
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.headers.get("access-control-allow-origin")).toBe("*");
    await expect(healthResponse.json()).resolves.toMatchObject({
      ok: true,
      workspaceId: "workspace-api",
      version: "0.4.0",
    });

    const workflowsResponse = await fetch(`${runtime.url}/workflows`);
    expect(workflowsResponse.status).toBe(200);
    const workflows = (await workflowsResponse.json()) as Array<{ id: string; name: string }>;
    expect(workflows[0]).toMatchObject({ id: "wf-1", name: "飞书日报汇总" });

    expect(logger.info).toHaveBeenCalledTimes(2);
  });

  it("supports workflow creation, run creation, settings update, and feishu connect mutations", async () => {
    const runtime = await startProductApiServer({
      host: "127.0.0.1",
      port: 0,
      basePath: "/api",
      healthPath: "/healthz",
      workspaceId: "workspace-api",
      serverVersion: "0.4.0",
    });
    runtimes.push(runtime);

    const createWorkflowResponse = await fetch(`${runtime.url}/workflows`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "知识巡检",
        description: "检查知识库更新状态",
      }),
    });
    expect(createWorkflowResponse.status).toBe(201);
    const createdWorkflow = (await createWorkflowResponse.json()) as { id: string; name: string };
    expect(createdWorkflow.name).toBe("知识巡检");

    const runResponse = await fetch(`${runtime.url}/workflows/${createdWorkflow.id}/run`, {
      method: "POST",
    });
    expect(runResponse.status).toBe(201);
    await expect(runResponse.json()).resolves.toMatchObject({
      workflowId: createdWorkflow.id,
      status: "queued",
    });

    const settingsResponse = await fetch(`${runtime.url}/settings`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        defaultModel: "gpt-5.4",
      }),
    });
    expect(settingsResponse.status).toBe(200);
    await expect(settingsResponse.json()).resolves.toMatchObject({
      defaultModel: "gpt-5.4",
    });

    const feishuResponse = await fetch(`${runtime.url}/channel-connections/feishu/connect`, {
      method: "POST",
    });
    expect(feishuResponse.status).toBe(200);
    await expect(feishuResponse.json()).resolves.toMatchObject({
      channelType: "feishu",
      status: "connected",
    });

    const workbenchResponse = await fetch(`${runtime.url}/workbench/summary`);
    await expect(workbenchResponse.json()).resolves.toMatchObject({
      connectedChannels: 1,
    });

    const auditResponse = await fetch(`${runtime.url}/audit-events`);
    const auditEvents = (await auditResponse.json()) as Array<{ action: string }>;
    expect(auditEvents[0]?.action).toBe("channel_connection.feishu.connected");
  });

  it("can mirror realtime gateway events into product api state", async () => {
    const realtimeServer = new WebSocketServer({ port: 0 });
    realtimeServers.push(realtimeServer);
    const realtimeAddress = realtimeServer.address();
    if (!realtimeAddress || typeof realtimeAddress === "string") {
      throw new Error("expected an inet realtime websocket address");
    }

    const socketPromise = waitForConnection(realtimeServer);
    const runtime = await startProductApiServer({
      host: "127.0.0.1",
      port: 0,
      basePath: "/api",
      healthPath: "/healthz",
      workspaceId: "workspace-api",
      serverVersion: "0.4.0",
      realtimeMirrorUrl: `ws://127.0.0.1:${realtimeAddress.port}`,
      realtimeMirrorReconnectDelayMs: 25,
    });
    runtimes.push(runtime);

    const realtimeSocket = await socketPromise;
    realtimeSocket.send(
      JSON.stringify({
        type: "event",
        event: "run.status",
        seq: 1,
        payload: {
          runId: "oc-run-live-1",
          sessionKey: "oc-session-live-1",
          status: "completed",
          ts: "2026-04-20T10:00:00.000Z",
        },
      }),
    );
    realtimeSocket.send(
      JSON.stringify({
        type: "event",
        event: "session.message",
        seq: 2,
        payload: {
          sessionKey: "oc-session-live-1",
          updatedAt: "2026-04-20T10:01:00.000Z",
        },
      }),
    );
    realtimeSocket.send(
      JSON.stringify({
        type: "event",
        event: "approval.requested",
        seq: 3,
        payload: {
          approvalId: "approval-live-1",
          title: "允许发送飞书回执",
        },
      }),
    );

    await expectEventually(
      async () => {
        const [runResponse, sessionResponse, workbenchResponse] = await Promise.all([
          fetch(`${runtime.url}/runs/oc-run-live-1`),
          fetch(`${runtime.url}/sessions/oc-session-live-1`),
          fetch(`${runtime.url}/workbench/summary`),
        ]);
        return {
          runStatus: runResponse.status,
          run: runResponse.status === 200 ? await runResponse.json() : null,
          sessionStatus: sessionResponse.status,
          session: sessionResponse.status === 200 ? await sessionResponse.json() : null,
          workbench: await workbenchResponse.json(),
        };
      },
      (value) => {
        expect(value.runStatus).toBe(200);
        expect(value.run).toMatchObject({
          id: "oc-run-live-1",
          status: "completed",
        });
        expect(value.sessionStatus).toBe(200);
        expect(value.session).toMatchObject({
          id: "oc-session-live-1",
          messageCount: 1,
        });
        expect(value.workbench).toMatchObject({
          pendingApprovals: 3,
        });
      },
    );

    realtimeSocket.send(
      JSON.stringify({
        type: "event",
        event: "approval.resolved",
        seq: 4,
        payload: {
          approvalId: "approval-live-1",
          approved: true,
        },
      }),
    );

    await expectEventually(
      async () => {
        const response = await fetch(`${runtime.url}/workbench/summary`);
        return await response.json();
      },
      (workbench) => {
        expect(workbench).toMatchObject({
          pendingApprovals: 2,
        });
      },
    );
  });
});
