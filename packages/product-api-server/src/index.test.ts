import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadProductApiServerConfig,
  startProductApiServer,
  type ProductApiRuntime,
} from "./index";

const runtimes: ProductApiRuntime[] = [];

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.close()));
});

describe("loadProductApiServerConfig", () => {
  it("parses env vars and normalizes paths", () => {
    const config = loadProductApiServerConfig({
      VERTX_WORKSPACE_ID: "workspace-api",
      VERTX_API_PORT: "9002",
      VERTX_API_BASE_PATH: "gateway/api/",
      VERTX_API_HEALTH_PATH: "ready",
      VERTX_API_SERVER_VERSION: "0.4.0",
      VERTX_API_STATE_FILE: "/tmp/vertx-state.json",
    });

    expect(config).toMatchObject({
      host: "127.0.0.1",
      port: 9002,
      basePath: "/gateway/api",
      healthPath: "/ready",
      workspaceId: "workspace-api",
      serverVersion: "0.4.0",
      stateFilePath: "/tmp/vertx-state.json",
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
});
