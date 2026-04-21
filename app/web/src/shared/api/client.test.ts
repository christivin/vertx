import { describe, expect, it, vi } from "vitest";
import { ProductApiClient } from "./client";

describe("ProductApiClient", () => {
  it("returns mock data when no base url is configured", async () => {
    const client = new ProductApiClient();

    await expect(client.getWorkbenchSummary()).resolves.toMatchObject({
      pendingApprovals: 2,
      recentRuns: 12,
    });
  });

  it("falls back to mock data when product api fetch fails", async () => {
    const client = new ProductApiClient({
      baseUrl: "https://vertx.example.com",
      fallbackToMock: true,
      fetchImpl: vi.fn().mockRejectedValue(new Error("network down")),
    });

    await expect(client.getSessionSummaries()).resolves.toHaveLength(2);
  });

  it("returns product api data when fetch succeeds", async () => {
    const client = new ProductApiClient({
      baseUrl: "https://vertx.example.com",
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: "wf-api", name: "API 流程", status: "active", lastRunAt: "2026-04-20T09:00:00.000Z" }]), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    });

    await expect(client.getWorkflowSummaries()).resolves.toEqual([
      {
        id: "wf-api",
        name: "API 流程",
        status: "active",
        lastRunAt: "2026-04-20T09:00:00.000Z",
      },
    ]);
  });

  it("supports api base urls that already include the /api prefix", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "wf-1", name: "飞书日报汇总", status: "active", lastRunAt: "2026-04-20T09:00:00.000Z" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const client = new ProductApiClient({
      baseUrl: "https://vertx.example.com/api",
      fetchImpl,
    });

    await client.getWorkflowDetail("wf-1");

    expect(fetchImpl).toHaveBeenCalledWith("https://vertx.example.com/api/workflows/wf-1", {
      headers: {
        Accept: "application/json",
      },
    });
  });

  it("sends mutation requests with json payloads", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "wf-created", name: "新流程", status: "draft", lastRunAt: "2026-04-20T09:30:00.000Z" }), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const client = new ProductApiClient({
      baseUrl: "https://vertx.example.com",
      fetchImpl,
    });

    await expect(client.createWorkflow({ name: "新流程" })).resolves.toMatchObject({
      id: "wf-created",
      name: "新流程",
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://vertx.example.com/api/workflows", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "新流程" }),
    });
  });

  it("falls back to detail and mutation mock data when no base url is configured", async () => {
    const client = new ProductApiClient();

    await expect(client.getWorkflowRunDetail("run-1")).resolves.toMatchObject({
      id: "run-1",
      workflowId: "wf-1",
    });
    await expect(client.connectFeishu()).resolves.toMatchObject({
      channelType: "feishu",
      status: "connected",
    });
  });

  it("supports knowledge source list and creation", async () => {
    const client = new ProductApiClient();

    await expect(client.getKnowledgeSourceSummaries()).resolves.toHaveLength(2);
    await expect(
      client.createKnowledgeSource({
        name: "交付规范文档",
        sourceType: "web-upload",
      }),
    ).resolves.toMatchObject({
      name: "交付规范文档",
      sourceType: "web-upload",
      status: "syncing",
    });
  });
});
